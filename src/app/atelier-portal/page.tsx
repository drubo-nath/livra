import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Atelier Portal — LIVRA",
  robots: { index: false, follow: false },
};

export default async function AtelierPortalPage() {
  const session = await getSessionUser();
  if (session && session.user.role === "admin") {
    redirect("/admin");
  }

  return (
    <div className="flex min-h-screen w-full flex-col justify-center bg-[#0c0b0a] px-4 py-12 text-white antialiased selection:bg-white selection:text-black">
      <div className="mx-auto w-full max-w-md">
        {/* Luxury Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-neutral-900/80 shadow-inner">
            <ShieldCheck className="h-6 w-6 text-neutral-300 stroke-[1.5]" />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-normal tracking-[0.2em] uppercase text-white">
            LIVRA
          </h1>
          <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400 font-mono">
            Atelier Management Portal
          </p>
        </div>

        {/* Card */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-neutral-950/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <AdminLoginForm />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-xs tracking-wider text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            ← Return to storefront
          </Link>
        </div>
      </div>
    </div>
  );
}

