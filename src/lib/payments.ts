import { desc, eq, or } from "drizzle-orm";
import { db, isDbConfigured, schema } from "@/db";
import {
  fromGatewayAmount,
  validateSslczTransaction,
} from "@/lib/sslcommerz";
import { sendSMS, orderConfirmationMessage } from "@/lib/sms";

/**
 * Payment domain service — the single writer for gateway-driven state.
 * Callback routes (success/fail/cancel/ipn) and future retry actions all
 * funnel through here so payment transitions stay consistent + idempotent.
 */

export type PaymentOutcome =
  | "paid"
  | "already-paid"
  | "not-found"
  | "invalid"
  | "amount-mismatch"
  | "currency-mismatch"
  | "marked-failed"
  | "marked-cancelled"
  | "skipped-paid"
  | "error"
  | "validId-notfound"
  | "tranId-notfound";

type Order = typeof schema.orders.$inferSelect;

export async function getOrderByTranId(tranId: string): Promise<Order | null> {
  if (!isDbConfigured || !tranId) return null;
  try {
    const rows = await db
      .select()
      .from(schema.orders)
      .where(
        or(
          eq(schema.orders.transactionId, tranId),
          eq(schema.orders.orderNumber, tranId),
        ),
      )
      .orderBy(desc(schema.orders.id))
      .limit(1);
    return rows[0] ?? null;
  } catch (e) {
    console.error("[payments] order lookup failed:", e);
    return null;
  }
}

/**
 * Confirms a payment using the Order Validation API — the authoritative
 * server-to-server check. The gateway's success POST alone is never trusted.
 * Idempotent: repeat IPN deliveries / user refreshes return "already-paid".
 */
export async function finalizeSslczPayment(
  params: Record<string, string>,
): Promise<PaymentOutcome> {
  const tranId = params.tran_id;
  const valId = params.val_id;
  if (!tranId) return "tranId-notfound";
  if (!valId) return "validId-notfound";

  const order = await getOrderByTranId(tranId);
  if (!order) return "not-found";
  if (order.paymentStatus === "paid") return "already-paid";

  const validation = await validateSslczTransaction(valId);
  if (!validation) {
    console.log('validation error:', valId);
    return "invalid";
  }
  console.log('validation result:', validation);

  const status = validation.status;
  if (status !== "VALID" && status !== "VALIDATED"){
    console.log('validation status error:', status);
    return "invalid";
  }
  if (validation.tran_id !== tranId){
    console.log('validation tranId mismatch:', validation.tran_id, tranId);
    return "invalid";
  }

  const paidAmount =
    fromGatewayAmount(validation.currencyAmount) ??
    fromGatewayAmount(validation.amount);
  if (paidAmount === null || paidAmount !== order.total) {
    return "amount-mismatch";
  }
  if (validation.currency_type !== "BDT") {
    return "currency-mismatch";
  }

  const riskLevel = Number.parseInt(String(validation.risk_level ?? "0"), 10) || 0;

  try {
    await db
      .update(schema.orders)
      .set({
        paymentStatus: "paid",
        transactionId: tranId,
        valId,
        bankTranId: String(validation.bank_tran_id) ?? null,
        riskLevel: Number.isNaN(riskLevel) ? 0 : riskLevel,
        paidAt: new Date( String(validation.tran_date)),
        paymentDetails: { validation, lastCallback: params },
        // Risky payments stay pending for manual review per gateway guidance;
        // clean payments auto-confirm (fulfilment then proceeds as usual).
        status: riskLevel >= 1 ? "pending" : "confirmed",
      })
      .where(eq(schema.orders.id, order.id));
  } catch (e) {
    // Validation succeeded but the write failed — log loudly; the gateway
    // retries the IPN and reconciliation (query API) can still settle it.
    console.error("[payments] failed to mark order paid:", e);
    return "error";
  }

  // Send order confirmation SMS non-blockingly upon confirmed payment
  if (order.phone) {
    console.log("orderConfirmationMessage has been triggered for order:", order.orderNumber);
    sendSMS(order.phone, orderConfirmationMessage(order.orderNumber, order.total)).catch(
      (err) => {
        console.error("[payments] SMS notification failed:", err);
      },
    );
  }

  return "paid";
}

