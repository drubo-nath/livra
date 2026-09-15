"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useCart } from "@/components/cart/CartProvider";
import { useWishlist } from "@/lib/hooks/useWishlist";
import { cn } from "@/lib/cn";
import MobileMenu from "./MobileMenu";
import Image from "next/image";
import SizeChartModal from "@/components/sizing/SizeChartModal";
import { Menu, Heart, User, ShoppingBag } from "lucide-react";

function subscribeScroll(callback: () => void) {
  window.addEventListener("scroll", callback, { passive: true });
  return () => window.removeEventListener("scroll", callback);
}

function getScrollSnapshot() {
  return window.scrollY > 20;
}

function getScrollServerSnapshot() {
  return false;
}

export default function Header() {
  const { count, openCart } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { data: session, isPending } = authClient.useSession();
  const scrolled = useSyncExternalStore(
    subscribeScroll,
    getScrollSnapshot,
    getScrollServerSnapshot
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [sizeModalOpen, setSizeModalOpen] = useState(false);
  const pathname = usePathname();

  const isHome = pathname === "/";
  const isAdmin = session?.user.role === "admin";
  const isTransparent = isHome && !scrolled;

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-[50] w-full transition-colors duration-500",
          isHome && "-mb-14 md:-mb-16",
          isTransparent ? "text-white" : "text-ink"
        )}
      >
        {/* Layer 1: Subtle dark gradient overlay for contrast over hero slides when at top */}
        {isHome && (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-transparent transition-opacity duration-500 ease-out",
              isTransparent ? "opacity-100" : "opacity-0"
            )}
            aria-hidden="true"
          />
        )}

        {/* Layer 2: Solid luxury bone backdrop blur for scrolled / non-home state */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 border-b border-line/60 bg-bone/95 backdrop-blur-md shadow-xs transition-opacity duration-500 ease-out",
            isTransparent ? "opacity-0" : "opacity-100"
          )}
          aria-hidden="true"
        />

        <div className="relative mx-auto grid max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6 md:px-10 h-14 md:h-16">
          {/* Left Column — Navigation (Desktop) & Menu Icon (Mobile) */}
          <div className="flex items-center justify-start">
            <button
              className={cn(
                "flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full md:hidden transition-all duration-300 focus:outline-none active:scale-90",
                isTransparent
                  ? "text-white hover:bg-white/10"
                  : "text-ink hover:bg-ink/5 hover:text-clay"
              )}
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" strokeWidth={1.75} />
            </button>

            {/* Desktop Nav (Baskervville font-serif) */}
            <nav className="hidden items-center gap-7 lg:gap-8 md:flex">
              <Link
                href="/shop"
                className={cn(
                  "link-sweep font-serif text-[15px] tracking-wide font-normal transition-colors duration-500",
                  isTransparent
                    ? "text-white/95 hover:text-white"
                    : "text-ink hover:text-clay"
                )}
              >
                Shop
              </Link>
              <Link
                href="/tools-accessories"
                className={cn(
                  "link-sweep font-serif text-[15px] tracking-wide font-normal transition-colors duration-500",
                  isTransparent
                    ? "text-white/95 hover:text-white"
                    : "text-ink hover:text-clay"
                )}
              >
                Tools
              </Link>
              <Link
                href="/sizing"
                className={cn(
                  "link-sweep font-serif text-[15px] tracking-wide font-normal transition-colors duration-500",
                  isTransparent
                    ? "text-white/95 hover:text-white"
                    : "text-ink hover:text-clay"
                )}
              >
                Size Guide
              </Link>
      
              {!isPending && isAdmin && (
                <Link
                  href="/admin"
                  className="link-sweep font-serif text-[15px] tracking-wide text-clay font-medium"
                >
                  Admin
                </Link>
              )}
            </nav>
          </div>

          {/* Center — Livra Brand Logo (Smooth Cross-Fade) */}
          <Link
            href="/"
            className="relative justify-self-center flex items-center justify-center h-7.5 sm:h-8 md:h-9.5 w-[110px] sm:w-[130px] md:w-[150px] transition-transform duration-200 active:scale-95 py-0.5"
            aria-label="Livra home"
          >
            {/* White Logo with soft drop shadow for transparent hero state */}
            <Image
              src="/livra_transparent.svg"
              alt="Livra"
              width={180}
              height={79}
              priority
              className={cn(
                "pointer-events-none absolute inset-0 h-full w-auto mx-auto object-contain brightness-0 invert drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] transition-opacity duration-500 ease-out",
                isTransparent ? "opacity-100" : "opacity-0"
              )}
            />
            {/* Dark Logo for solid scrolled state */}
            <Image
              src="/livra.svg"
              alt="Livra"
              width={180}
              height={79}
              priority
              className={cn(
                "pointer-events-none absolute inset-0 h-full w-auto mx-auto object-contain transition-opacity duration-500 ease-out",
                isTransparent ? "opacity-0" : "opacity-100"
              )}
            />
          </Link>

          {/* Right — Actions: [Wishlist Heart] [Account/Sign-in (Desktop only)] [Shopping Bag] */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 md:gap-3">
            {/* Wishlist Icon */}
            <Link
              href="/wishlist"
              className={cn(
                "relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-all duration-300 active:scale-90",
                isTransparent
                  ? "text-white hover:bg-white/10"
                  : "text-ink hover:bg-ink/5 hover:text-clay"
              )}
              aria-label={wishlistCount > 0 ? `Wishlist, ${wishlistCount} items` : "Wishlist"}
              title="Wishlist"
            >
              <Heart className="h-[19px] w-[19px] sm:h-5 sm:w-5" strokeWidth={1.5} />
              {wishlistCount > 0 && (
                <span
                  suppressHydrationWarning
                  className={cn(
                    "absolute top-0.5 right-0.5 grid h-4 min-w-[16px] px-1 place-items-center rounded-full text-[9px] font-medium leading-none tracking-normal transition-colors duration-300",
                    isTransparent ? "bg-white text-ink font-semibold" : "bg-ink text-cream"
                  )}
                >
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Sign In / Account Icon — hidden on phone screens (< md), shown on desktop */}
            {!isPending && (
              session ? (
                <div className="relative group hidden md:block">
                  {isAdmin ? (
                    <Link
                      href="/admin"
                      className={cn(
                        "relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 active:scale-90",
                        isTransparent
                          ? "text-white hover:bg-white/10"
                          : "text-ink hover:bg-ink/5 hover:text-clay"
                      )}
                      aria-label="Admin Dashboard"
                      title="Admin Dashboard"
                    >
                      <User className="h-5 w-5" strokeWidth={1.5} />
                      <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-clay ring-1 ring-white" />
                    </Link>
                  ) : (
                    <Link
                      href="/profile"
                      className={cn(
                        "relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 active:scale-90 cursor-pointer",
                        isTransparent
                          ? "text-white hover:bg-white/10"
                          : "text-ink hover:bg-ink/5 hover:text-clay"
                      )}
                      aria-label="My Account"
                      title={`Signed in as ${session.user.name || session.user.phoneNumber}`}
                    >
                      <User className="h-5 w-5" strokeWidth={1.5} />
                      <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-1 ring-white" />
                    </Link>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className={cn(
                    "hidden md:flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 active:scale-90",
                    isTransparent
                      ? "text-white hover:bg-white/10"
                      : "text-ink hover:bg-ink/5 hover:text-clay"
                  )}
                  aria-label="Sign In"
                  title="Sign In"
                >
                  <User className="h-5 w-5" strokeWidth={1.5} />
                </Link>
              )
            )}

            {/* Bag / Cart Icon */}
            <button
              type="button"
              onClick={openCart}
              className={cn(
                "relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-all duration-300 active:scale-90 cursor-pointer",
                isTransparent
                  ? "text-white hover:bg-white/10"
                  : "text-ink hover:bg-ink/5 hover:text-clay"
              )}
              aria-label={`Open bag, ${count} items`}
              title="Shopping Bag"
            >
              <ShoppingBag className="h-[19px] w-[19px] sm:h-5 sm:w-5" strokeWidth={1.5} />
              {count > 0 && (
                <span
                  className={cn(
                    "absolute top-0.5 right-0.5 grid h-4 min-w-[16px] px-1 place-items-center rounded-full text-[9px] font-medium leading-none tracking-normal transition-colors duration-300",
                    isTransparent ? "bg-white text-ink font-semibold" : "bg-ink text-cream"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenSizeGuide={() => {
          setMenuOpen(false);
          setSizeModalOpen(true);
        }}
      />

      <SizeChartModal
        open={sizeModalOpen}
        onClose={() => setSizeModalOpen(false)}
      />
    </>
  );
}
