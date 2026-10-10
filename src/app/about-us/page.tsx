import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "About Us | LIVRA Pressed Ons",
  description:
    "LIVRA creates wearable art, not just press-ons — handmade press-on nails made for Bangladeshi women, pairing style and elegance with traditional dress.",
  alternates: {
    canonical: "/about-us",
  },
  openGraph: {
    title: "About Us | LIVRA Pressed Ons",
    description:
      "Redefining what press-on nails can be: wearable art handmade with care, made for Bangladeshi women.",
    url: "https://www.livrapressons.com/about-us",
  },
};

const ABOUT_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About Livra Pressed Ons",
  url: "https://www.livrapressons.com/about-us",
  mainEntity: {
    "@type": "Organization",
    name: "LIVRA Pressed Ons",
    url: "https://www.livrapressons.com",
    description:
      "Handcrafted press-on nails made for Bangladeshi women — wearable art that pairs with traditional dress, from a saree for Eid to a lehenga for your holud.",
  },
};

const PROMISES = [
  {
    title: "Quality you can trust",
    body: "Each set is handmade with high-quality, ethically made materials.",
  },
  {
    title: "Always fresh",
    body: "Our collection is updated constantly to keep up with the latest trends.",
  },
  {
    title: "Made for you",
    body: "Designs are crafted to suit every personality, occasion and outfit, and we can create a custom set for your special day.",
  },
];

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ABOUT_SCHEMA) }}
      />

      <div className="mx-auto max-w-[1440px] px-5 py-14 md:px-10 md:py-24">
        {/* Header */}
        <header className="max-w-3xl">
          <Reveal>
            <h1 className="headline text-5xl md:text-7xl">
              About <em>Us</em>
            </h1>
          </Reveal>
          <Reveal delay={2}>
            <p className="mt-6 text-base md:text-lg text-taupe leading-relaxed">
              Wearable art, not just press-ons — handmade with care for the women
              of Bangladesh.
            </p>
          </Reveal>
        </header>

        {/* Section 1 — Our Goal */}
        <section id="goal" className="mt-16 scroll-mt-24">
          <Reveal>
            <div className="mb-6 flex items-baseline justify-between border-b border-line pb-3">
              <h2 className="headline text-2xl md:text-3xl">Our Goal</h2>
              <span className="font-serif text-sm italic text-clay">01</span>
            </div>
          </Reveal>
          <Reveal delay={1}>
            <div className="max-w-3xl space-y-5 text-base md:text-lg text-taupe leading-relaxed">
              <p>
                At <strong className="text-ink">LIVRA</strong>, we are redefining
                what press-on nails can be. We create wearable art, not just
                press-ons. We are made for Bangladeshi women. We believe every
                woman deserves to feel beautiful and confident, whether she is a
                homemaker, a working professional or a student. Everyone should be
                able to enjoy luxury and quality without giving up their time or
                stretching their budget.
              </p>
              <p>
                Every <strong className="text-ink">LIVRA</strong> design is
                inspired by Bangladeshi taste. Our nails are made to pair with
                traditional dress, from a saree for Eid to a lehenga for your
                holud, with a balance of style, elegance and individuality.
              </p>
            </div>
          </Reveal>
        </section>

        {/* Section 2 — Why LIVRA */}
        <section id="why-livra" className="mt-16 scroll-mt-24">
          <Reveal>
            <div className="mb-6 flex items-baseline justify-between border-b border-line pb-3">
              <h2 className="headline text-2xl md:text-3xl">Why LIVRA</h2>
              <span className="font-serif text-sm italic text-clay">02</span>
            </div>
          </Reveal>
          <Reveal delay={1}>
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-start">
              <div className="max-w-xl space-y-5 text-base md:text-lg text-taupe leading-relaxed">
                <p>
                  <strong className="text-ink">Livra</strong> comes from the
                  Romanian <em>a livra</em> and the French <em>livrer</em>, both
                  meaning{" "}
                  <em className="text-ink font-medium">to deliver</em>. Our goal
                  is just as simple: to deliver wearable art to you.
                </p>
                <p>
                  Every design is handmade with care. We believe nails are the
                  finishing touch that adds a hint of splendor to your everyday
                  life.
                </p>
              </div>
              <div className="border border-line bg-sand/30 p-8 md:p-12">
                <p className="font-serif text-2xl md:text-3xl italic text-ink leading-snug">
                  &ldquo;To deliver wearable art to you.&rdquo;
                </p>
                <p className="mt-4 text-xs uppercase tracking-widest text-taupe font-medium">
                  The LIVRA Goal
                </p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Section 3 — Our Promise to You */}
        <section id="promise" className="mt-16 scroll-mt-24">
          <Reveal>
            <div className="mb-6 flex items-baseline justify-between border-b border-line pb-3">
              <h2 className="headline text-2xl md:text-3xl">
                Our Promise to You
              </h2>
              <span className="font-serif text-sm italic text-clay">03</span>
            </div>
          </Reveal>
          <div className="grid gap-px overflow-hidden border border-line bg-line md:grid-cols-3">
            {PROMISES.map((p, i) => (
              <Reveal key={p.title} delay={i + 1} className="h-full">
                <div className="h-full bg-cream p-8 md:p-10 flex flex-col justify-between">
                  <div>
                    <h3 className="headline text-2xl text-ink">{p.title}</h3>
                    <p className="mt-3 text-sm text-taupe leading-relaxed">
                      {p.body}
                    </p>
                  </div>
                  <div className="mt-8">
                    <span className="font-serif text-sm italic text-clay">
                      0{i + 1}
                    </span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <Reveal delay={1}>
          <div className="mt-16 flex flex-col items-center gap-6 border border-line bg-cream p-10 md:p-14 text-center">
            <p className="max-w-xl text-base md:text-lg text-taupe leading-relaxed">
              Explore the collection — wearable art, handmade for you.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/shop"
                className="inline-block border border-ink bg-ink px-10 py-3.5 text-center text-xs tracking-wider uppercase text-cream transition-colors duration-300 hover:bg-clay-deep hover:border-clay-deep"
              >
                Browse Collections
              </Link>
              <Link
                href="/contact"
                className="inline-block border border-line px-10 py-3.5 text-center text-xs tracking-wider uppercase text-ink transition-colors duration-300 hover:border-ink hover:bg-bone"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </>
  );
}