/**
 * Marks a payment failed/cancelled. Never downgrades an already-paid order —
 * a stale fail/cancel POST may arrive after a later successful retry.
 */
export async function markSslczPaymentStatus(
  params: Record<string, string>,
  paymentStatus: "failed" | "cancelled",
): Promise<PaymentOutcome> {
  const tranId = params.tran_id;
  if (!tranId) return "invalid";

  const order = await getOrderByTranId(tranId);
  if (!order) return "not-found";
  if (order.paymentStatus === "paid") return "skipped-paid";

  try {
    await db
      .update(schema.orders)
      .set({
        paymentStatus,
        transactionId: tranId,
        paymentDetails: { lastCallback: params },
      })
      .where(eq(schema.orders.id, order.id));
  } catch (e) {
    console.error("[payments] failed to update payment status:", e);
    return "error";
  }

  return paymentStatus === "failed" ? "marked-failed" : "marked-cancelled";
}

/** Maps raw gateway IPN status values onto payment transitions. */
export function ipnStatusToTransition(status: string | undefined): {
  kind: "finalize" | "failed" | "cancelled" | "ignore";
} {
  switch (status) {
    case "VALID":
      return { kind: "finalize" };
    case "FAILED":
    case "EXPIRED":
    case "UNATTEMPTED":
      return { kind: "failed" };
    case "CANCELLED":
      return { kind: "cancelled" };
    default:
      return { kind: "ignore" };
  }
}

/**
 * Reconciles an order directly with SSLCommerz by querying the gateway for
 * recorded transactions against its orderNumber / transactionId.
 * Used for admin one-click verification or manual sync.
 */
export async function syncOrderPaymentWithSslcz(orderId: number): Promise<{
  ok: boolean;
  status: string;
  message: string;
}> {
  if (!isDbConfigured) {
    return { ok: false, status: "error", message: "Database is not configured" };
  }

  const [order] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId))
    .limit(1);

  if (!order) {
    return { ok: false, status: "error", message: "Order not found" };
  }

  if (order.paymentStatus === "paid") {
    return { ok: true, status: "paid", message: "Order is already marked as paid." };
  }

  const { querySslczTransactions } = await import("@/lib/sslcommerz");
  const lookupKey = order.transactionId || order.orderNumber;
  const txList = await querySslczTransactions(lookupKey);

  if (!txList || txList.length === 0) {
    return {
      ok: false,
      status: order.paymentStatus,
      message: `No transaction records found on SSLCommerz for tran_id "${lookupKey}".`,
    };
  }

  // Find any VALID or VALIDATED transaction
  const validTx = txList.find(
    (t) => t.status === "VALID" || t.status === "VALIDATED",
  );

  const validValId = (validTx?.val_id || validTx?.valId) as string | undefined;

  if (validTx && validValId) {
    const outcome = await finalizeSslczPayment({
      tran_id: lookupKey,
      val_id: String(validValId),
    });

    if (outcome === "paid" || outcome === "already-paid") {
      const bankId = String(validTx.bank_tran_id || validTx.bankTranId || "N/A");
      return {
        ok: true,
        status: "paid",
        message: `Payment verified on SSLCommerz! Bank Tran ID: ${bankId}.`,
      };
    }

    return {
      ok: false,
      status: outcome,
      message: `Validation returned outcome: "${outcome}".`,
    };
  }

  // If not valid, inspect first transaction state
  const latest = txList[0];
  const gatewayStatus = latest?.status || "PENDING";
  if (gatewayStatus === "FAILED" || gatewayStatus === "CANCELLED") {
    await markSslczPaymentStatus(
      { tran_id: lookupKey },
      gatewayStatus === "FAILED" ? "failed" : "cancelled",
    );
    return {
      ok: false,
      status: gatewayStatus.toLowerCase(),
      message: `Gateway reported transaction status as "${gatewayStatus}".`,
    };
  }

  return {
    ok: false,
    status: order.paymentStatus,
    message: `Gateway reported status: "${gatewayStatus}". Payment is not yet completed.`,
  };
}
