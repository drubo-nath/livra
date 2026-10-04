import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Return & Refund Policy | LIVRA",
  description:
    "Understand Livra's return conditions, mandatory unboxing video requirements, non-returnable hygiene items, bKash/Nagad refund procedures, and cancellation terms.",
  alternates: {
    canonical: "/returns",
  },
  openGraph: {
    title: "Return & Refund Policy | LIVRA",
    description:
      "Handcrafted press-on nails return & refund terms. Hygiene protocols, unboxing video requirement, and bKash/Nagad refund disbursement.",
    url: "https://www.livrapressons.com/returns",
  },
};

export default function ReturnsPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-5 py-14 md:px-10 md:py-24">
      {/* Header */}
      <header className="max-w-3xl">
        <Reveal>
          <h1 className="headline text-5xl md:text-7xl">
            Return &amp; <em>Refund Policy</em>
          </h1>
        </Reveal>
        <Reveal delay={2}>
          <p className="mt-6 text-base md:text-lg text-taupe leading-relaxed">
            At Livra Pressed Ons, we take pride in delivering premium, handcrafted press-on nails.
            Because our products fall under the beauty and personal care category, strict hygiene
            protocols must be maintained. This policy ensures transparency, safety, and satisfaction
            for all customers across Bangladesh.
          </p>
        </Reveal>
      </header>

      {/* Mandatory Unboxing Video Alert */}
      <Reveal delay={2} className="mt-12">
        <div className="border-l-4 border-clay bg-cream p-6 md:p-8 shadow-xs">
          <div className="flex items-start gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-clay text-cream text-sm font-serif">
              !
            </span>
            <div>
              <h2 className="headline text-2xl text-ink">Mandatory Unboxing Video</h2>
              <p className="mt-2 text-sm text-taupe leading-relaxed">
                To be eligible for a return, replacement, or refund, an{" "}
                <strong className="text-ink">unedited unboxing video is absolutely mandatory</strong>.
                The video must clearly show the parcel being opened from its original sealed courier
                packaging, highlighting the shipping label, and demonstrating the defect or incorrect
                item. <span className="text-clay-deep font-medium">Without this proof, we cannot process any claims.</span>
              </p>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Sections Grid */}
      <div className="mt-16 grid gap-16 lg:grid-cols-[1fr_320px] lg:gap-20">
        <div className="space-y-16">
          {/* Section 1 */}
          <section className="border-t border-line pt-8">
            <Reveal>
              <div className="flex items-baseline gap-4 mb-4">
                <span className="font-serif text-sm italic text-clay">01</span>
                <h2 className="headline text-2xl md:text-3xl">Conditions for Return &amp; Exchange</h2>
              </div>
              <div className="text-[15px] leading-relaxed text-taupe pl-8 md:pl-9 space-y-4">
                <p>We accept returns or exchanges strictly under the following circumstances:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>
                    <strong className="text-ink">Wrong Item Received:</strong> You received a design,
                    shape, or length completely different from your confirmed invoice.
                  </li>
                  <li>
                    <strong className="text-ink">Defective or Damaged Product:</strong> The nails
                    arrived physically damaged, broken, or with missing pieces directly out of the
                    delivery box.
                  </li>
                </ul>
                <div className="mt-4 rounded-sm bg-sand/30 p-4 border border-line text-xs text-taupe italic">
                  Note: Because each set is intricately handcrafted, very minor variations in color or
                  gem placement from reference photos are normal and do not qualify as defects.
                </div>
              </div>
            </Reveal>
          </section>

          {/* Section 2 */}
          <section className="border-t border-line pt-8">
            <Reveal>
              <div className="flex items-baseline gap-4 mb-4">
                <span className="font-serif text-sm italic text-clay">02</span>
                <h2 className="headline text-2xl md:text-3xl">Non-Returnable Items</h2>
              </div>
              <div className="text-[15px] leading-relaxed text-taupe pl-8 md:pl-9 space-y-4">
                <p>
                  For sanitary and hygiene reasons, we cannot accept returns or offer refunds for the
                  following:
                </p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Nails that have been worn, applied, or physically altered (e.g., filed, trimmed, or glued).</li>
                  <li>Sets returned without their original box, glue, cuticle pushers, or prep pads.</li>
                  <li>
                    <strong className="text-ink">Incorrect Sizing:</strong> Customers are solely
                    responsible for measuring their nail sizes correctly using our sizing guide before
                    placing an order. We do not offer refunds or exchanges if the press-on nails do not
                    fit due to inaccurate measurements provided by the customer.
                  </li>
                  <li>Items purchased on discount, clearance sales, or special promotional campaigns.</li>
                </ul>
              </div>
            </Reveal>
          </section>

          {/* Section 3 */}
          <section className="border-t border-line pt-8">
            <Reveal>
              <div className="flex items-baseline gap-4 mb-4">
                <span className="font-serif text-sm italic text-clay">03</span>
                <h2 className="headline text-2xl md:text-3xl">How to Request a Return</h2>
              </div>
              <div className="text-[15px] leading-relaxed text-taupe pl-8 md:pl-9 space-y-4">
                <p>
                  If your issue meets the conditions above, please initiate a request within{" "}
                  <strong className="text-ink">24 hours of receiving your parcel</strong>:
                </p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    Contact our customer support team via our official social media pages, WhatsApp (
                    <a href="https://wa.me/8801577759518" className="text-clay underline">
                      +8801577-759518
                    </a>
                    ), or through www.livrapressons.com.
                  </li>
                  <li>Provide your Order ID, full name, and phone number.</li>
                  <li>Attach the clear, uncut unboxing video and photos of the affected product.</li>
                </ol>
                <p className="text-sm bg-cream p-4 border border-line">
                  Once verified by our team, we will guide you through the return process. For
                  customers inside Dhaka, we may arrange a reverse pickup. For customers outside
                  Dhaka, you may be required to drop off the parcel at the nearest courier hub (e.g.,
                  Pathao, RedX, Steadfast).
                </p>
              </div>
            </Reveal>
          </section>

          {/* Section 4 */}
          <section className="border-t border-line pt-8">
            <Reveal>
              <div className="flex items-baseline gap-4 mb-4">
                <span className="font-serif text-sm italic text-clay">04</span>
                <h2 className="headline text-2xl md:text-3xl">Refund Policy</h2>
              </div>
              <div className="text-[15px] leading-relaxed text-taupe pl-8 md:pl-9 space-y-4">
                <ul className="list-disc list-inside space-y-2.5">
                  <li>
                    <strong className="text-ink">Processing Time:</strong> Once we receive and inspect
                    the returned item, we will notify you of the approval or rejection of your refund.
                    Approved refunds are disbursed within <strong>3 to 5 business days</strong>.
                  </li>
                  <li>
                    <strong className="text-ink">Refund Methods:</strong> Refunds will be securely
                    issued via Mobile Financial Services (<strong className="text-ink">bKash or Nagad</strong>)
                    or Direct Bank Transfer within Bangladesh.
                  </li>
                  <li>
                    <strong className="text-ink">Delivery Charges:</strong> Courier delivery charges (both
                    initial shipping and return shipping) are strictly non-refundable. The cost of return
                    shipping will be deducted from your refund total, unless the error was entirely on
                    our part (e.g., we sent the wrong item).
                  </li>
                  <li>
                    <strong className="text-ink">Advance Payments:</strong> For custom orders that
                    require partial or full advance payment, the advance is non-refundable if the order
                    is canceled by the customer after production has commenced.
                  </li>
                </ul>
              </div>
            </Reveal>
          </section>

          {/* Section 5 */}
          <section className="border-t border-line pt-8">
            <Reveal>
              <div className="flex items-baseline gap-4 mb-4">
                <span className="font-serif text-sm italic text-clay">05</span>
                <h2 className="headline text-2xl md:text-3xl">Order Cancellations &amp; Failed Deliveries</h2>
              </div>
              <div className="text-[15px] leading-relaxed text-taupe pl-8 md:pl-9 space-y-4">
                <p>
                  Orders can only be canceled <strong>before they are dispatched</strong> to the courier.
                  If a parcel has already been handed over to the delivery rider, cancellation is no
                  longer possible.
                </p>
              </div>
            </Reveal>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="h-fit space-y-6 lg:sticky lg:top-28">
          <div className="border border-line bg-cream p-6">
            <p className="font-serif text-sm italic text-clay mb-2">Need to initiate a return?</p>
            <h3 className="headline text-2xl mb-3">Within 24 Hours</h3>
            <p className="text-xs text-taupe leading-relaxed mb-6">
              Have your Order ID and uncut unboxing video ready when messaging our team.
            </p>
            <a
              href="https://wa.me/8801577759518"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full border border-ink bg-ink py-3 text-center text-xs tracking-wider uppercase text-cream transition-colors duration-300 hover:bg-clay-deep hover:border-clay-deep"
            >
              Message Support
            </a>
          </div>

          <div className="border border-line bg-sand/30 p-6 text-xs text-taupe space-y-2">
            <p className="font-medium text-ink">Related Links</p>
            <ul className="space-y-1.5">
              <li>
                <Link href="/shipping" className="hover:text-ink hover:underline">
                  Shipping &amp; Delivery →
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-ink hover:underline">
                  Sizing Guide &amp; FAQs →
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-ink hover:underline">
                  Terms &amp; Conditions →
                </Link>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

