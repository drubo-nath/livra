import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AdminToastProvider } from "@/components/admin/AdminToast";

import { adminLogoutAction } from "@/lib/actions/admin-auth";

export const metadata: Metadata = {
  title: "Admin — LIVRA",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/tools", label: "Tools & Accessories" },
  { href: "/admin/orders", label: "Orders" },
];

export default async function AdminLayout({
  children,
}: LayoutProps<"/admin">) {
  const session = await getSessionUser();
  if (!session || session.user.role !== "admin") {
    redirect("/atelier-portal?next=/admin");
  }

  return (
    <AdminToastProvider>
      <div className="admin-root min-h-[calc(100vh-4rem)]">
      <div className="mx-auto flex w-full max-w-6xl gap-8 px-4 py-10 md:px-8">
        <aside className="hidden w-52 shrink-0 md:block">
          <div className="sticky top-10 space-y-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                LIVRA Admin
              </p>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {session.user.email || session.user.phoneNumber || "Administrator"}
              </p>
            </div>
            <Separator />
            <nav className="flex flex-col gap-1">
              {NAV.map((l) => (
                <Button
                  key={l.href}
                  asChild
                  variant="ghost"
                  className="justify-start"
                >
                  <Link href={l.href}>{l.label}</Link>
                </Button>
              ))}
            </nav>
            <Separator />
            <div className="space-y-2">
              <Button asChild variant="outline" className="w-full">
                <Link href="/">← Back to store</Link>
              </Button>
              <form action={adminLogoutAction}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                >
                  Sign Out
                </Button>
              </form>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-6 flex items-center justify-between gap-2 md:hidden">
            <nav className="flex gap-2" aria-label="Admin">
              {NAV.map((l) => (
                <Button key={l.href} asChild size="sm" variant="outline">
                  <Link href={l.href}>{l.label}</Link>
                </Button>
              ))}
            </nav>
            <form action={adminLogoutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-red-500"
              >
                Sign Out
              </Button>
            </form>
          </div>
          {children}
        </main>
      </div>
      <Badge variant="outline" className="sr-only">
        admin
      </Badge>
    </div>
    </AdminToastProvider>
  );
}
