"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCart } from "./CartProvider";
import { formatBDT } from "@/lib/format";
import Swatch from "@/components/Swatch";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function CartDrawer() {
  const { isOpen, closeCart, lines, setQty, remove, subtotal, clear } = useCart();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="scrim"
            className="fixed inset-0 z-[70] bg-ink/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            onClick={closeCart}
          />
          <motion.aside
            key="drawer"
            className="fixed inset-y-0 right-0 z-[80] flex w-full max-w-md flex-col bg-cream shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.55, ease: EASE }}
            role="dialog"
            aria-label="Shopping bag"
          >
            <header className="hairline flex items-center justify-between border-b px-6 py-5">
              <p className="font-serif text-base text-ink">Your Bag</p>
              <button
                onClick={closeCart}
                className="link-sweep text-xs uppercase tracking-widest text-ink"
                aria-label="Close bag"
              >
                Close
              </button>
            </header>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
                <p className="headline text-3xl">
                  Your bag is <em>empty</em>
                </p>
                <p className="max-w-56 text-sm leading-relaxed text-taupe">
                  Salon-perfect nails are one press away.
                </p>
                <Link
                  href="/shop"
                  onClick={closeCart}
                  className="font-serif text-xs uppercase tracking-widest mt-2 border border-ink px-8 py-4 transition-colors duration-300 hover:bg-ink hover:text-cream"
                >
                  Shop Shades
                </Link>
              </div>
            ) : (
              <>
                <ul className="flex-1 divide-y divide-line overflow-y-auto px-6">
                  <AnimatePresence initial={false}>
                    {lines.map((line) => (
                      <motion.li
                        key={`${line.slug}-${line.size}`}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 24 }}
                        transition={{ duration: 0.4, ease: EASE }}
                        className="flex gap-4 py-5"
                      >
                        <Link
                          href={`/product/${line.slug}`}
                          onClick={closeCart}
                          className="shrink-0"
                        >
                          <Swatch
                            tones={line.tones}
                            imageUrl={line.imageUrl}
                            className="h-24 w-20"
                            variant="thumb"
                          />
                        </Link>
                        <div className="flex flex-1 flex-col">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-serif text-lg leading-tight">{line.name}</p>
                              <p className="mt-0.5 text-xs text-taupe">
                                {line.finish} · Size {line.size}
                              </p>
                            </div>
                            <p className="text-sm">{formatBDT(line.price * line.qty)}</p>
                          </div>
                          <div className="mt-auto flex items-center justify-between pt-3">
                            <div className="hairline flex items-center border">
                              <button
                                className="px-3 py-1.5 text-sm transition-colors hover:bg-sand"
                                onClick={() => setQty(line.slug, line.size, line.qty - 1)}
                                aria-label="Decrease quantity"
                              >
                                −
                              </button>
                              <span className="w-7 text-center text-sm">{line.qty}</span>
                              <button
                                className="px-3 py-1.5 text-sm transition-colors hover:bg-sand"
                                onClick={() => setQty(line.slug, line.size, line.qty + 1)}
                                aria-label="Increase quantity"
                              >
                                +
                              </button>
                            </div>
                            <button
                              onClick={() => remove(line.slug, line.size)}
                              className="link-sweep text-xs text-taupe"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>

                <footer className="hairline border-t px-6 py-5">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs uppercase tracking-widest text-taupe font-medium">Subtotal</p>
                    <p className="font-numeric font-semibold text-xl text-ink">{formatBDT(subtotal)}</p>
                  </div>
                  <p className="mb-5 text-xs text-taupe">
                    Free delivery over ৳2,500 · Cash on delivery available
                  </p>
                  <Link
                    href="/checkout"
                    onClick={closeCart}
                    className="font-serif text-xs uppercase tracking-widest block bg-ink py-4 text-center text-cream transition-colors duration-300 hover:bg-clay-deep"
                  >
                    Checkout
                  </Link>
                  <button
                    onClick={clear}
                    className="mt-3 w-full text-center text-xs text-taupe underline-offset-2 hover:underline"
                  >
                    Clear bag
                  </button>
                </footer>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
