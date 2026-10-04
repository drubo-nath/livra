import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/motion/Reveal";
import FaqAccordion, { FaqItem } from "@/components/faq/FaqAccordion";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | LIVRA",
  description:
    "Find answers about nail sizing, measuring with clear tape and ruler, application longevity, reusable press-ons, payment methods, and bespoke custom orders at Livra.",
  alternates: {
    canonical: "/faq",
  },
  openGraph: {
    title: "Frequently Asked Questions | LIVRA",
    description:
      "All your questions answered: measuring guide, wear duration, reusability, payment methods, and custom press-on sets.",
    url: "https://www.livrapressons.com/faq",
  },
};

const SIZING_ITEMS: FaqItem[] = [
  {
    question: "How do I know my nail size?",
    answer: (
      <>
        <p>
          We highly recommend measuring your nails before ordering. Please refer to our sizing
          instructions below. To check your nail size for press-on nails, use a piece of clear tape,
          a pen, and a ruler with millimeter markings to measure the widest part of each nail.
        </p>
        <div className="mt-4 rounded-sm border border-line bg-cream p-5">
          <p className="font-serif text-base text-ink mb-3 font-medium">How to Measure Your Nails:</p>
          <ul className="list-inside list-disc space-y-2 text-taupe text-sm">
            <li>Place a piece of clear tape horizontally across the widest part of your natural nail.</li>
            <li>Press the tape down so it curves to your nail bed.</li>
            <li>Use a pen or marker to draw a line on the tape at each edge (sidewall) of your nail.</li>
            <li>Peel the tape off and stick it flat onto a piece of paper or a flat surface.</li>
            <li>Use a ruler to measure the distance between the two lines in millimeters.</li>
            <li>Measure all ten fingers, as left and right hands often differ.</li>
          </ul>
        </div>
      </>
    ),
  },
  {
    question: "How long do the press-on nails last?",
    answer: (
      <p>
        With proper prep and our premium nail glue, they can last up to <strong>2-3 months</strong>.
        Using sticky tabs, they will last <strong>1-3 weeks</strong>, which is perfect for weekend
        events or weddings. Longevity depends on your daily activities and prep ritual after applying.
      </p>
    ),
  },
  {
    question: "Are they reusable?",
    answer: (
      <p>
        <strong>Yes!</strong> Our handcrafted press-on nails are highly durable and reusable. If you
        use sticky tabs, simply peel them off after wear. If using liquid glue, carefully buff away the
        dried glue residue from the back of the nail tip before storing or reapplying.
      </p>
    ),
  },
];

