import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { db, schema, isDbConfigured } from "@/db";
import { formatBDT } from "@/lib/format";
import ProfileForm from "@/components/profile/ProfileForm";
import SignOutButton from "@/components/profile/SignOutButton";
import { Package, Clock, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "My Account — LIVRA",
  description: "View your personal profile details and recent orders.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSessionUser();
  if (!session?.user) {
    redirect("/login?next=/profile");
  }

  const userId = session.user.id;
  const userPhone = session.user.phoneNumber;

  // Fetch customer's orders
  let ordersList: (typeof schema.orders.$inferSelect)[] = [];
  const orderItemsMap = new Map<number, (typeof schema.orderItems.$inferSelect)[]>();

  if (isDbConfigured) {
    try {
      ordersList = await db
        .select()
        .from(schema.orders)
        .where(
          userPhone
            ? inArray(schema.orders.phone, [userPhone])
            : eq(schema.orders.userId, userId)
        )
        .orderBy(desc(schema.orders.createdAt))
        .limit(20);

      if (ordersList.length > 0) {
        const orderIds = ordersList.map((o) => o.id);
        const items = await db
          .select()
          .from(schema.orderItems)
          .where(inArray(schema.orderItems.orderId, orderIds));

        for (const item of items) {
          const list = orderItemsMap.get(item.orderId) ?? [];
          list.push(item);
          orderItemsMap.set(item.orderId, list);
        }
      }
    } catch (err) {
      console.warn("[ProfilePage] Could not fetch orders:", err);
    }
  }

  return (
    <div className="min-h-[75vh] w-full bg-[#fbf9f5] py-12 sm:py-16 md:py-20 text-ink">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line/60 pb-6 sm:pb-8">
          <div>
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-taupe">
              Customer Atelier
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-ink mt-1">
              My Profile
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <SignOutButton />
          </div>
        </div>

        {/* ── Main Layout: Profile Info & Order History ── */}
        <div className="mt-8 sm:mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 items-start">
          {/* ── Left Column: Personal Information ── */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-line/70 bg-white p-6 sm:p-8 shadow-xs">
              <h2 className="font-serif text-xl sm:text-2xl font-normal text-ink mb-1">
                Personal Information
              </h2>
              <p className="text-xs text-taupe mb-6">
                Your account details are used during checkout.
              </p>
              <ProfileForm user={session.user} />
            </div>
          </div>

          {/* ── Right Column: Order History ── */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-2xl border border-line/70 bg-white p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-serif text-xl sm:text-2xl font-normal text-ink">
                    Order History
                  </h2>
                  <p className="text-xs text-taupe mt-0.5">
                    Recent orders placed with your account.
                  </p>
                </div>
                <span className="font-numeric text-xs font-medium text-taupe">
                  {ordersList.length} {ordersList.length === 1 ? "order" : "orders"}
                </span>
              </div>

              {ordersList.length > 0 ? (
                <div className="divide-y divide-line/60">
                  {ordersList.map((order) => {
                    const items = orderItemsMap.get(order.id) ?? [];
                    return (
                      <div key={order.id} className="py-5 first:pt-0 last:pb-0 space-y-3">
                        {/* Order Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="font-mono text-xs font-semibold tracking-wider text-ink">
                              {order.orderNumber}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-taupe">
                              <Clock className="h-3 w-3" />
                              <span>{order.createdAt.toLocaleDateString("en-GB")}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                                order.status === "fulfilled"
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  : order.status === "cancelled"
                                  ? "bg-red-50 text-red-800 border border-red-200"
                                  : order.status === "confirmed"
                                  ? "bg-blue-50 text-blue-800 border border-blue-200"
                                  : "bg-amber-50 text-amber-800 border border-amber-200"
                              }`}
                            >
                              {order.status}
                            </span>
                            <span className="font-numeric text-sm font-semibold text-ink">
                              {formatBDT(order.total)}
                            </span>
                          </div>
                        </div>

                        {/* Order Items */}
                        {items.length > 0 && (
                          <div className="bg-neutral-50/80 rounded-lg p-3 space-y-1.5 text-xs text-ink/90">
                            {items.map((it) => (
                              <div key={it.id} className="flex justify-between items-center">
                                <span className="line-clamp-1">
                                  {it.productName} · {it.finish} · Size {it.size} × {it.qty}
                                </span>
                                <span className="font-numeric font-medium text-taupe shrink-0 ml-3">
                                  {formatBDT(it.lineTotal)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Delivery Destination */}
                        <div className="text-[11px] text-taupe">
                          Delivering to: {order.customerName} ({order.phone}) · {order.addressLine}, {order.city}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Empty Order History */
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-sand/40 text-taupe mb-3">
                    <Package className="h-6 w-6 stroke-[1.5]" />
                  </div>
                  <p className="font-serif text-lg text-ink font-normal">
                    No orders placed yet
                  </p>
                  <p className="text-xs text-taupe max-w-sm mt-1">
                    Discover handcrafted salon press-on sets tailored to your style.
                  </p>
                  <Link
                    href="/shop"
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-white transition-colors hover:bg-clay"
                  >
                    <span>Browse Collection</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

