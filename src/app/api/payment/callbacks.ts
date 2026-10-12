/**
 * Colocated helper for the SSLCommerz callback routes. Not a route itself.
 * The gateway POSTs form-encoded transaction data (success/fail/cancel/IPN).
 */
import { arcjetDeniedResponse } from "@/lib/arcjet";
import type { ArcjetDecision } from "@arcjet/next";

/**
 * Standard Arcjet guard for a callback route: deny early (429/403) when a
 * decision is enforced, otherwise continue. Never throws — a failing Arcjet
 * decision (no key / API unreachable) fails open by design.
 */
export async function arcjetGuard(
  request: Request,
  client: { protect(request: Request): Promise<ArcjetDecision> },
): Promise<Response | null> {
  let decision: ArcjetDecision;
  try {
    decision = await client.protect(request);
  } catch (e) {
    console.error("[payment] Arcjet guard error:", e);
    return null;
  }
  if (decision.isDenied()) {
    console.warn("[payment] request denied by Arcjet:", decision.reason);
    return arcjetDeniedResponse(decision);
  }
  return null;
}

export async function formToRecord(
  request: Request,
): Promise<Record<string, string>> {
  try {
    const form = await request.formData();
    const record: Record<string, string> = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") record[key] = value;
    }
    return record;
  } catch (e) {
    console.error("[payment] failed to parse gateway callback body:", e);
    return {};
  }
}

export function resultUrl(
  origin: string,
  status: "success" | "pending" | "fail" | "cancel",
  order: string | undefined,
): URL {
  const url = new URL("/payment/result", origin);
  url.searchParams.set("status", status);
  if (order) url.searchParams.set("order", order);
  return url;
}
