import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/motion/Reveal";
import { formatBDT } from "@/lib/format";
import { getOrderByTranId } from "@/lib/payments";

export const metadata: Metadata = {
  title: "Payment Result | LIVRA",
  robots: { index: false, follow: false },
};

type ResultStatus = "success" | "pending" | "fail" | "cancel";

const COPY: Record<
  ResultStatus,
  { title: string; em: string; body: string; cta: { label: string; href: string }; cta2?: { label: string; href: string } }
> = {
  success: {
    title: "Dhonnobad",
    em: ".",
    body: "Your payment went through and your order is confirmed. We'll ship within 24 hours and notify you by SMS.",
    cta: { label: "Continue Shopping", href: "/shop" },
  },
  pending: {
    title: "One moment",
    em: ".",
    body: "We received your payment but are still confirming it with the gateway. Your order is safe — we'll update you by SMS shortly.",
    cta: { label: "Continue Shopping", href: "/shop" },
    cta2: { label: "Contact Support", href: "/contact" },
  },
  fail: {
    title: "Payment didn't go through",
    em: ".",
    body: "The bank declined the payment and nothing was charged. Your bag is saved — please try again or use a different payment method.",
    cta: { label: "Back to Checkout", href: "/checkout" },
    cta2: { label: "Contact Support", href: "/contact" },
  },
  cancel: {
    title: "Payment cancelled",
    em: ".",
    body: "You cancelled the payment, so nothing was charged. Your bag is saved whenever you're ready to try again.",
    cta: { label: "Back to Checkout", href: "/checkout" },
    cta2: { label: "Browse Collections", href: "/shop" },
  },
};

export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; order?: string }>;
}) {
  const { status, order } = await searchParams;
  const result: ResultStatus =
    status === "success" || status === "pending" || status === "fail" || status === "cancel"
      ? status
      : "pending";
  const copy = COPY[result];

  // The order number doubles as the gateway tran_id.
  const orderRow = order ? await getOrderByTranId(order).catch(() => null) : null;
  const paid = orderRow?.paymentStatus === "paid";

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-[1440px] flex-col items-center justify-center px-5 py-24 text-center">
      <div className="w-full max-w-md">
        <Reveal>
          <h1 className="headline text-5xl md:text-7xl">
            {copy.title}
            <em>{copy.em}</em>
          </h1>
        </Reveal>

        {order && (
          <p className="font-serif text-sm tracking-wider mt-6 text-taupe">
            Order{" "}
            <span className="font-numeric font-semibold text-ink">{order}</span>
            {orderRow && (
              <>
                {" · "}
                <span className="font-numeric font-semibold text-ink">
                  {formatBDT(orderRow.total)}
                </span>
              </>
            )}
          </p>
        )}

        <Reveal delay={1}>
          <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-taupe">
            {result === "success" && !paid
              ? COPY.pending.body
              : copy.body}
          </p>
        </Reveal>

        <Reveal delay={2}>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={copy.cta.href}
              className="font-serif text-xs uppercase tracking-widest inline-block bg-ink px-10 py-4.5 text-cream transition-colors duration-300 hover:bg-clay-deep"
            >
              {copy.cta.label}
            </Link>
            {copy.cta2 && (
              <Link
                href={copy.cta2.href}
                className="font-serif text-xs uppercase tracking-widest inline-block hairline border px-10 py-4.5 text-ink transition-colors duration-300 hover:border-ink"
              >
                {copy.cta2.label}
              </Link>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
