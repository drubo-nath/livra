"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Minus } from "lucide-react";

const SECTIONS = [
  {
    title: "Collection",
    links: [
      { label: "All Press-Ons", href: "/shop" },
      { label: "Tools & Accessories", href: "/tools-accessories" },
      { label: "Exclusive", href: "/shop?finish=Exclusive" },
      { label: "Classic (Single Colours)", href: "/shop?finish=Classic" },
      { label: "Signature", href: "/shop?finish=Signature" },
      { label: "New Arrivals", href: "/shop?sort=new" },
    ],
  },
  {
    title: "Client Service",
    links: [
      { label: "Contact Us", href: "/contact" },
      { label: "FAQs", href: "/faq" },
      { label: "Shipping & Delivery", href: "/shipping" },
      { label: "Return Policy", href: "/returns" },
      { label: "How to Find Your Size", href: "/sizing" },
    ],
  },
  {
    title: "The Atelier",
    links: [
      { label: "The Ritual", href: "/#ritual" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
];

export default function Footer() {
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (title: string) => {
    setOpenSection((prev) => (prev === title ? null : title));
  };

  return (
    <footer className="border-t border-white/10 bg-[#0c0b0a] text-white">
      <div className="mx-auto max-w-[1440px] px-6 py-14 sm:px-8 md:px-12 md:py-20">
        {/* ── Desktop Main Footer Grid (Brand + 4 Columns) ── */}
        <div className="hidden md:grid md:grid-cols-[1.8fr_1fr_1fr_0.8fr_0.8fr] lg:grid-cols-[1.8fr_1fr_1fr_0.8fr_0.8fr] gap-10 md:gap-12 lg:gap-14 items-start">
          {/* Brand Manifesto & Concierge */}
          <div className="space-y-4 max-w-sm">
            <Link href="/" className="inline-block">
              <Image
                src="/livra.svg"
                alt="Livra"
                width={180}
                height={60}
                className="h-9 md:h-10 w-auto brightness-0 invert opacity-95 hover:opacity-100 transition-opacity"
              />
            </Link>

            <p className="text-xs md:text-sm leading-relaxed text-white/70 font-light pt-1">
              Salon-sculpted, handcrafted press-on nails crafted for Bangladesh&rsquo;s most refined hands. Damage-free, reusable for months, and ready in ten minutes.
            </p>

            {/* Direct Brand WhatsApp & Email */}
            <div className="space-y-1.5 pt-2 text-xs text-white/80">
              <p className="flex items-center gap-2">
                <span className="text-clay font-medium">WhatsApp:</span>
                <a
                  href="https://wa.me/8801577759518"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors underline-offset-4 hover:underline"
                >
                  +880 1577-759518
                </a>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-clay font-medium">Email:</span>
                <a
                  href="mailto:livrapressons@gmail.com"
                  className="hover:text-white transition-colors underline-offset-4 hover:underline"
                >
                  livrapressons@gmail.com
                </a>
              </p>
            </div>
          </div>

          {/* Nav Link Columns */}
          {SECTIONS.map((col) => (
            <div key={col.title} className="space-y-3.5">
              <p className="text-xs font-sans tracking-[0.2em] uppercase font-semibold text-white/90">
                {col.title}
              </p>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="font-serif text-[14px] text-white/70 hover:text-white transition-colors duration-200 inline-block py-0.5"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Mobile Layout (< md) ── */}
        <div className="md:hidden">
          {/* Brand Manifesto & Concierge */}
          <div className="space-y-4 max-w-sm mb-8">
            <Link href="/" className="inline-block">
              <Image
                src="/livra.svg"
                alt="Livra"
                width={160}
                height={54}
                className="h-6.5 w-auto brightness-0 invert opacity-95 hover:opacity-100 transition-opacity"
              />
            </Link>

            <p className="text-xs leading-relaxed text-white/70 font-light pt-1">
              Salon-sculpted, handcrafted press-on nails crafted for Bangladesh&rsquo;s most refined hands. Damage-free, reusable for months, and ready in ten minutes.
            </p>

            <div className="space-y-1.5 pt-1 text-xs text-white/80">
              <p className="flex items-center gap-2">
                <span className="text-clay font-medium">WhatsApp:</span>
                <a
                  href="https://wa.me/8801577759518"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors underline-offset-4 hover:underline"
                >
                  +880 1577-759518
                </a>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-clay font-medium">Email:</span>
                <a
                  href="mailto:livrapressons@gmail.com"
                  className="hover:text-white transition-colors underline-offset-4 hover:underline"
                >
                  livrapressons@gmail.com
                </a>
              </p>
            </div>
          </div>

          {/* Accordion Menu */}
          <div className="border-y border-white/10 divide-y divide-white/10">
            {SECTIONS.map((section) => {
              const isOpen = openSection === section.title;
              return (
                <div key={section.title} className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection(section.title)}
                    className="w-full flex items-center justify-between py-4 text-left group transition-colors"
                    aria-expanded={isOpen}
                  >
                    <span className="text-xs font-sans tracking-[0.2em] uppercase font-medium text-white/90 group-hover:text-white">
                      {section.title}
                    </span>
                    <span className="text-white/60 group-hover:text-white transition-colors flex items-center justify-center">
                      {isOpen ? (
                        <Minus className="w-4 h-4 stroke-[1.25]" />
                      ) : (
                        <Plus className="w-4 h-4 stroke-[1.25]" />
                      )}
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <ul className="pb-5 pt-1 space-y-3">
                          {section.links.map((link) => (
                            <li key={link.label}>
                              <Link
                                href={link.href}
                                className="font-serif text-[15px] text-white/70 hover:text-white transition-colors block py-0.5"
                              >
                                {link.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Sub-Footer Bottom Bar ── */}
        <div className="mt-12 md:mt-18 border-t border-white/10 pt-8 flex flex-col items-start justify-between gap-6 text-xs text-white/50 md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} Livra Press-Ons. All rights reserved.</p>

          <div className="hidden md:flex flex-wrap items-center gap-3.5 text-xs text-white/60">
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <span>·</span>
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <span>·</span>
            <Link href="/shipping" className="hover:text-white transition-colors">
              Shipping
            </Link>
            <span>·</span>
            <Link href="/returns" className="hover:text-white transition-colors">
              Returns
            </Link>
            <span>·</span>
            <Link href="/sizing" className="hover:text-white transition-colors">
              Sizing Guide
            </Link>
            <span>·</span>
            <Link href="/faq" className="hover:text-white transition-colors">
              FAQ
            </Link>
            <span>·</span>
            <Link href="/contact" className="hover:text-white transition-colors">
              Contact
            </Link>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-white/60">
            <span>🇧🇩 Bangladesh · BDT (৳)</span>
            <span className="text-white/20">|</span>
            <span className="text-[10px] tracking-wider uppercase text-white/40 font-medium">bKash · Nagad · Card</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
