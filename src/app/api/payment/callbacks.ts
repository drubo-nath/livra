/**
 * Colocated helper for the SSLCommerz callback routes. Not a route itself.
 * The gateway POSTs form-encoded transaction data (success/fail/cancel/IPN).
 */
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
