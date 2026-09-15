"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { ProductDTO } from "@/db/types";
import { formatBDT } from "@/lib/format";
import { useCart } from "@/components/cart/CartProvider";
import { cn } from "@/lib/cn";
import { EASE } from "@/components/motion/Reveal";
import SizeChartModal from "@/components/sizing/SizeChartModal";
import Link from "next/link";

const FINISH_ORDER = ["XS", "S", "M", "L"];

export default function BuyPanel({ product }: { product: ProductDTO }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [size, setSize] = useState(
    product.sizes.includes("M") ? "M" : (product.sizes[0] ?? "M"),
  );
  const [added, setAdded] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  const handleAdd = () => {
    add(product, { qty, size });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: EASE, delay: 0.3 }}
    >
      {/* Price */}
      <div className="mt-6 flex items-baseline gap-3">
        <p className="font-numeric text-3xl font-semibold tracking-tight text-ink">
          {formatBDT(product.price)}
        </p>
        {product.compareAtPrice && (
          <p className="font-numeric text-sm text-taupe line-through">
            {formatBDT(product.compareAtPrice)}
          </p>
        )}
      </div>

      <p className="mt-6 max-w-md text-[15px] leading-relaxed text-taupe">
        {product.description}
      </p>

      {/* Size */}
      <div className="mt-9">
        <div className="flex items-center justify-between">
          <p className="font-serif text-sm text-ink">Size</p>
          <Link
            href="/sizing"
            type="button"
            className="link-sweep text-xs text-taupe hover:text-ink cursor-pointer"
          >
            Size guide
          </Link>
        </div>
        <div className="mt-3 flex gap-2">
          {[...product.sizes].sort(
            (a, b) => FINISH_ORDER.indexOf(a) - FINISH_ORDER.indexOf(b),
          ).map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={cn(
                "h-11 w-11 border text-sm transition-all duration-300",
                size === s
                  ? "border-ink bg-ink text-cream"
                  : "border-line hover:border-ink",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Qty + Add */}
      <div className="mt-8 flex gap-3">
        <div className="hairline flex items-center border">
          <button
            className="px-4 py-3 transition-colors hover:bg-sand"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-8 text-center text-sm">{qty}</span>
          <button
            className="px-4 py-3 transition-colors hover:bg-sand"
            onClick={() => setQty((q) => q + 1)}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <motion.button
          onClick={handleAdd}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "font-serif text-xs uppercase tracking-widest flex-1 py-4 transition-colors duration-300",
            added ? "bg-clay text-cream" : "bg-ink text-cream hover:bg-clay-deep",
          )}
        >
          {added ? "Added to Bag ✦" : `Add to Bag — ${formatBDT(product.price * qty)}`}
        </motion.button>
      </div>

      {/* Assurances */}
      <ul className="hairline mt-10 space-y-3.5 border-t pt-8 text-sm text-taupe">
        {[
          "24 nails in 12 sizes — a custom fit for every finger",
          "Reusable up to 5 wears with gentle removal",
          "HEMA-free, cruelty-free, vegan formula",
          "Ships within 24 hours from Dhaka",
        ].map((t) => (
          <li key={t} className="flex gap-3">
            <span className="text-clay">✦</span>
            {t}
          </li>
        ))}
      </ul>

      <SizeChartModal
        open={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
      />
    </motion.div>
  );
}
