import { desc, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatBDT } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import OrderStatusSelector from "@/components/admin/OrderStatusSelector";
import SyncPaymentButton from "@/components/admin/SyncPaymentButton";

export const dynamic = "force-dynamic";

export default async function AdminOrders() {
  let orders: (typeof schema.orders.$inferSelect)[] = [];
  let items: (typeof schema.orderItems.$inferSelect)[] = [];

  const { isDbConfigured } = await import("@/db");
  if (isDbConfigured) {
    try {
      orders = await db
        .select()
        .from(schema.orders)
        .orderBy(desc(schema.orders.createdAt))
        .limit(100);

      items = orders.length
        ? await db
            .select()
            .from(schema.orderItems)
            .where(inArray(schema.orderItems.orderId, orders.map((o) => o.id)))
        : [];
    } catch (err) {
      console.warn("[AdminOrders] Database query failed, using empty fallback:", err);
    }
  }

  const byOrder = new Map<number, typeof items>();
  for (const it of items) {
    const list = byOrder.get(it.orderId) ?? [];
    list.push(it);
    byOrder.set(it.orderId, list);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>

      <div className="mt-6 space-y-4">
        {orders.map((o) => (
          <Card key={o.id}>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <CardTitle className="flex flex-wrap items-center gap-x-4 gap-y-1 text-base">
                <span className="font-numeric font-medium">{o.orderNumber}</span>
                <span className="text-sm font-normal text-muted-foreground font-numeric">
                  {formatPhone(o.phone)}
                </span>
                <span className="text-sm font-normal text-muted-foreground font-numeric">
                  {formatBDT(o.total)}
                </span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    o.paymentStatus === "paid"
                      ? "default"
                      : o.paymentStatus === "failed" || o.paymentStatus === "cancelled"
                        ? "destructive"
                        : "outline"
                  }
                  className={
                    o.paymentStatus === "paid"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : ""
                  }
                >
                  Payment: {o.paymentStatus}
                </Badge>
                <Badge
                  variant={
                    o.status === "fulfilled"
                      ? "default"
                      : o.status === "cancelled"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {o.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="text-sm">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Delivery
                </p>
                <p className="mt-2">
                  {o.customerName} · <span className="font-numeric">{formatPhone(o.phone)}</span>
                  {o.email && (
                    <span className="block text-xs text-muted-foreground">
                      {o.email}
                    </span>
                  )}
                  <span className="mt-1 block">
                    {o.addressLine}, {o.city} {o.postalCode ?? ""}
                  </span>
                </p>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p className="capitalize">
                    Channel: {o.paymentMethod}
                  </p>
                  {o.transactionId && (
                    <p className="font-mono text-[11px]">
                      Tran ID: {o.transactionId}
                    </p>
                  )}
                  {o.bankTranId && (
                    <p className="font-mono text-[11px]">
                      Bank Tran: {o.bankTranId}
                    </p>
                  )}
                  {o.paidAt && (
                    <p className="text-[11px] text-emerald-700 font-medium">
                      Paid: {new Date(o.paidAt).toLocaleString("en-BD")}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-sm">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Items
                </p>
                <ul className="mt-2 space-y-1">
                  {(byOrder.get(o.id) ?? []).map((it) => (
                    <li key={it.id} className="flex justify-between gap-4">
                      <span>
                        {it.productName}{" "}
                        <span className="text-xs text-muted-foreground">
                          · {it.finish} · {it.size} × <span className="font-numeric">{it.qty}</span>
                        </span>
                      </span>
                      <span className="font-numeric font-medium">{formatBDT(it.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 flex justify-between text-xs text-muted-foreground">
                  <span>
                    Subtotal <span className="font-numeric">{formatBDT(o.subtotal)}</span>
                  </span>
                  <span>
                    Delivery{" "}
                    <span className="font-numeric">
                      {o.shippingFee === 0 ? "Free" : formatBDT(o.shippingFee)}
                    </span>
                  </span>
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <OrderStatusSelector
                orderId={o.id}
                orderNumber={o.orderNumber}
                currentStatus={o.status}
              />
              <SyncPaymentButton
                orderId={o.id}
                orderNumber={o.orderNumber}
                paymentStatus={o.paymentStatus}
              />
            </CardFooter>
          </Card>
        ))}
        {orders.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No orders yet.
          </p>
        )}
      </div>
      <Separator className="mt-8" />
    </div>
  );
}
