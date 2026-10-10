import { desc, eq, or } from "drizzle-orm";
import { db, isDbConfigured, schema } from "@/db";
import {
  fromGatewayAmount,
  validateSslczTransaction,
} from "@/lib/sslcommerz";

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
  | "skipped-paid";

type Order = typeof schema.orders.$inferSelect;

export async function getOrderByTranId(tranId: string): Promise<Order | null> {
  if (!isDbConfigured || !tranId) return null;
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
  if (!tranId || !valId) return "invalid";

  const order = await getOrderByTranId(tranId);
  if (!order) return "not-found";
  if (order.paymentStatus === "paid") return "already-paid";

  const validation = await validateSslczTransaction(valId);
  if (!validation) return "invalid";

  const status = validation.status;
  if (status !== "VALID" && status !== "VALIDATED") return "invalid";
  if (validation.tranId !== tranId) return "invalid";

  const paidAmount =
    fromGatewayAmount(validation.currencyAmount) ??
    fromGatewayAmount(validation.amount);
  if (paidAmount === null || paidAmount !== order.total) {
    return "amount-mismatch";
  }
  if (validation.currencyType !== "BDT" || validation.currency !== "BDT") {
    return "currency-mismatch";
  }

  const riskLevel = Number.parseInt(validation.riskLevel ?? "0", 10) || 0;

  await db
    .update(schema.orders)
    .set({
      paymentStatus: "paid",
      transactionId: tranId,
      valId,
      bankTranId: validation.bankTranId ?? null,
      riskLevel: Number.isNaN(riskLevel) ? 0 : riskLevel,
      paidAt: new Date(),
      paymentDetails: { validation, lastCallback: params },
      // Risky payments stay pending for manual review per gateway guidance;
      // clean payments auto-confirm (fulfilment then proceeds as usual).
      status: riskLevel >= 1 ? "pending" : "confirmed",
    })
    .where(eq(schema.orders.id, order.id));

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

  await db
    .update(schema.orders)
    .set({
      paymentStatus,
      transactionId: tranId,
      paymentDetails: { lastCallback: params },
    })
    .where(eq(schema.orders.id, order.id));

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
