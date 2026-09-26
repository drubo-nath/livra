export default function ProductLoading() {
  return (
    <div className="w-full animate-fade-in" aria-busy="true" aria-label="Loading product details">
      {/* ── Breadcrumb Skeleton ── */}
      <div className="mx-auto max-w-[1440px] px-5 pt-8 md:px-10">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-10 rounded-full bg-sand/60 animate-pulse" />
          <span className="text-taupe/30 text-xs">/</span>
          <div className="h-2.5 w-12 rounded-full bg-sand/60 animate-pulse" />
          <span className="text-taupe/30 text-xs">/</span>
          <div className="h-2.5 w-24 rounded-full bg-sand/80 animate-pulse" />
        </div>
      </div>

      {/* ── Main Product Section Skeleton (2 Columns) ── */}
      <section className="mx-auto grid max-w-[1440px] gap-12 px-5 py-10 md:grid-cols-2 md:px-10 md:py-14 lg:gap-20">
        {/* Left: Product Media Gallery Skeleton */}
        <div className="grid gap-4">
          {/* Main Hero Image Skeleton */}
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm bg-sand/40">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_1.8s_infinite]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-serif text-2xl tracking-widest text-taupe/20 uppercase select-none">
                LIVRA
              </span>
            </div>
          </div>

          {/* Thumbnail Strip Skeleton */}
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="relative aspect-square w-full overflow-hidden rounded-sm bg-sand/30"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_1.8s_infinite]" />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Buy Panel Skeleton */}
        <div className="flex flex-col justify-start">
          {/* Price Skeleton */}
          <div className="mt-2 flex items-baseline gap-3">
            <div className="h-9 w-32 rounded-md bg-sand/70 animate-pulse" />
            <div className="h-5 w-20 rounded-md bg-sand/40 animate-pulse" />
          </div>

          {/* Description Paragraph Skeleton */}
          <div className="mt-6 space-y-2.5 max-w-md">
            <div className="h-3.5 w-full rounded-full bg-sand/60 animate-pulse" />
            <div className="h-3.5 w-[92%] rounded-full bg-sand/60 animate-pulse" />
            <div className="h-3.5 w-[75%] rounded-full bg-sand/50 animate-pulse" />
          </div>

          {/* Nail Specifications Chips Skeleton */}
          <div className="mt-6 flex flex-wrap items-center gap-2 pt-4 border-t border-line/60">
            <div className="h-6 w-24 rounded-full bg-sand/60 animate-pulse" />
            <div className="h-6 w-20 rounded-full bg-sand/60 animate-pulse" />
            <div className="h-6 w-22 rounded-full bg-sand/60 animate-pulse" />
            <div className="h-6 w-28 rounded-full bg-sand/60 animate-pulse" />
          </div>

          {/* Size Section Skeleton */}
          <div className="mt-9">
            <div className="flex items-center justify-between">
              <div className="h-4 w-12 rounded-full bg-sand/70 animate-pulse" />
              <div className="h-3.5 w-16 rounded-full bg-sand/50 animate-pulse" />
            </div>
            <div className="mt-3 flex gap-2">
              {[0, 1, 2, 3].map((s) => (
                <div
                  key={s}
                  className="h-11 w-11 rounded-sm border border-line/80 bg-sand/30 animate-pulse"
                />
              ))}
            </div>
          </div>

          {/* Qty & Add to Bag Button Skeleton */}
          <div className="mt-8 flex gap-3">
            <div className="h-12 w-28 rounded-sm border border-line/80 bg-sand/20 animate-pulse" />
            <div className="h-12 flex-1 rounded-sm bg-ink/80 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_1.6s_infinite]" />
            </div>
          </div>

          {/* Assurances List Skeleton */}
          <div className="mt-10 space-y-3.5 border-t border-line/60 pt-8">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-clay/50 text-xs">✦</span>
                <div
                  className="h-3 rounded-full bg-sand/50 animate-pulse"
                  style={{ width: `${65 + ((i * 11) % 30)}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Related Items Section Skeleton ── */}
      <section className="border-t border-line/60 bg-cream/40 py-16 md:py-24">
        <div className="mx-auto max-w-[1440px] px-5 md:px-10">
          <div className="h-9 w-64 rounded-md bg-sand/60 animate-pulse mb-10" />
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4 md:gap-x-8">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm bg-sand/40">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_1.8s_infinite]" />
                </div>
                <div className="h-4 w-3/4 rounded-full bg-sand/60 animate-pulse" />
                <div className="h-3.5 w-1/3 rounded-full bg-sand/50 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

