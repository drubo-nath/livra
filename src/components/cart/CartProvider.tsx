"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ProductDTO } from "@/db/types";
import { trackAddToCart } from "@/lib/analytics";

/**
 * Cart lines carry a product SNAPSHOT (name/price/image) — anonymous carts
 * live client-side by design, and checkout re-verifies every price against
 * the database server-side before creating the order.
 */
export interface CartLine {
  slug: string;
  size: string;
  name: string;
  finish: string;
  price: number;
  tones: [string, string];
  imageUrl: string | null;
  qty: number;
}

interface CartState {
  lines: CartLine[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  add: (product: ProductDTO, opts?: { qty?: number; size?: string }) => void;
  remove: (slug: string, size: string) => void;
  setQty: (slug: string, size: string, qty: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartState | null>(null);
const STORAGE_KEY = "livra-cart-v2";
const LEGACY_STORAGE_KEY = "liora-cart-v2";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect --
     Hydrate the persisted cart once on mount. The two-phase render is
     intentional: it avoids SSR/client markup mismatch for returning
     visitors whose bags already contain items. */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, hydrated]);

  // Lock scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const add = useCallback(
    (product: ProductDTO, opts?: { qty?: number; size?: string }) => {
      if (product.inStock === false || product.stock === 0) {
        return;
      }
      const qty = opts?.qty ?? 1;
      const size = opts?.size ?? "M";
      trackAddToCart({
        slug: product.slug,
        name: product.name,
        price: product.price,
      });
      setLines((prev) => {
        const i = prev.findIndex((l) => l.slug === product.slug && l.size === size);
        if (i >= 0) {
          const next = [...prev];
          next[i] = { ...next[i], qty: next[i].qty + qty };
          return next;
        }
        return [
          ...prev,
          {
            slug: product.slug,
            size,
            name: product.name,
            finish: product.finish,
            price: product.price,
            tones: product.tones,
            imageUrl: product.imageUrl,
            qty,
          },
        ];
      });
      setIsOpen(true);
    },
    [],
  );

  const remove = useCallback((slug: string, size: string) => {
    setLines((prev) => prev.filter((l) => !(l.slug === slug && l.size === size)));
  }, []);

  const setQty = useCallback((slug: string, size: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => !(l.slug === slug && l.size === size))
        : prev.map((l) => (l.slug === slug && l.size === size ? { ...l, qty } : l)),
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const { count, subtotal } = useMemo(() => {
    let count = 0;
    let subtotal = 0;
    for (const l of lines) {
      count += l.qty;
      subtotal += l.price * l.qty;
    }
    return { count, subtotal };
  }, [lines]);

  const value = useMemo(
    () => ({
      lines,
      count,
      subtotal,
      isOpen,
      openCart,
      closeCart,
      add,
      remove,
      setQty,
      clear,
    }),
    [lines, count, subtotal, isOpen, openCart, closeCart, add, remove, setQty, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
