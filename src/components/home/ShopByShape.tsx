"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { NAIL_SHAPES } from "@/lib/shapes";
import { EASE } from "@/components/motion/Reveal";

export default function ShopByShape() {
  return (
    <section className="border-t border-line/70 bg-cream/50 py-12 sm:py-18 md:py-24">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 md:px-10">
        {/* Section Header */}
        <div className="text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: EASE }}
            className="font-serif text-2xl sm:text-4xl md:text-5xl font-normal text-ink tracking-tight"
          >
            Shop By Shape
          </motion.h2>
        </div>

        {/* 5 Shape Columns (Horizontal swipe on mobile, centered flex/grid on desktop) */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
          className="mt-8 sm:mt-12 md:mt-16 flex items-end justify-start sm:justify-center gap-3 sm:gap-6 md:gap-10 lg:gap-14 max-w-4xl mx-auto overflow-x-auto no-scrollbar px-2 sm:px-0 pb-2 snap-x snap-mandatory sm:snap-none"
        >
          {NAIL_SHAPES.map((shape) => {
            const content = (
              <div className="flex flex-col items-center text-center group cursor-pointer shrink-0 w-[72px] sm:w-20 md:w-24 lg:w-28 snap-center">
                {/* Silhouette Image with hover interaction */}
                <div className="relative w-11 sm:w-16 md:w-20 lg:w-24 aspect-[184/310] flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-2">
                  <Image
                    src={shape.image}
                    alt={`${shape.name} nail shape`}
                    fill
                    sizes="(max-width: 640px) 70px, (max-width: 1024px) 15vw, 120px"
                    className="object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-300 group-hover:drop-shadow-[0_8px_16px_rgba(0,0,0,0.12)]"
                  />
                </div>

                {/* Shape Name */}
                <span className="mt-2.5 sm:mt-4 font-serif text-xs sm:text-sm md:text-base text-ink tracking-wide transition-colors duration-200 group-hover:text-clay whitespace-nowrap">
                  {shape.name}
                </span>

                {/* Status or subtle indicator */}
                {shape.available ? (
                  <span className="hidden sm:inline-block mt-1 text-[10px] text-taupe/70 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    Explore
                  </span>
                ) : (
                  <span className="mt-1 sm:mt-1.5 inline-block text-[8px] sm:text-[9px] uppercase tracking-widest text-taupe/90 bg-sand/60 border border-line/80 px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap">
                    Soon
                  </span>
                )}
              </div>
            );

            if (!shape.available) {
              return (
                <div
                  key={shape.id}
                  className="flex flex-col items-center text-center opacity-70 cursor-default shrink-0 w-[72px] sm:w-20 md:w-24 lg:w-28 snap-center"
                  title="Square shape coming soon"
                >
                  <div className="relative w-11 sm:w-16 md:w-20 lg:w-24 aspect-[184/310] flex items-center justify-center">
                    <Image
                      src={shape.image}
                      alt={`${shape.name} nail shape (Coming Soon)`}
                      fill
                      sizes="(max-width: 640px) 70px, (max-width: 1024px) 15vw, 120px"
                      className="object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.04)]"
                    />
                  </div>
                  <span className="mt-2.5 sm:mt-4 font-serif text-xs sm:text-sm md:text-base text-ink/75 tracking-wide whitespace-nowrap">
                    {shape.name}
                  </span>
                  <span className="mt-1 sm:mt-1.5 inline-block text-[8px] sm:text-[9px] uppercase tracking-widest text-taupe/90 bg-sand/60 border border-line/80 px-1.5 sm:px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                    Soon
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={shape.id}
                href={`/shop?shape=${shape.id}`}
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-clay rounded-md shrink-0"
              >
                {content}
              </Link>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

