"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { X, ChevronRight, Globe } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function MobileMenu({
  open,
  onClose,
  onOpenSizeGuide,
}: {
  open: boolean;
  onClose: () => void;
  onOpenSizeGuide?: () => void;
}) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  const menuSections: { label: string; href: string; onClick?: () => void }[] = [
    { label: "New In", href: "/shop?badge=New" },
    { label: "Exclusive Collection", href: "/shop?finish=Exclusive" },
    { label: "Classic (Single Colours)", href: "/shop?finish=Classic" },
    { label: "Signature Sets", href: "/shop?finish=Signature" },
    { label: "Shop All Nails", href: "/shop" },
    { label: "Tools & Accessories", href: "/tools-accessories" },
    { label: "Wishlist", href: "/wishlist" },
    {
      label: "Size Guide",
      href: "/sizing",
    },
    ...(session
      ? [
          { label: "My Profile", href: "/profile" },
          ...(session.user.role === "admin"
            ? [{ label: "Admin Portal", href: "/admin" }]
            : []),
        ]
      : [{ label: "Sign In", href: "/login" }]),
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex flex-col bg-white overflow-hidden text-ink"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          {/* ── Top Header Bar (Centered Logo + Square Boxed Close Button) ── */}
          <div className="relative flex h-16 items-center justify-center border-b border-neutral-200 px-5 bg-white">
            <span className="font-serif text-xl sm:text-2xl tracking-[0.28em] font-medium text-ink uppercase">
              LIVRA
            </span>

            {/* Square Boxed Close Button (Exact match from Versace reference) */}
            <button
              onClick={onClose}
              className="absolute right-4 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center border border-ink text-ink hover:bg-ink hover:text-white transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <X className="h-4 w-4 stroke-[1.75]" />
            </button>
          </div>

          {/* ── Scrollable Body Area ── */}
          <div className="flex-1 overflow-y-auto">
            {/* Nav Menu Items with Chevrons */}
            <nav className="divide-y divide-neutral-100">
              {menuSections.map((item, idx) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 + 0.05, duration: 0.3 }}
                >
                  {item.onClick ? (
                    <button
                      onClick={item.onClick}
                      className="group flex w-full items-center justify-between px-5 py-4 text-left font-serif text-base text-ink hover:text-clay transition-colors cursor-pointer"
                    >
                      <span>{item.label}</span>
                      <ChevronRight className="h-4 w-4 stroke-[1.5] text-neutral-400 group-hover:text-ink transition-colors" />
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className="group flex w-full items-center justify-between px-5 py-4 text-left font-serif text-base text-ink hover:text-clay transition-colors"
                    >
                      <span>{item.label}</span>
                      <ChevronRight className="h-4 w-4 stroke-[1.5] text-neutral-400 group-hover:text-ink transition-colors" />
                    </Link>
                  )}
                </motion.div>
              ))}
            </nav>

          </div>

          {/* ── Footer Bar (Matching Versace reference) ── */}
          <div className="bg-[#faf9f7] border-t border-neutral-200 py-4 px-6 space-y-3 shrink-0">
            {/* 3 Links with Vertical Dividers */}
            <div className="flex items-center justify-center gap-4 text-xs font-serif text-neutral-700">
              {!isPending && session ? (
                <button
                  onClick={async () => {
                    await authClient.signOut();
                    onClose();
                    router.refresh();
                  }}
                  className="underline underline-offset-4 hover:text-ink cursor-pointer"
                >
                  Sign-Out
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={onClose}
                  className="underline underline-offset-4 hover:text-ink"
                >
                  Sign-In
                </Link>
              )}

              <span className="text-neutral-300 select-none">|</span>

              {onOpenSizeGuide ? (
                <button
                  type="button"
                  onClick={onOpenSizeGuide}
                  className="underline underline-offset-4 hover:text-ink cursor-pointer"
                >
                  Care &amp; Sizing
                </button>
              ) : (
                <Link
                  href="/sizing"
                  onClick={onClose}
                  className="underline underline-offset-4 hover:text-ink"
                >
                  Care &amp; Sizing
                </Link>
              )}

              <span className="text-neutral-300 select-none">|</span>

              <Link
                href="/contact"
                onClick={onClose}
                className="underline underline-offset-4 hover:text-ink"
              >
                Contact Us
              </Link>
            </div>

            {/* Country & Language Selector Indicator */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-500 font-serif">
              <Globe className="h-3.5 w-3.5 stroke-[1.5]" />
              <span>Bangladesh | en</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
