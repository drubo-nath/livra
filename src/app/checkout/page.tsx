"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { authClient } from "@/lib/auth-client";
import { useCart } from "@/components/cart/CartProvider";
import { placeOrder, type OrderResult } from "@/lib/actions/orders";
import {
  sendOrderOtpAction,
  verifyOrderOtpAction,
} from "@/lib/actions/phone-verify";
import {
  formatBDT,
  shippingFeeFor,
} from "@/lib/format";
import { formatPhone, normalizeBDPhone } from "@/lib/phone";
import Swatch from "@/components/Swatch";
import PhoneVerify from "@/components/auth/PhoneVerify";
import { EASE } from "@/components/motion/Reveal";
import { trackPurchase } from "@/lib/analytics";
import { finishDisplayLabels, type Finish } from "@/db/types";
import { Check, ShieldCheck, Loader2, ShoppingBag, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const PAYMENTS = [
  { id: "sslcommerz", label: "SSLCommerz" },
] as const;

export default function CheckoutPage() {
  const { lines, subtotal, clear } = useCart();
  const { data: session, isPending } = authClient.useSession();
  const [placed, setPlaced] = useState<OrderResult | null>(null);
  const [payment, setPayment] = useState<(typeof PAYMENTS)[number]["id"]>("sslcommerz");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Alternate recipient phone state
  const [useAlternatePhone, setUseAlternatePhone] = useState(false);
  const [alternatePhone, setAlternatePhone] = useState("");
  const [otpStep, setOtpStep] = useState<"phone" | "code">("phone");
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [phoneVerificationToken, setPhoneVerificationToken] = useState<string | null>(null);
  const [verifiedRecipientPhone, setVerifiedRecipientPhone] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  const verified = Boolean(session?.user.phoneNumberVerified);
  const isAlternateUnverified =
    useAlternatePhone && (!phoneVerificationToken || !verifiedRecipientPhone);
  const shipping = shippingFeeFor(subtotal);
  const total = subtotal + shipping;

  const handleSendAlternateOtp = async () => {
    setOtpError(null);
    const normalized = normalizeBDPhone(alternatePhone);
    if (!normalized) {
      setOtpError("Enter a valid Bangladeshi mobile number (01XXXXXXXXX).");
      return;
    }
    setOtpBusy(true);
    const res = await sendOrderOtpAction(alternatePhone);
    setOtpBusy(false);
    if (!res.ok) {
      setOtpError(res.error || "Could not send verification code.");
      return;
    }
    setOtpStep("code");
  };

  const handleVerifyAlternateOtp = async () => {
    setOtpError(null);
    const cleanCode = otpCode.trim().replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      setOtpError("Please enter the complete 6-digit code.");
      return;
    }
    setOtpBusy(true);
    const res = await verifyOrderOtpAction(alternatePhone, cleanCode);
    setOtpBusy(false);
    if (!res.ok || !res.token) {
      setOtpError(res.error || "Verification failed. Please check the code.");
      return;
    }
    setPhoneVerificationToken(res.token);
    setVerifiedRecipientPhone(res.phone || normalizeBDPhone(alternatePhone));
    setOtpError(null);
  };

  const handleAlternatePhoneChange = (val: string) => {
    setAlternatePhone(val);
    setOtpError(null);
    if (phoneVerificationToken) {
      setPhoneVerificationToken(null);
      setVerifiedRecipientPhone(null);
      setOtpStep("phone");
    }
  };

  if (placed?.ok) {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-[1440px] flex-col items-center justify-center px-4 py-16 sm:px-5 sm:py-24 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: EASE }}
          className="w-full max-w-md"
        >
          <h1 className="headline text-5xl sm:text-7xl md:text-8xl">
            Dhonnobad<em>.</em>
          </h1>
          <p className="font-serif text-sm tracking-wider mt-4 sm:mt-6 text-taupe">
            Order <span className="font-numeric font-semibold text-ink">{placed.orderNumber}</span> ·{" "}
            <span className="font-numeric font-semibold text-ink">{formatBDT(placed.total)}</span>
          </p>
          <p className="mx-auto mt-4 sm:mt-6 max-w-md text-sm sm:text-[15px] leading-relaxed text-taupe">
            Your order is with our Dhaka atelier. We&apos;ll confirm by SMS and
            ship within 24 hours.
          </p>
          <Link
            href="/shop"
            className="font-serif text-xs uppercase tracking-widest mt-8 sm:mt-10 inline-block bg-ink px-8 py-4 sm:px-10 sm:py-4.5 text-cream transition-colors duration-300 hover:bg-clay-deep"
          >
            Continue Shopping
          </Link>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 md:px-10 sm:py-12 md:py-20">
      <h1 className="headline text-3xl sm:text-5xl md:text-7xl">
        Check<em>out</em>
      </h1>

      <div className="mt-6 sm:mt-10 grid gap-6 sm:gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
        <div className="order-2 space-y-6 sm:space-y-8 md:space-y-10 lg:order-1">
          {/* Step 1 — phone verification */}
          {!isPending && !verified && <PhoneVerify />}
          {!isPending && verified && (
            <div className="hairline border bg-cream p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs uppercase tracking-widest text-taupe font-medium">
                  Delivery Contact Number
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-medium tracking-wide text-emerald-700 border border-emerald-200 shrink-0">
                  <ShieldCheck className="h-3 w-3" /> Account Active
                </span>
              </div>

              {/* Delivery Number Selection */}
              <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setUseAlternatePhone(false);
                    setOtpError(null);
                  }}
                  className={`p-3.5 sm:p-4 text-left border transition-all cursor-pointer ${
                    !useAlternatePhone
                      ? "border-ink bg-white shadow-xs"
                      : "border-line/70 bg-sand/15 hover:border-ink/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink">
                      My Account Number
                    </span>
                    {!useAlternatePhone && (
                      <span className="h-2 w-2 rounded-full bg-ink" />
                    )}
                  </div>
                  <p className="mt-1.5 sm:mt-2 font-numeric text-sm sm:text-base font-semibold text-ink">
                    {formatPhone(session?.user.phoneNumber)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-taupe">
                    Pre-verified account number
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUseAlternatePhone(true);
                  }}
                  className={`p-3.5 sm:p-4 text-left border transition-all cursor-pointer ${
                    useAlternatePhone
                      ? "border-ink bg-white shadow-xs"
                      : "border-line/70 bg-sand/15 hover:border-ink/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink">
                      Different Mobile Number
                    </span>
                    {useAlternatePhone && (
                      <span className="h-2 w-2 rounded-full bg-ink" />
                    )}
                  </div>
                  <p className="mt-1.5 sm:mt-2 font-numeric text-sm sm:text-base font-semibold text-ink truncate">
                    {phoneVerificationToken && verifiedRecipientPhone
                      ? formatPhone(verifiedRecipientPhone)
                      : "Deliver to alternate number"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-taupe">
                    Requires 6-digit OTP verification
                  </p>
                </button>
              </div>

              {/* If alternate phone selected */}
              {useAlternatePhone && (
                <div className="pt-2 border-t border-line/60">
                  {phoneVerificationToken && verifiedRecipientPhone ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50/70 p-3.5 sm:p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs shrink-0">
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-900">
                            Recipient Number Verified
                          </p>
                          <p className="font-numeric text-sm font-semibold text-emerald-800">
                            {formatPhone(verifiedRecipientPhone)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPhoneVerificationToken(null);
                          setVerifiedRecipientPhone(null);
                          setOtpStep("phone");
                          setOtpCode("");
                        }}
                        className="text-xs font-medium text-emerald-800 underline hover:text-emerald-950 self-start sm:self-auto cursor-pointer"
                      >
                        Change number
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold uppercase tracking-wider text-ink">
                          Alternate Mobile Number
                        </label>
                        {otpStep === "code" && (
                          <button
                            type="button"
                            onClick={() => {
                              setOtpStep("phone");
                              setOtpError(null);
                            }}
                            className="text-xs text-taupe underline hover:text-ink cursor-pointer"
                          >
                            Change number
                          </button>
                        )}
                      </div>

                      {otpStep === "phone" ? (
                        <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-2">
                          <input
                            type="tel"
                            value={alternatePhone}
                            onChange={(e) => handleAlternatePhoneChange(e.target.value)}
                            placeholder="01XXXXXXXXX"
                            className="font-numeric hairline min-w-0 flex-1 border bg-white px-3.5 sm:px-4 py-3 sm:py-3.5 text-base sm:text-sm outline-none transition-colors placeholder:text-taupe/60 focus:border-ink rounded-none"
                          />
                          <button
                            type="button"
                            onClick={handleSendAlternateOtp}
                            disabled={otpBusy || !alternatePhone.trim()}
                            className="text-xs uppercase tracking-wider font-semibold shrink-0 bg-ink px-6 py-3.5 text-cream transition-colors hover:bg-clay-deep disabled:opacity-40 sm:py-0 cursor-pointer flex items-center justify-center gap-2"
                          >
                            {otpBusy ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Sending…</span>
                              </>
                            ) : (
                              <span>Send OTP</span>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          <p className="text-xs text-taupe">
                            Enter the 6-digit verification code sent to{" "}
                            <span className="font-numeric font-semibold text-ink">
                              {alternatePhone}
                            </span>
                          </p>
                          <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-2">
                            <input
                              type="text"
                              maxLength={6}
                              value={otpCode}
                              onChange={(e) => {
                                setOtpCode(e.target.value.replace(/\D/g, ""));
                                setOtpError(null);
                              }}
                              placeholder="6-digit code"
                              className="font-numeric hairline min-w-0 flex-1 border bg-white px-3.5 sm:px-4 py-3 sm:py-3.5 text-base sm:text-sm outline-none tracking-widest transition-colors placeholder:tracking-normal placeholder:text-taupe/60 focus:border-ink font-semibold rounded-none text-center sm:text-left"
                            />
                            <button
                              type="button"
                              onClick={handleVerifyAlternateOtp}
                              disabled={otpBusy || otpCode.trim().length !== 6}
                              className="text-xs uppercase tracking-wider font-semibold shrink-0 bg-ink px-6 py-3.5 text-cream transition-colors hover:bg-clay-deep disabled:opacity-40 sm:py-0 cursor-pointer flex items-center justify-center gap-2"
                            >
                              {otpBusy ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  <span>Verifying…</span>
                                </>
                              ) : (
                                <span>Verify Code</span>
                              )}
                            </button>
                          </div>
                          <div className="flex items-center justify-between text-xs text-taupe pt-1">
                            <span>Didn&apos;t receive code?</span>
                            <button
                              type="button"
                              onClick={handleSendAlternateOtp}
                              disabled={otpBusy}
                              className="font-medium text-ink underline hover:text-clay disabled:opacity-40 cursor-pointer"
                            >
                              Resend OTP
                            </button>
                          </div>
                        </div>
                      )}

                      {otpError && (
                        <p className="border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                          {otpError}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              if (!verified) {
                setError("Verify your phone number first.");
                return;
              }
              if (useAlternatePhone && (!phoneVerificationToken || !verifiedRecipientPhone)) {
                setError("Please verify the alternate delivery phone number via OTP before confirming your order.");
                return;
              }
              if (!termsAccepted) {
                setError("Please agree to the Terms & Conditions, Privacy Policy, and Return & Cancellation Policy to proceed.");
                return;
              }
              const fd = new FormData(e.currentTarget);
              startTransition(async () => {
                const res = await placeOrder({
                  name: String(fd.get("name") ?? ""),
                  email: String(fd.get("email") ?? ""),
                  address: String(fd.get("address") ?? ""),
                  city: String(fd.get("city") ?? ""),
                  postalCode: String(fd.get("postalCode") ?? ""),
                  recipientPhone: useAlternatePhone ? verifiedRecipientPhone || undefined : undefined,
                  phoneVerificationToken: useAlternatePhone ? phoneVerificationToken || undefined : undefined,
                  paymentMethod: payment,
                  items: lines.map((l) => ({
                    slug: l.slug,
                    size: l.size as "XS" | "S" | "M" | "L",
                    qty: l.qty,
                  })),
                });

                if (res.ok) {
                  trackPurchase({
                    orderId: res.orderNumber,
                    total: res.total,
                    itemsCount: lines.reduce((acc, l) => acc + l.qty, 0),
                  });
                  clear();

                  // Redirect directly to SSLCommerz payment portal
                  if (res.gatewayPageUrl) {
                    window.location.href = res.gatewayPageUrl;
                    return;
                  }
                } else setError(res.error);
                setPlaced(res);
              });
            }}
            className="space-y-6 sm:space-y-10"
          >
            <fieldset disabled={!verified} className="disabled:opacity-50">
              <legend className="text-xs uppercase tracking-widest text-taupe font-medium">Delivery Details</legend>
              <div className="mt-3 sm:mt-4 grid gap-3 sm:gap-4 sm:grid-cols-2">
                <Field
                  label="Full name"
                  name="name"
                  placeholder={session?.user.name || "Write your Name"}
                  defaultValue={session?.user.name !== "Guest" ? session?.user.name : ""}
                  required
                />
                <Field
                  label="Email (optional)"
                  name="email"
                  placeholder="you@email.com"
                  type="email"
                />
                <Field
                  label="Address"
                  name="address"
                  placeholder="House, Road, Area"
                  className="sm:col-span-2"
                  required
                />
                <Field label="City" name="city" placeholder="Dhaka" required />
                <Field label="Postal code" name="postalCode" placeholder="1205" />
              </div>
            </fieldset>

            <fieldset disabled={!verified} className="disabled:opacity-50">
              <legend className="text-xs uppercase tracking-widest text-taupe font-medium">Payment Method</legend>
              <div className="mt-3 sm:mt-4">
                <div className="hairline border border-ink bg-white p-3.5 sm:p-5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="relative h-8 w-28 sm:h-11 sm:w-44 shrink-0">
                      <Image
                        src="/sslcommerz-logo.png"
                        alt="SSLCommerz"
                        fill
                        className="object-contain object-left"
                        priority
                      />
                    </div>
                    <div className="text-xs sm:text-sm text-ink font-medium">
                      SSLCommerz Secure Gateway
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-ink text-cream text-[9px] sm:text-[10px] uppercase font-semibold px-2.5 py-0.5 tracking-wider">
                    Selected
                  </span>
                </div>
              </div>
            </fieldset>

            {error && (
              <p className="border border-clay/40 bg-clay/5 px-4 py-3 text-sm text-clay-deep">
                {error}
              </p>
            )}

            {/* Terms & Conditions Agreement */}
            <label className="flex items-start gap-3 p-3 sm:p-3.5 rounded-lg border border-line/60 bg-sand/15 cursor-pointer select-none group transition-colors hover:border-line">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-ink cursor-pointer border border-line rounded-sm"
              />
              <span className="text-xs leading-relaxed text-taupe group-hover:text-ink transition-colors">
                I have read and agree to the{" "}
                <Link href="/terms" target="_blank" className="text-ink font-medium underline underline-offset-2 hover:text-clay-deep">
                  Terms &amp; Conditions
                </Link>
                ,{" "}
                <Link href="/privacy" target="_blank" className="text-ink font-medium underline underline-offset-2 hover:text-clay-deep">
                  Privacy Policy
                </Link>
                , and{" "}
                <Link href="/returns" target="_blank" className="text-ink font-medium underline underline-offset-2 hover:text-clay-deep">
                  Return &amp; Cancellation Policy
                </Link>
                .
              </span>
            </label>

            <button
              type="submit"
              disabled={pending || lines.length === 0 || !verified || isAlternateUnverified || !termsAccepted}
              className="w-full bg-ink px-4 py-4 text-center text-xs tracking-wider uppercase text-cream transition-colors duration-300 hover:bg-clay-deep disabled:cursor-not-allowed disabled:opacity-40 sm:py-5 sm:text-sm font-semibold cursor-pointer"
            >
              {pending ? (
                "Connecting to SSLCommerz…"
              ) : lines.length === 0 ? (
                "Your bag is empty"
              ) : !verified ? (
                "Verify your number to continue"
              ) : isAlternateUnverified ? (
                "Verify recipient number to continue"
              ) : !termsAccepted ? (
                "Agree to policies to continue"
              ) : (
                <span>
                  Pay with SSLCommerz — <span className="font-numeric font-semibold">{formatBDT(total)}</span>
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Summary */}
        <aside className="hairline order-1 h-fit border border-line/80 bg-cream p-4 sm:p-6 md:p-8 lg:order-2 lg:sticky lg:top-24">
          {/* Summary Toggle for Mobile / Sticky Header for Desktop */}
          <button
            type="button"
            onClick={() => setMobileSummaryOpen((prev) => !prev)}
            className="w-full flex items-center justify-between text-left lg:pointer-events-none cursor-pointer lg:cursor-default"
            aria-expanded={mobileSummaryOpen}
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="size-4 text-clay shrink-0" />
              <span className="text-xs uppercase tracking-widest text-ink font-semibold">
                Order Summary
              </span>
              <span className="rounded-full bg-sand/80 px-2 py-0.5 text-[10px] font-numeric font-medium text-ink">
                {lines.reduce((acc, l) => acc + l.qty, 0)} {lines.reduce((acc, l) => acc + l.qty, 0) === 1 ? "item" : "items"}
              </span>
              <ChevronDown
                className={cn(
                  "size-3.5 text-taupe transition-transform duration-200 lg:hidden",
                  mobileSummaryOpen && "rotate-180"
                )}
              />
            </div>
            <div className="text-right">
              <span className="font-numeric text-base sm:text-lg font-semibold text-ink lg:hidden">
                {formatBDT(total)}
              </span>
            </div>
          </button>

          {/* Collapsible Content on mobile, always visible on desktop */}
          <div className={cn("mt-4 lg:mt-6", mobileSummaryOpen ? "block" : "hidden lg:block")}>
            <ul className="space-y-3 sm:space-y-4 pt-3 border-t border-line/60 lg:border-t-0 lg:pt-0">
              {lines.map((l) => (
                <li key={`${l.slug}-${l.size}`} className="flex items-center gap-3 sm:gap-4">
                  <Swatch
                    tones={l.tones}
                    imageUrl={l.imageUrl}
                    className="h-12 w-11 shrink-0 sm:h-16 sm:w-14"
                    variant="thumb"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-sm sm:text-base text-ink">{l.name}</p>
                    <p className="text-xs text-taupe truncate">
                      {(l.finish && finishDisplayLabels[l.finish as Finish]) || l.finish} · {l.size} · Qty{" "}
                      <span className="font-numeric font-medium text-ink">{l.qty}</span>
                    </p>
                  </div>
                  <p className="text-xs shrink-0 font-medium sm:text-sm font-numeric text-ink">
                    {formatBDT(l.price * l.qty)}
                  </p>
                </li>
              ))}
              {lines.length === 0 && (
                <li className="text-sm text-taupe">
                  Nothing here yet —{" "}
                  <Link href="/shop" className="link-sweep text-ink font-medium">
                    browse shades
                  </Link>
                  .
                </li>
              )}
            </ul>
            <div className="hairline mt-5 sm:mt-6 space-y-2.5 border-t pt-4 sm:pt-6 text-sm">
              <Row label="Subtotal" value={formatBDT(subtotal)} />
              <Row label="Delivery" value="Free" />
              <div className="hairline flex items-center justify-between border-t pt-3">
                <p className="text-xs uppercase tracking-widest text-taupe font-medium">Total</p>
                <p className="font-numeric text-xl sm:text-2xl font-semibold text-ink">{formatBDT(total)}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Field({
  label,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-taupe font-medium">{label}</span>
      <input
        {...props}
        className="hairline mt-1.5 w-full border bg-white sm:bg-transparent px-3.5 sm:px-4 py-3 sm:py-3.5 text-base sm:text-sm outline-none transition-colors placeholder:text-taupe/60 focus:border-ink rounded-none"
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-taupe">{label}</p>
      <p className="font-numeric font-medium text-ink">{value}</p>
    </div>
  );
}
