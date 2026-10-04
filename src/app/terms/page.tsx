import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Terms & Conditions | LIVRA",
  description:
    "Read the terms and conditions governing the purchase of handcrafted press-on nails, payment methods, intellectual property, and service agreements at Livra Pressed Ons.",
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: "Terms & Conditions | LIVRA",
    description: "Official Terms & Conditions for Livra Pressed Ons in Bangladesh.",
    url: "https://www.livrapressons.com/terms",
  },
};

const SECTIONS = [
  {
    num: "01",
    title: "General Conditions",
    content: (
      <p>
        We reserve the right to refuse service to anyone for any reason at any time. You agree not
        to reproduce, duplicate, copy, sell, or exploit any portion of our products, nail designs,
        artisan patterns, brand photography, or written content without express prior written
        permission from Livra Pressed Ons.
      </p>
    ),
  },
  {
    num: "02",
    title: "Accuracy of Colors and Designs",
    content: (
      <p>
        We have made every effort to display as accurately as possible the colors and images of our
        products across screen displays. However, because each of our sets is individually
        handcrafted by nail artists, slight natural variations in color tone, gem or pearl
        placement, and hand-painted design details may occur and are inherent to artisanal nail
        artistry.
      </p>
    ),
  },
  {
    num: "03",
    title: "Pricing and Payment",
    content: (
      <p>
        Prices for our products are listed in Bangladeshi Taka (BDT) and are subject to change
        without prior notice. We accept payments via Mobile Banking (bKash and Nagad) and all
        major Visa, Mastercard, and UnionPay credit and debit cards via SSLCOMMERZ. All orders
        must be paid in full at checkout.
      </p>
    ),
  },
  {
    num: "04",
    title: "Modifications to the Service",
    content: (
      <p>
        We reserve the right at any time to modify or discontinue specific nail shapes, tip lengths,
        limited collections, or custom design offerings without notice.
      </p>
    ),
  },
  {
    num: "05",
    title: "Governing Law",
    content: (
      <p>
        These Terms &amp; Conditions and any separate agreements whereby we provide you products
        shall be governed by and construed in accordance with the laws of the People&apos;s Republic
        of Bangladesh.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-5 py-14 md:px-10 md:py-24">
      {/* Header */}
      <header className="max-w-3xl">
        <Reveal>
          <h1 className="headline text-5xl md:text-7xl">
            Terms &amp; <em>Conditions</em>
          </h1>
        </Reveal>
        <Reveal delay={2}>
          <p className="mt-6 text-base md:text-lg text-taupe leading-relaxed">
            Welcome to Livra Pressed Ons. By accessing our website and purchasing our products, you
            agree to be bound by the following Terms &amp; Conditions.
          </p>
        </Reveal>
      </header>

      {/* Main Legal Sections */}
      <div className="mt-16 grid gap-16 lg:grid-cols-[1fr_320px] lg:gap-20">
        <div className="space-y-12">
          {SECTIONS.map((sec, idx) => (
            <Reveal key={sec.num} delay={idx * 0.5}>
              <article className="border-t border-line pt-8">
                <div className="flex items-baseline gap-4 mb-4">
                  <span className="font-serif text-sm italic text-clay">{sec.num}</span>
                  <h2 className="headline text-2xl md:text-3xl text-ink">{sec.title}</h2>
                </div>
                <div className="text-[15px] leading-relaxed text-taupe pl-8 md:pl-9">
                  {sec.content}
                </div>
              </article>
            </Reveal>
          ))}

          <Reveal>
            <div className="border border-line bg-cream p-6 text-xs text-taupe leading-relaxed">
              <p className="font-medium text-ink mb-1">Questions regarding our terms?</p>
              Please contact us through our official channels or WhatsApp support at{" "}
              <a href="https://wa.me/8801577759518" className="text-clay underline">
                +8801577-759518
              </a>
              .
            </div>
          </Reveal>
        </div>

        {/* Sidebar */}
        <aside className="h-fit space-y-6 lg:sticky lg:top-28">
          <div className="border border-line bg-cream p-6">
            <p className="font-serif text-sm italic text-clay mb-3">Policy Directory</p>
            <ul className="space-y-2 text-sm text-taupe">
              <li>
                <span className="text-ink font-medium">• Terms &amp; Conditions</span>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-ink hover:underline">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/returns" className="hover:text-ink hover:underline">
                  Return &amp; Refund Policy
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="hover:text-ink hover:underline">
                  Shipping &amp; Delivery
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-ink hover:underline">
                  Frequently Asked Questions
                </Link>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

