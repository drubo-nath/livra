"use server";

import { inArray } from "drizzle-orm";
import { db, isDbConfigured, schema } from "@/db";
import { checkoutSchema, type CheckoutInput } from "@/lib/validations";
import { shippingFeeFor } from "@/lib/format";
import { getSessionUser } from "@/lib/auth";
import { sendSMS, orderConfirmationMessage } from "@/lib/sms";

export type OrderResult =
  | { ok: true; orderNumber: string; total: number }
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
  let orderPhone = session.user.phoneNumber!;

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

      return { ok: true as const, orderNumber, total };
    });

    // Send order confirmation SMS non-blockingly to the recipient phone
    sendSMS(orderPhone, orderConfirmationMessage(result.orderNumber, result.total)).catch(
      (err) => {
        console.error("[orders] SMS notification failed:", err);
      },
    );

    return result;
  } catch (e) {
    console.error("[orders] placeOrder failed:", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not place the order.",
    };
  }
}
