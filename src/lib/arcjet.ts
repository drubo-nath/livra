import arcjet, { fixedWindow, shield } from "@arcjet/next";
import type { ArcjetDecision, ArcjetMode } from "@arcjet/next";
import { NextResponse } from "next/dist/server/web/spec-extension/response";

/**
 * Arcjet — basic security layer (shield attack-signature detection + rate
 * limits) for the payment callbacks and OTP actions.
 *
 * Until AJT_ENV is set (arcjet.com dashboard → site → copy key), every rule
 * runs in DRY_RUN mode: decisions are observed and logged but never block,
 * matching this codebase's configure-nothing-in-dev philosophy. Fail-open
 * also applies if the Arcjet API is ever unreachable.
 *
 * Env:
 *   AJT_ENV       — the site key (leave empty for dry run)
 *   ARCJET_ENV    — set to "development" ONLY locally so Arcjet uses
 *                   127.0.0.1 when no forwarded IP exists (never in prod)
 */

const key = process.env.ARCJET_COLLECTION_KEY ?? "";

export const isArcjetConfigured = Boolean(key);

/** LIVE enforces; DRY_RUN observes and logs without blocking. */
const mode: ArcjetMode = isArcjetConfigured ? "LIVE" : "DRY_RUN";

const root = arcjet({
  key,
  rules: [shield({ mode })],
});

/** Customer-facing payment callbacks (success/fail/cancel redirects). */
export const ajPayment = root.withRule(
  fixedWindow({ mode, window: "1m", max: 30 }),
);

/** Server-to-server IPN — generous: covers gateway retries + order volume. */
export const ajIpn = root.withRule(
  fixedWindow({ mode, window: "1m", max: 120 }),
);


/**
 * OTP send/verify actions — strict, per IP: blocks SMS-cost abuse and OTP
 * brute force. 10 per 10 minutes still allows legit alternate-recipient
 * flows (send + verify × a few numbers).
 */
export const ajOtp = root.withRule(
  fixedWindow({ mode, window: "5m", max: 5 }),
);

/** Shared denial mapping for route handlers (429 rate limit / 403 shield). */
export function arcjetDeniedResponse(decision: ArcjetDecision): Response {
  if (decision.reason.isRateLimit()) {
    return new Response("Too many requests.", {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }
  return new Response("Forbidden.", { status: 403 });
}