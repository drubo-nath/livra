"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
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
  FREE_SHIPPING_THRESHOLD,
} from "@/lib/format";
import { formatPhone, normalizeBDPhone } from "@/lib/phone";
import Swatch from "@/components/Swatch";
import PhoneVerify from "@/components/auth/PhoneVerify";
import { EASE } from "@/components/motion/Reveal";
import { trackPurchase } from "@/lib/analytics";
import { finishDisplayLabels, type Finish } from "@/db/types";
import { Check, ShieldCheck, Loader2 } from "lucide-react";

const PAYMENTS = [
  { id: "cod", label: "Cash on Delivery" },
  { id: "bkash", label: "bKash" },
  { id: "nagad", label: "Nagad" },
  { id: "card", label: "Card" },
] as const;

export default function CheckoutPage() {
  const { lines, subtotal, clear } = useCart();
  const { data: session, isPending } = authClient.useSession();
  const [placed, setPlaced] = useState<OrderResult | null>(null);
  const [payment, setPayment] = useState<(typeof PAYMENTS)[number]["id"]>("cod");
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
      <section className="mx-auto flex min-h-[70vh] max-w-[1440px] flex-col items-center justify-center px-5 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: EASE }}
          className="w-full max-w-md"
        >
          <h1 className="headline text-6xl md:text-8xl">
            Dhonnobad<em>.</em>
          </h1>
          <p className="font-serif text-sm tracking-wider mt-6 text-taupe">
            Order <span className="font-numeric font-semibold text-ink">{placed.orderNumber}</span> ·{" "}
            <span className="font-numeric font-semibold text-ink">{formatBDT(placed.total)}</span>
          </p>
          <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-taupe">
            Your order is with our Dhaka atelier. We&apos;ll confirm by SMS and
            ship within 24 hours.
          </p>
          <Link
            href="/shop"
            className="font-serif text-xs uppercase tracking-widest mt-10 inline-block bg-ink px-10 py-4.5 text-cream transition-colors duration-300 hover:bg-clay-deep"
          >
            Continue Shopping
          </Link>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 md:px-10 md:py-20">
      <h1 className="headline text-4xl sm:text-5xl md:text-7xl">
        Check<em>out</em>
      </h1>

      <div className="mt-8 grid gap-10 sm:mt-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
        <div className="order-2 space-y-8 md:space-y-10 lg:order-1">
          {/* Step 1 — phone verification */}
          {!isPending && !verified && <PhoneVerify />}
          {!isPending && verified && (
            <div className="hairline border bg-cream p-5 sm:p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-taupe font-medium">
                  Delivery Contact Number
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-medium tracking-wide text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="h-3 w-3" /> Account Active
                </span>
              </div>

              {/* Delivery Number Selection */}
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setUseAlternatePhone(false);
                    setOtpError(null);
                  }}
                  className={`p-4 text-left border transition-all cursor-pointer ${
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
                  <p className="mt-2 font-numeric text-base font-semibold text-ink">
                    {formatPhone(session?.user.phoneNumber)}
                  </p>
                  <p className="mt-1 text-[11px] text-taupe">
                    Pre-verified account number
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUseAlternatePhone(true);
                  }}
                  className={`p-4 text-left border transition-all cursor-pointer ${
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
                  <p className="mt-2 font-numeric text-base font-semibold text-ink">
                    {phoneVerificationToken && verifiedRecipientPhone
                      ? formatPhone(verifiedRecipientPhone)
                      : "Deliver to alternate number"}
                  </p>
                  <p className="mt-1 text-[11px] text-taupe">
                    Requires 6-digit OTP verification
                  </p>
                </button>
              </div>

              {/* If alternate phone selected */}
              {useAlternatePhone && (
                <div className="pt-2 border-t border-line/60">
                  {phoneVerificationToken && verifiedRecipientPhone ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50/70 p-4">
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
                            className="font-numeric hairline min-w-0 flex-1 border bg-white px-4 py-3.5 text-sm outline-none transition-colors placeholder:text-taupe/60 focus:border-ink"
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
                              className="font-numeric hairline min-w-0 flex-1 border bg-white px-4 py-3.5 text-sm outline-none tracking-widest transition-colors placeholder:tracking-normal placeholder:text-taupe/60 focus:border-ink font-semibold"
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
                } else setError(res.error);
                setPlaced(res);
              });
            }}
            className="space-y-8 sm:space-y-10"
          >
            <fieldset disabled={!verified} className="disabled:opacity-50">
              <legend className="text-xs uppercase tracking-widest text-taupe font-medium">Delivery</legend>
              <div className="mt-4 grid gap-3.5 sm:grid-cols-2 sm:gap-4">
                <Field
                  label="Full name"
                  name="name"
                  placeholder={session?.user.name || "Ayesha Rahman"}
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
              <legend className="text-xs uppercase tracking-widest text-taupe font-medium">Payment</legend>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                {PAYMENTS.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setPayment(p.id)}
                    className={
                      payment === p.id
                        ? "text-xs uppercase tracking-wider font-medium border border-ink bg-ink px-4 py-3.5 text-left text-cream transition-colors sm:px-5 sm:py-4"
                        : "text-xs uppercase tracking-wider font-medium hairline border bg-transparent px-4 py-3.5 text-left text-taupe transition-colors hover:border-ink hover:text-ink sm:px-5 sm:py-4"
                    }
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </fieldset>

            {error && (
              <p className="border border-clay/40 bg-clay/5 px-4 py-3 text-sm text-clay-deep">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending || lines.length === 0 || !verified || isAlternateUnverified}
              className="w-full bg-ink px-4 py-4.5 text-center text-xs tracking-wider uppercase text-cream transition-colors duration-300 hover:bg-clay-deep disabled:cursor-not-allowed disabled:opacity-40 sm:py-5 sm:text-sm font-medium cursor-pointer"
            >
              {pending ? (
                "Placing order…"
              ) : lines.length === 0 ? (
                "Your bag is empty"
              ) : !verified ? (
                "Verify your number to continue"
              ) : isAlternateUnverified ? (
                "Verify recipient number to continue"
              ) : (
                <span>
                  Place Order — <span className="font-numeric font-semibold">{formatBDT(total)}</span>
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Summary */}
        <aside className="hairline order-1 h-fit border bg-cream p-5 sm:p-6 md:p-8 lg:order-2 lg:sticky lg:top-24">
          <p className="text-xs uppercase tracking-widest text-taupe font-medium">Order Summary</p>
          <ul className="mt-5 space-y-4 sm:mt-6 sm:space-y-5">
            {lines.map((l) => (
              <li key={`${l.slug}-${l.size}`} className="flex items-center gap-3.5 sm:gap-4">
                <Swatch
                  tones={l.tones}
                  imageUrl={l.imageUrl}
                  className="h-14 w-12 shrink-0 sm:h-16 sm:w-14"
                  variant="thumb"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-sm sm:text-base">{l.name}</p>
                  <p className="text-xs text-taupe">
                    {(l.finish && finishDisplayLabels[l.finish as Finish]) || l.finish} · {l.size} · Qty{" "}
                    <span className="font-numeric font-medium text-ink">{l.qty}</span>
                  </p>
                </div>
                <p className="text-xs shrink-0 font-medium sm:text-sm font-numeric">
                  {formatBDT(l.price * l.qty)}
                </p>
              </li>
            ))}
            {lines.length === 0 && (
              <li className="text-sm text-taupe">
                Nothing here yet —{" "}
                <Link href="/shop" className="link-sweep text-ink">
                  browse shades
                </Link>
                .
              </li>
            )}
          </ul>
          <div className="hairline mt-6 space-y-2.5 border-t pt-6 text-sm">
            <Row label="Subtotal" value={formatBDT(subtotal)} />
            <Row label="Delivery" value={shipping === 0 ? "Free" : formatBDT(shipping)} />
            {shipping > 0 && subtotal > 0 && (
              <p className="text-xs text-taupe">
                Add <span className="font-numeric">{formatBDT(FREE_SHIPPING_THRESHOLD - subtotal)}</span> more for free delivery
              </p>
            )}
            <div className="hairline flex items-center justify-between border-t pt-3">
              <p className="text-xs uppercase tracking-widest text-taupe font-medium">Total</p>
              <p className="font-numeric text-xl sm:text-2xl font-semibold">{formatBDT(total)}</p>
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
      <span className="text-[10px] uppercase tracking-wider text-taupe font-medium">{label}</span>
      <input
        {...props}
        className="hairline mt-1.5 w-full border bg-transparent px-4 py-3.5 text-sm outline-none transition-colors placeholder:text-taupe/60 focus:border-ink"
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
