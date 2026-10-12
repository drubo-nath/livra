"use server";

import { eq, inArray } from "drizzle-orm";
import { db, isDbConfigured, schema } from "@/db";
import { checkoutSchema, type CheckoutInput } from "@/lib/validations";
import { shippingFeeFor } from "@/lib/format";
import { getSessionUser } from "@/lib/auth";
import { sendSMS, orderConfirmationMessage } from "@/lib/sms";

import { createSslczSession } from "@/lib/sslcommerz";

export type OrderResult =
  | { ok: true; orderNumber: string; total: number; gatewayPageUrl?: string }
  | { ok: false; error: string };

/**
 * Places an order. Prices are ALWAYS re-read from the database server-side —
 * client-supplied totals are never trusted. Requires a phone-verified session.
 */
export async function placeOrder(input: CheckoutInput): Promise<OrderResult> {
  if (!isDbConfigured) {
    return {
      ok: false,
      error: "Database is not configured yet. Add DATABASE_URL to .env.local.",
    };
  }

  const session = await getSessionUser();
  if (!session?.user.phoneNumberVerified) {
    return {
      ok: false,
      error: "Verify your phone number to place the order.",
    };
  }
  const userId = session.user.id;
  const sessionPhone = session.user.phoneNumber;

  if (!sessionPhone) {
    return {
      ok: false,
      error:
        "Your account has no phone number on file. Please sign in with a verified phone number.",
    };
  }

  let orderPhone = sessionPhone;

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid order details.",
    };
  }
  const data = parsed.data;

  // If alternate delivery phone is specified and differs from account phone, verify OTP token
  if (data.recipientPhone && data.recipientPhone !== session.user.phoneNumber) {
    const { normalizeBDPhone } = await import("@/lib/phone");
    const { verifyOrderPhoneToken } = await import("@/lib/actions/phone-verify");

    const normalizedRecipient = normalizeBDPhone(data.recipientPhone);
    if (!normalizedRecipient) {
      return { ok: false, error: "Invalid delivery mobile number." };
    }

    const isTokenValid = await verifyOrderPhoneToken(
      normalizedRecipient,
      data.phoneVerificationToken ?? "",
    );

    if (!isTokenValid) {
      return {
        ok: false,
        error: "Please verify the delivery mobile number via OTP before confirming your order.",
      };
    }

    orderPhone = normalizedRecipient;
  }

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Load authoritative product rows
      const slugs = data.items.map((i) => i.slug);
      const rows = await tx
        .select()
        .from(schema.products)
        .where(inArray(schema.products.slug, slugs));
      const bySlug = new Map(rows.map((r) => [r.slug, r]));

      // 2. Validate + compute totals from DB prices
      let subtotal = 0;
      const lines: (typeof schema.orderItems.$inferInsert)[] = [];
      for (const item of data.items) {
        const p = bySlug.get(item.slug);
        if (!p || !p.isActive) {
          throw new Error(`"${item.slug}" is no longer available.`);
        }
        // Admin-configured sizes are authoritative at order time.
        const validSizes = p.sizes?.length ? p.sizes : ["XS", "S", "M", "L"];
        if (!validSizes.includes(item.size)) {
          throw new Error(`Size ${item.size} is not available for "${p.name}".`);
        }
        const lineTotal = p.price * item.qty;
        subtotal += lineTotal;
        lines.push({
          orderId: 0, // filled after order insert
          productId: p.id,
          productName: p.name,
          finish: p.finish,
          size: item.size,
          qty: item.qty,
          unitPrice: p.price,
          lineTotal,
        });
      }

      const shippingFee = shippingFeeFor(subtotal);
      const total = subtotal + shippingFee;

      // 3. Find-or-create customer (identity = order phone)
      const existing = await tx
        .select()
        .from(schema.customers)
        .where(inArray(schema.customers.phone, [orderPhone]))
        .limit(1);
      let customerId = existing[0]?.id;
      if (!customerId) {
        const inserted = await tx
          .insert(schema.customers)
          .values({
            name: data.name,
            phone: orderPhone,
            email: data.email || null,
          })
          .returning({ id: schema.customers.id });
        customerId = inserted[0].id;
      }

      // 4. Create order with a non-sequential public number
      const orderNumber = `LIO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const [order] = await tx
        .insert(schema.orders)
        .values({
          orderNumber,
          userId,
          customerId,
          customerName: data.name,
          phone: orderPhone,
          email: data.email || null,
          addressLine: data.address,
          city: data.city,
          postalCode: data.postalCode || null,
          paymentMethod: data.paymentMethod,
          subtotal,
          shippingFee,
          total,
        })
        .returning({ id: schema.orders.id });

      // 5. Attach items
      await tx
        .insert(schema.orderItems)
        .values(lines.map((l) => ({ ...l, orderId: order.id })));

      return {
        ok: true as const,
        orderId: order.id,
        orderNumber,
        total,
        customerName: data.name,
        customerEmail: data.email || `${orderPhone.replace(/\D/g, "")}@customer.livra.bd`,
        customerAddress: data.address,
        customerCity: data.city,
        customerPostalCode: data.postalCode || undefined,
        firstProductName: lines[0]?.productName || "Livra Press-on Nails",
      };
    });

    // Initiate SSLCommerz payment gateway session
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL;

    const sslSession = await createSslczSession({
      tranId: result.orderNumber,
      totalAmount: result.total,
      currency: "BDT",
      successUrl: `${appUrl}/api/payment/success`,
      failUrl: `${appUrl}/api/payment/fail`,
      cancelUrl: `${appUrl}/api/payment/cancel`,
      ipnUrl: `${appUrl}/api/payment/ipn`,
      cusName: result.customerName,
      cusEmail: result.customerEmail,
      cusAdd1: result.customerAddress,
      cusCity: result.customerCity,
      cusPostcode: result.customerPostalCode,
      cusPhone: orderPhone,
      productName: result.firstProductName,
      productCategory: "Press-on Nails",
      productProfile: "physical-goods",
      valueA: result.orderNumber,
    });

    if (!sslSession.ok) {
      console.error(
        "[orders] SSLCommerz session initiation failed for order:",
        result.orderNumber,
        sslSession.error,
      );
      return {
        ok: false,
        error: "Unable to initiate secure payment with SSLCommerz. Please try again.",
      };
    }

    // Save gateway transaction details onto order record
    try {
      await db
        .update(schema.orders)
        .set({
          transactionId: result.orderNumber,
          paymentDetails: { sessionKey: sslSession.sessionKey },
        })
        .where(eq(schema.orders.id, result.orderId));
    } catch (err) {
      console.warn("[orders] failed to store sessionKey onto order:", err);
    }

    return {
      ok: true as const,
      orderNumber: result.orderNumber,
      total: result.total,
      gatewayPageUrl: sslSession.gatewayPageUrl,
    };
  } catch (e) {
    console.error("[orders] placeOrder failed:", e);

    // Only surface known business-logic errors to the client.
    // DB / network / infra errors must never be shown raw.
    const msg = e instanceof Error ? e.message : "";
    const isSafe =
      msg.includes("is no longer available") ||
      msg.includes("is not available for");
    return {
      ok: false,
      error: isSafe
        ? msg
        : "Something went wrong while placing your order. Please try again or contact us on WhatsApp.",
    };
  }
}