const ORDER_ITEMS: FaqItem[] = [
  {
    question: "What payment methods do you accept?",
    answer: (
      <p>
        We accept secure online payments via <strong>bKash</strong>, <strong>Nagad</strong>, and
        debit/credit cards via SSLCOMMERZ. All orders are paid in full at checkout — we do not offer
        Cash on Delivery.
      </p>
    ),
  },
  {
    question: "Can I customize a set?",
    answer: (
      <p>
        <strong>Absolutely!</strong> Send us your reference photo on WhatsApp or our official social
        media pages, and our Dhaka nail artists will recreate it for you.
        <br />
        <span className="mt-2 block text-clay-deep font-medium">
          Note: Customizable bespoke orders require full advance payment, and handcrafting +
          delivery takes approximately 3 weeks.
        </span>
      </p>
    ),
  },
];

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I know my nail size?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Measure your nails using clear tape, a pen, and a millimeter ruler across the widest part of each nail bed. Measure all ten fingers as left and right hands differ.",
      },
    },
    {
      "@type": "Question",
      name: "How long do the press-on nails last?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "With proper nail preparation and liquid glue, Livra press-on nails last up to 2-3 months. Using sticky tabs, they last 1-3 weeks.",
      },
    },
    {
      "@type": "Question",
      name: "Are they reusable?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes! Handcrafted Livra press-on nails are durable and reusable. Peel off adhesive tabs or gently buff away dry liquid glue residue from the back before reapplying.",
      },
    },
    {
      "@type": "Question",
      name: "What payment methods do you accept?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We accept bKash, Nagad, and credit/debit card payments via SSLCOMMERZ. All orders are paid in full at checkout; Cash on Delivery is not available.",
      },
    },
    {
      "@type": "Question",
      name: "Can I customize a set?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes! Send a reference design to our WhatsApp or social channels. Custom bespoke sets take 3 weeks to create and deliver, and require full advance payment.",
      },
    },
  ],
};

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }}
      />

      <div className="mx-auto max-w-[1440px] px-5 py-14 md:px-10 md:py-24">
        {/* Header */}
        <header className="max-w-3xl">
          <Reveal>
            <h1 className="headline text-5xl md:text-7xl">
              Frequently Asked <em>Questions</em>
            </h1>
          </Reveal>
          <Reveal delay={1}>
            <p className="mt-6 text-base md:text-lg text-taupe leading-relaxed">
              Everything you need to know about measuring, wearing, caring for, and ordering your
              handcrafted Livra press-on nails.
            </p>
          </Reveal>
        </header>

        {/* Content sections */}
        <div className="mt-16 grid gap-16 lg:grid-cols-[1fr_360px] lg:gap-20">
          <div className="space-y-16">
            {/* Section 1 */}
            <section id="sizing" className="scroll-mt-24">
              <Reveal>
                <div className="mb-6 flex items-baseline justify-between border-b border-line pb-3">
                  <h2 className="headline text-2xl md:text-3xl">Sizing &amp; Application</h2>
                  <span className="font-serif text-sm italic text-clay">01</span>
                </div>
              </Reveal>
              <Reveal delay={1}>
                <FaqAccordion items={SIZING_ITEMS} defaultIndex={0} />
              </Reveal>
            </section>

            {/* Section 2 */}
            <section id="orders" className="scroll-mt-24">
              <Reveal>
                <div className="mb-6 flex items-baseline justify-between border-b border-line pb-3">
                  <h2 className="headline text-2xl md:text-3xl">Orders &amp; Shipping</h2>
                  <span className="font-serif text-sm italic text-clay">02</span>
                </div>
              </Reveal>
              <Reveal delay={1}>
                <FaqAccordion items={ORDER_ITEMS} defaultIndex={0} />
              </Reveal>
            </section>
          </div>

          {/* Sidebar Assistance Card */}
          <aside className="h-fit space-y-8 lg:sticky lg:top-28">
            <Reveal delay={2}>
              <div className="border border-line bg-cream p-8">
                <h3 className="headline text-2xl">Need custom advice?</h3>
                <p className="mt-3 text-sm text-taupe leading-relaxed">
                  Unsure about your sizing or need help picking the right shape for your hand? Our
                  nail artists are here to assist.
                </p>
                <div className="mt-6 space-y-3">
                  <a
                    href="https://wa.me/8801577759518"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full border border-ink bg-ink py-3 text-center text-xs tracking-wider uppercase text-cream transition-colors duration-300 hover:bg-clay-deep hover:border-clay-deep"
                  >
                    Chat on WhatsApp
                  </a>
                  <Link
                    href="/shop"
                    className="block w-full border border-line py-3 text-center text-xs tracking-wider uppercase text-ink transition-colors duration-300 hover:border-ink hover:bg-bone"
                  >
                    Browse Collections
                  </Link>
                </div>
              </div>
            </Reveal>

            <Reveal delay={3}>
              <div className="border border-line bg-sand/40 p-6 text-xs text-taupe space-y-2">
                <p className="font-medium text-ink">Related Guides</p>
                <ul className="space-y-1.5 underline-offset-4">
                  <li>
                    <Link href="/shipping" className="hover:text-ink hover:underline">
                      Shipping Rates &amp; Timelines →
                    </Link>
                  </li>
                  <li>
                    <Link href="/returns" className="hover:text-ink hover:underline">
                      Return &amp; Refund Policy →
                    </Link>
                  </li>
                  <li>
                    <Link href="/#ritual" className="hover:text-ink hover:underline">
                      The 10-Minute Application Ritual →
                    </Link>
                  </li>
                </ul>
              </div>
            </Reveal>
          </aside>
        </div>
      </div>
    </>
  );
}

