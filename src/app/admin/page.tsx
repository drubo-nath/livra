import Link from "next/link";
import { count, desc, eq, sum } from "drizzle-orm";
import { db, schema, isDbConfigured } from "@/db";
import { formatBDT } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { getBalance } from "@/lib/sms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  let ordersCount = 0;
  let revenueTotal = 0;
  let productTotal = 48;
  let recent: (typeof schema.orders.$inferSelect)[] = [];
  let smsBalance: number | null = null;

  if (isDbConfigured) {
    try {
      const [[orders], [revenue], [products], recentList, balance] =
        await Promise.all([
          db.select({ n: count() }).from(schema.orders),
          db
            .select({ total: sum(schema.orders.total) })
            .from(schema.orders)
            .where(eq(schema.orders.status, "fulfilled")),
          db.select({ n: count() }).from(schema.products),
          db
            .select()
            .from(schema.orders)
            .orderBy(desc(schema.orders.createdAt))
            .limit(8),
          getBalance().catch(() => null),
        ]);
      ordersCount = Number(orders?.n ?? 0);
      revenueTotal = Number(revenue?.total ?? 0);
      productTotal = Number(products?.n ?? 0);
      recent = recentList ?? [];
      smsBalance = balance;
    } catch (err) {
      console.warn("[AdminOverview] Database query failed, using safe fallback:", err);
    }
  }

  const stats = [
    { label: "Orders", value: String(ordersCount) },
    { label: "Fulfilled revenue", value: formatBDT(revenueTotal) },
    { label: "Products", value: String(productTotal) },
    {
      label: "SMS Gateway",
      value: smsBalance !== null ? `৳${smsBalance.toFixed(2)}` : "Console (Dev)",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold font-numeric">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent orders</h2>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/orders">View all →</Link>
        </Button>
      </div>

      <div className="mt-4 rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Placed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recent.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium font-numeric">{o.orderNumber}</TableCell>
                <TableCell>
                  {o.customerName}
                  <span className="block text-xs text-muted-foreground font-numeric">
                    {formatPhone(o.phone)}
                  </span>
                </TableCell>
                <TableCell className="font-numeric font-medium">{formatBDT(o.total)}</TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {o.createdAt.toLocaleDateString("en-GB")}
                </TableCell>
              </TableRow>
            ))}
            {recent.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No orders yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
