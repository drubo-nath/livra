"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import {
  SlidersHorizontal,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Minus,
  Plus,
} from "lucide-react";
import type { ProductDTO, Finish } from "@/db/types";
import { finishes, finishDisplayLabels, normalizeFinish } from "@/db/types";
import { NAIL_SHAPES, normalizeShape } from "@/lib/shapes";
import {
  FILTER_COLORS,
  FILTER_LENGTHS,
  resolveProductColor,
  resolveProductLength,
  type FilterColor,
  type FilterLength,
} from "@/lib/filter-resolvers";
import ProductCard from "@/components/ProductCard";
import { cn } from "@/lib/cn";
import { EASE } from "@/components/motion/Reveal";

type Sort = "featured" | "low" | "high";

export default function ShopClient({ products }: { products: ProductDTO[] }) {
  const params = useSearchParams();

  // Multi-select filter states
  const [selectedFinishes, setSelectedFinishes] = useState<Finish[]>(() => {
    const init = normalizeFinish(params.get("finish"));
    return init ? [init] : [];
  });
  const [selectedShapes, setSelectedShapes] = useState<string[]>(() => {
    const init = normalizeShape(params.get("shape"));
    return init ? [init] : [];
  });
  const [selectedColors, setSelectedColors] = useState<FilterColor[]>([]);
  const [selectedLengths, setSelectedLengths] = useState<FilterLength[]>([]);

  const [sort, setSort] = useState<Sort>("featured");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Accordion open/collapse states matching Image 1
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    color: true,
    length: true,
    shape: true,
    collection: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Sync with search parameters if user navigates
  useEffect(() => {
    const urlShape = normalizeShape(params.get("shape"));
    if (urlShape && !selectedShapes.includes(urlShape)) {
      setSelectedShapes([urlShape]);
    }
    const urlFinish = normalizeFinish(params.get("finish"));
    if (urlFinish && !selectedFinishes.includes(urlFinish)) {
      setSelectedFinishes([urlFinish]);
    }
  }, [params]);

  // Lock background scroll when filter drawer is open
  useEffect(() => {
    if (isFilterDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFilterDrawerOpen]);

  // Enrich products with resolved attributes
  const enrichedProducts = useMemo(() => {
    return products.map((p) => ({
      ...p,
      resolvedColor: resolveProductColor(p),
      resolvedLength: resolveProductLength(p),
      resolvedShape: normalizeShape(p.shape) ?? p.shape,
      resolvedFinish: normalizeFinish(p.finish) ?? p.finish,
    }));
  }, [products]);

  // Live counts per attribute
  const counts = useMemo(() => {
    const colorMap: Record<string, number> = {};
    for (const c of FILTER_COLORS) colorMap[c] = 0;

    const lengthMap: Record<string, number> = {};
    for (const l of FILTER_LENGTHS) lengthMap[l] = 0;

    const shapeMap: Record<string, number> = {};
    for (const s of NAIL_SHAPES) shapeMap[s.name] = 0;

    const finishMap: Record<string, number> = {
      Exclusive: 0,
      Classic: 0,
      Signature: 0,
    };

    for (const p of enrichedProducts) {
      if (colorMap[p.resolvedColor] !== undefined) colorMap[p.resolvedColor]++;
      if (lengthMap[p.resolvedLength] !== undefined) lengthMap[p.resolvedLength]++;
      if (shapeMap[p.resolvedShape] !== undefined) shapeMap[p.resolvedShape]++;
      if (finishMap[p.resolvedFinish] !== undefined) finishMap[p.resolvedFinish]++;
    }

    return { colors: colorMap, lengths: lengthMap, shapes: shapeMap, finishes: finishMap };
  }, [enrichedProducts]);

  // Filter & Sort
  const visible = useMemo(() => {
    const list = enrichedProducts.filter((p) => {
      if (selectedFinishes.length > 0 && !selectedFinishes.includes(p.resolvedFinish as Finish)) {
        return false;
      }
      if (selectedShapes.length > 0 && !selectedShapes.includes(p.resolvedShape)) {
        return false;
      }
      if (selectedColors.length > 0 && !selectedColors.includes(p.resolvedColor)) {
        return false;
      }
      if (selectedLengths.length > 0 && !selectedLengths.includes(p.resolvedLength)) {
        return false;
      }
      return true;
    });

    if (sort === "low") list.sort((a, b) => a.price - b.price);
    if (sort === "high") list.sort((a, b) => b.price - a.price);
    return list;
  }, [enrichedProducts, selectedFinishes, selectedShapes, selectedColors, selectedLengths, sort]);

  const ITEMS_PER_PAGE = 12;
  const [page, setPage] = useState<number>(1);

  // Toggle helpers
  const toggleFinish = (f: Finish) => {
    setSelectedFinishes((prev) =>
      prev.includes(f) ? prev.filter((item) => item !== f) : [...prev, f],
    );
    setPage(1);
  };

  const selectSingleFinish = (f: Finish | null) => {
    setSelectedFinishes(f ? [f] : []);
    setPage(1);
  };

  const toggleShape = (s: string) => {
    setSelectedShapes((prev) =>
      prev.includes(s) ? prev.filter((item) => item !== s) : [...prev, s],
    );
    setPage(1);
  };

  const toggleColor = (c: FilterColor) => {
    setSelectedColors((prev) =>
      prev.includes(c) ? prev.filter((item) => item !== c) : [...prev, c],
    );
    setPage(1);
  };

  const toggleLength = (l: FilterLength) => {
    setSelectedLengths((prev) =>
      prev.includes(l) ? prev.filter((item) => item !== l) : [...prev, l],
    );
    setPage(1);
  };

  const resetFilters = () => {
    setSelectedFinishes([]);
    setSelectedShapes([]);
    setSelectedColors([]);
    setSelectedLengths([]);
    setSort("featured");
    setPage(1);
  };

  const activeFilterCount =
    selectedFinishes.length +
    selectedShapes.length +
    selectedColors.length +
    selectedLengths.length +
    (sort !== "featured" ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  // Pagination
  const totalPages = Math.ceil(visible.length / ITEMS_PER_PAGE);
  const currentPage = Math.min(page, Math.max(1, totalPages));

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return visible.slice(start, start + ITEMS_PER_PAGE);
  }, [visible, currentPage]);

  const paginationItems = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, "...", totalPages];
    }
    if (currentPage >= totalPages - 2) {
      return [1, "...", totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  }, [currentPage, totalPages]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    setPage(newPage);
    const topEl = document.getElementById("products-grid-top");
    if (topEl) {
      topEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section className="mx-auto max-w-[1440px] px-5 pb-24 pt-10 md:px-10 md:pt-16">
      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.08 }}
        className="headline mt-4 text-5xl md:text-8xl"
      >
        All <em>shades</em>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.12 }}
        className="mt-3 text-sm md:text-base text-taupe max-w-[600px]"
      >
        Discover our curated collection of luxury press-on nails, meticulously crafted for
        elegance and style.
      </motion.p>

      {/* ── Eye-Soothing Sticky Toolbar (Mobile-Optimized & Desktop Luxury) ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
        className="hairline sticky top-14 md:top-16 z-30 mt-6 sm:mt-8 md:mt-10 border-y bg-bone/95 py-2.5 sm:py-3 md:py-3.5 backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
      >
        <div className="flex items-center justify-between gap-2">
          {/* Left: Breadcrumbs (gracefully truncated on mobile) */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 sm:gap-2 text-xs text-taupe font-normal min-w-0 max-w-[45%] sm:max-w-[40%] lg:max-w-none">
            <Link href="/" className="hover:text-ink transition-colors shrink-0">
              Home
            </Link>
            <span className="text-line select-none shrink-0">/</span>
            <button
              type="button"
              onClick={resetFilters}
              className="hover:text-ink transition-colors cursor-pointer truncate"
            >
              Collections
            </button>
            {selectedFinishes.length === 1 ? (
              <>
                <span className="text-line select-none shrink-0">/</span>
                <span className="text-ink font-medium truncate">
                  {finishDisplayLabels[selectedFinishes[0]]}
                </span>
              </>
            ) : selectedShapes.length === 1 ? (
              <>
                <span className="text-line select-none shrink-0">/</span>
                <span className="text-ink font-medium truncate">{selectedShapes[0]} Shape</span>
              </>
            ) : (
              <>
                <span className="text-line select-none shrink-0">/</span>
                <span className="text-ink font-medium truncate">All</span>
              </>
            )}
          </nav>

          {/* Center: Soft Luxury Collection Pills (Desktop) */}
          <div className="hidden lg:flex items-center gap-1.5 bg-sand/35 p-1 rounded-full border border-line/50">
            <button
              type="button"
              onClick={() => selectSingleFinish(null)}
              className={cn(
                "px-4 py-1.5 text-xs uppercase tracking-wider font-medium transition-all duration-200 rounded-full cursor-pointer",
                selectedFinishes.length === 0
                  ? "bg-ink text-cream shadow-2xs"
                  : "text-taupe hover:text-ink hover:bg-sand/40",
              )}
            >
              All
            </button>
            {finishes.map((f) => {
              const isSelected = selectedFinishes.length === 1 && selectedFinishes[0] === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => selectSingleFinish(isSelected ? null : f)}
                  className={cn(
                    "px-4 py-1.5 text-xs uppercase tracking-wider font-medium transition-all duration-200 rounded-full cursor-pointer",
                    isSelected
                      ? "bg-ink text-cream shadow-2xs"
                      : "text-taupe hover:text-ink hover:bg-sand/40",
                  )}
                >
                  {finishDisplayLabels[f]}
                </button>
              );
            })}
          </div>

          {/* Right: Filters Trigger & Custom Luxury Sort (Mobile + Desktop) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Filter Button */}
            <button
              type="button"
              onClick={() => setIsFilterDrawerOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-line/70 bg-cream/90 px-3 sm:px-3.5 py-1.5 text-xs uppercase tracking-wider font-medium text-ink hover:border-ink hover:bg-cream transition-all duration-200 cursor-pointer active:scale-95 shadow-2xs"
              aria-label="Open filters"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 stroke-[1.75]" />
              <span className="text-[11px] sm:text-xs">Filters</span>
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-clay text-[9px] font-bold text-cream">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Custom Sort Dropdown */}
            <SortDropdown value={sort} onChange={(s) => setSort(s)} />
          </div>
        </div>

        {/* Mobile & Tablet: Horizontally Scrollable Collection Pills Bar */}
        <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto no-scrollbar pt-2.5 pb-0.5 -mx-1 px-1 mt-1 border-t border-line/40">
          <button
            type="button"
            onClick={() => selectSingleFinish(null)}
            className={cn(
              "shrink-0 px-3.5 py-1 text-[11px] uppercase tracking-wider font-medium transition-all duration-200 rounded-full cursor-pointer",
              selectedFinishes.length === 0
                ? "bg-ink text-cream shadow-2xs"
                : "bg-sand/40 border border-line/50 text-taupe hover:text-ink",
            )}
          >
            All Collections
          </button>
          {finishes.map((f) => {
            const isSelected = selectedFinishes.length === 1 && selectedFinishes[0] === f;
            return (
              <button
                key={`mobile-tab-${f}`}
                type="button"
                onClick={() => selectSingleFinish(isSelected ? null : f)}
                className={cn(
                  "shrink-0 px-3.5 py-1 text-[11px] uppercase tracking-wider font-medium transition-all duration-200 rounded-full cursor-pointer whitespace-nowrap",
                  isSelected
                    ? "bg-ink text-cream shadow-2xs"
                    : "bg-sand/40 border border-line/50 text-taupe hover:text-ink",
                )}
              >
                {finishDisplayLabels[f]}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ── Active Filters Chips Bar ── */}
      {hasActiveFilters && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex flex-wrap items-center gap-2"
        >
          <span className="text-xs text-taupe font-medium mr-1">Active:</span>

          {selectedShapes.map((s) => (
            <button
              key={`chip-shape-${s}`}
              type="button"
              onClick={() => toggleShape(s)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-sand/60 border border-line text-ink hover:bg-sand transition-colors cursor-pointer"
            >
              <span>Shape: <strong>{s}</strong></span>
              <X className="h-3 w-3" />
            </button>
          ))}

          {selectedColors.map((c) => (
            <button
              key={`chip-color-${c}`}
              type="button"
              onClick={() => toggleColor(c)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-sand/60 border border-line text-ink hover:bg-sand transition-colors cursor-pointer"
            >
              <span>Color: <strong>{c}</strong></span>
              <X className="h-3 w-3" />
            </button>
          ))}

          {selectedLengths.map((l) => (
            <button
              key={`chip-length-${l}`}
              type="button"
              onClick={() => toggleLength(l)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-sand/60 border border-line text-ink hover:bg-sand transition-colors cursor-pointer"
            >
              <span>Length: <strong>{l}</strong></span>
              <X className="h-3 w-3" />
            </button>
          ))}

          {selectedFinishes.map((f) => (
            <button
              key={`chip-finish-${f}`}
              type="button"
              onClick={() => toggleFinish(f)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-sand/60 border border-line text-ink hover:bg-sand transition-colors cursor-pointer"
            >
              <span>Collection: <strong>{finishDisplayLabels[f]}</strong></span>
              <X className="h-3 w-3" />
            </button>
          ))}

          {sort !== "featured" && (
            <button
              type="button"
              onClick={() => setSort("featured")}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-sand/60 border border-line text-ink hover:bg-sand transition-colors cursor-pointer"
            >
              <span>Sort: <strong>{sort === "low" ? "Price Low-High" : "Price High-Low"}</strong></span>
              <X className="h-3 w-3" />
            </button>
          )}

          <button
            type="button"
            onClick={resetFilters}
            className="text-xs text-taupe underline hover:text-ink ml-2 cursor-pointer"
          >
            Clear all
          </button>
        </motion.div>
      )}

      {/* ── Anchor for smooth scroll ── */}
      <div id="products-grid-top" className="scroll-mt-32" />

      {/* ── Product Grid or Empty State ── */}
      {visible.length === 0 ? (
        <div className="mt-14 py-16 text-center border border-line/60 rounded-xl bg-sand/20 px-4">
          <p className="font-serif text-2xl text-ink">No matching shades found</p>
          <p className="mt-2 text-sm text-taupe">Try adjusting or clearing your filters.</p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-6 px-6 py-2.5 bg-ink text-cream text-xs uppercase tracking-wider font-semibold hover:bg-clay transition-colors cursor-pointer rounded-sm"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <motion.div layout className="mt-8 md:mt-12 grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-12 lg:grid-cols-4">
          {paginatedProducts.map((p, i) => (
            <motion.div
              key={p.slug}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.8, ease: EASE, delay: (i % 4) * 0.06 }}
            >
              <ProductCard product={p} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ── Minimalist Luxury Pagination Bar ── */}
      {totalPages > 1 && (
        <nav
          aria-label="Product pagination"
          className="mt-12 md:mt-20 flex items-center justify-center gap-3 sm:gap-8 font-sans select-none px-2"
        >
          <button
            type="button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Previous page"
            className={cn(
              "flex items-center justify-center p-1 text-taupe transition-colors cursor-pointer hover:text-ink disabled:opacity-0 disabled:pointer-events-none",
            )}
          >
            <ChevronLeft className="h-4 w-4 stroke-[1.75]" />
          </button>

          <div className="flex items-center gap-2.5 sm:gap-7">
            {paginationItems.map((item, idx) => {
              if (item === "...") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="text-xs sm:text-base text-taupe/60 cursor-default select-none px-0.5 sm:px-1 tracking-wider"
                  >
                    ...
                  </span>
                );
              }

              const isCurrent = item === currentPage;
              return (
                <button
                  key={`page-${item}`}
                  type="button"
                  onClick={() => handlePageChange(item as number)}
                  aria-current={isCurrent ? "page" : undefined}
                  className={cn(
                    "relative pb-1 transition-colors cursor-pointer text-xs sm:text-base font-normal tracking-wider px-1",
                    isCurrent
                      ? "text-ink font-medium"
                      : "text-taupe hover:text-ink",
                  )}
                >
                  {item}
                  {isCurrent && (
                    <motion.span
                      layoutId="pagination-active-underline"
                      className="absolute bottom-0 inset-x-0 h-[1.5px] bg-ink"
                      transition={{ duration: 0.3, ease: EASE }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label="Next page"
            className={cn(
              "flex items-center justify-center p-1 text-taupe transition-colors cursor-pointer hover:text-ink disabled:opacity-0 disabled:pointer-events-none",
            )}
          >
            <ChevronRight className="h-4 w-4 stroke-[1.75]" />
          </button>
        </nav>
      )}

      <p className="mt-10 text-center text-xs uppercase tracking-widest text-taupe font-medium">
        {totalPages > 1
          ? `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(currentPage * ITEMS_PER_PAGE, visible.length)} of ${visible.length} shades`
          : `${visible.length} shades`}
      </p>

      {/* ── Filter Drawer (Accordion & Checkboxes matching Image 1) ── */}
      <AnimatePresence>
        {isFilterDrawerOpen && (
          <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setIsFilterDrawerOpen(false)}
              className="absolute inset-0 bg-ink/50 backdrop-blur-xs"
            />

            {/* Slide-out Sheet (Right sidebar on desktop, bottom sheet on mobile) */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute inset-y-0 right-0 w-full sm:w-[380px] md:w-[400px] flex flex-col border-l border-line bg-cream shadow-2xl overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-cream">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xs font-bold tracking-[0.22em] text-ink uppercase">
                    Filters
                  </h2>
                  {activeFilterCount > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-clay text-[10px] font-bold text-cream">
                      {activeFilterCount}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-taupe hover:text-ink hover:border-ink transition-colors cursor-pointer"
                  aria-label="Close filters"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer Accordion Body (Matching Image 1) */}
              <div className="flex-1 overflow-y-auto px-6 py-2 text-sm divide-y divide-transparent">
                {/* 1. COLOR Section (Image 1 top section) */}
                <FilterAccordionSection
                  title="COLOR"
                  isOpen={Boolean(openSections.color)}
                  onToggle={() => toggleSection("color")}
                >
                  {FILTER_COLORS.map((color) => {
                    const isChecked = selectedColors.includes(color);
                    return (
                      <FilterCheckboxItem
                        key={color}
                        label={color}
                        checked={isChecked}
                        count={counts.colors[color] ?? 0}
                        onClick={() => toggleColor(color)}
                      />
                    );
                  })}
                </FilterAccordionSection>

                {/* 2. LENGTH Section (Image 1 bottom section) */}
                <FilterAccordionSection
                  title="LENGTH"
                  isOpen={Boolean(openSections.length)}
                  onToggle={() => toggleSection("length")}
                >
                  {FILTER_LENGTHS.map((length) => {
                    const isChecked = selectedLengths.includes(length);
                    return (
                      <FilterCheckboxItem
                        key={length}
                        label={length}
                        checked={isChecked}
                        count={counts.lengths[length] ?? 0}
                        onClick={() => toggleLength(length)}
                      />
                    );
                  })}
                </FilterAccordionSection>

                {/* 3. SHAPE Section */}
                <FilterAccordionSection
                  title="SHAPE"
                  isOpen={Boolean(openSections.shape)}
                  onToggle={() => toggleSection("shape")}
                >
                  {NAIL_SHAPES.map((shape) => {
                    const isChecked = selectedShapes.includes(shape.name);
                    return (
                      <FilterCheckboxItem
                        key={shape.id}
                        label={shape.name}
                        checked={isChecked}
                        count={shape.available ? (counts.shapes[shape.name] ?? 0) : undefined}
                        disabled={!shape.available}
                        badge={!shape.available ? "Soon" : undefined}
                        icon={shape.image}
                        onClick={() => {
                          if (shape.available) toggleShape(shape.name);
                        }}
                      />
                    );
                  })}
                </FilterAccordionSection>

                {/* 4. COLLECTION Section */}
                <FilterAccordionSection
                  title="COLLECTION"
                  isOpen={Boolean(openSections.collection)}
                  onToggle={() => toggleSection("collection")}
                >
                  {finishes.map((f) => {
                    const isChecked = selectedFinishes.includes(f);
                    return (
                      <FilterCheckboxItem
                        key={f}
                        label={finishDisplayLabels[f]}
                        checked={isChecked}
                        count={counts.finishes[f] ?? 0}
                        onClick={() => toggleFinish(f)}
                      />
                    );
                  })}
                </FilterAccordionSection>
              </div>

              {/* Drawer Footer Actions */}
              <div className="border-t border-line bg-sand/20 px-6 py-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={resetFilters}
                  disabled={!hasActiveFilters}
                  className="flex-1 py-3 px-4 border border-line bg-cream text-xs uppercase tracking-wider font-semibold text-ink hover:bg-bone transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-center rounded-lg"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="flex-2 py-3 px-4 bg-ink text-xs uppercase tracking-wider font-semibold text-cream hover:bg-clay transition-colors cursor-pointer text-center rounded-lg shadow-sm"
                >
                  View {visible.length} Shades
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ── Custom Luxury Sort Dropdown (Zero Native OS Blue) ── */
function SortDropdown({
  value,
  onChange,
}: {
  value: Sort;
  onChange: (s: Sort) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const labels: Record<Sort, string> = {
    featured: "Featured",
    low: "Price: Low to High",
    high: "Price: High to Low", 
  };

  return (
    <div ref={ref} className="hidden md:block relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 sm:gap-1.5 rounded-full border border-line/70 bg-cream/90 px-2.5 sm:px-3.5 py-1.5 text-xs uppercase tracking-wider font-medium text-ink hover:border-ink hover:bg-cream transition-all duration-200 cursor-pointer active:scale-95 shadow-2xs shrink-0"
        aria-expanded={isOpen}
        aria-label="Sort options"
      >
        <span className="hidden sm:inline text-[10px] text-taupe/70 font-normal">Sort:</span>
        <span className="text-ink font-medium text-[11px] sm:text-xs truncate max-w-[85px] sm:max-w-none">
          {labels[value]}
        </span>
        <ChevronDown
          className={cn("h-3 w-3 stroke-[2] text-taupe transition-transform duration-200 shrink-0", isOpen && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: EASE }}
            className="absolute right-0 top-full mt-2 w-44 sm:w-48 max-w-[calc(100vw-2rem)] rounded-xl border border-line/80 bg-cream/98 backdrop-blur-md p-1.5 shadow-xl z-50 overflow-hidden"
          >
            {(["featured", "low", "high"] as Sort[]).map((key) => {
              const isSelected = value === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onChange(key);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer text-left active:bg-sand/40",
                    isSelected
                      ? "bg-sand/60 text-ink font-medium"
                      : "text-taupe hover:text-ink hover:bg-sand/30",
                  )}
                >
                  <span>{labels[key]}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 stroke-[2.5] text-ink" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Accordion Filter Section (Matching Image 1) ── */
function FilterAccordionSection({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-line/60 pb-5 pt-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between py-1 text-left cursor-pointer group select-none min-h-[40px]"
      >
        <span className="font-sans text-xs tracking-[0.2em] font-semibold text-ink uppercase">
          {title}
        </span>
        <span className="text-taupe group-hover:text-ink transition-colors flex items-center justify-center p-1">
          {isOpen ? <Minus className="h-3.5 w-3.5 stroke-[1.75]" /> : <Plus className="h-3.5 w-3.5 stroke-[1.75]" />}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-2 space-y-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Checkbox Item (Touch-friendly 44px min-target matching Image 1) ── */
function FilterCheckboxItem({
  label,
  checked,
  count,
  disabled,
  badge,
  icon,
  onClick,
}: {
  label: string;
  checked: boolean;
  count?: number;
  disabled?: boolean;
  badge?: string;
  icon?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between text-left cursor-pointer group select-none py-2 px-2 -mx-2 rounded-lg transition-colors active:bg-sand/35 hover:bg-sand/20 min-h-[42px]",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <div className="flex items-center gap-3">
        {/* Rounded square checkbox matching Image 1 */}
        <div
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded-[3.5px] border transition-all duration-150",
            checked
              ? "border-ink bg-ink text-cream"
              : "border-line/90 bg-cream/70 group-hover:border-ink/70",
          )}
        >
          {checked && <Check className="h-3 w-3 stroke-[3]" />}
        </div>

        {/* Thumbnail icon if available (e.g. nail shape silhouette) */}
        {icon && (
          <div className="relative w-5 h-5 shrink-0 opacity-85">
            <Image src={icon} alt={label} fill className="object-contain" />
          </div>
        )}

        <span
          className={cn(
            "text-sm tracking-wide transition-colors",
            checked ? "text-ink font-medium" : "text-ink/80 group-hover:text-ink font-normal",
          )}
        >
          {label}
        </span>
      </div>

      {badge ? (
        <span className="text-[9px] uppercase tracking-widest text-taupe bg-sand/60 border border-line/60 px-1.5 py-0.5 rounded-full font-medium">
          {badge}
        </span>
      ) : count !== undefined ? (
        <span className="text-xs text-taupe/60 font-sans">{count}</span>
      ) : null}
    </button>
  );
}
