import { createHash } from "node:crypto";

/**
 * SSLCommerz gateway client — official v4 REST API.
 * Docs: https://developer.sslcommerz.com/doc/v4/
 *
 * No SDK dependency on purpose: the official npm packages are stale and
 * the API is a simple form-encoded POST + two GETs, so plain fetch keeps
 * the dependency surface at zero. TLS 1.2+ is required by the gateway.
 */

const STORE_ID = process.env.SSLCOMMERZ_STORE_ID ?? "";
const STORE_PASSWORD = process.env.SSLCOMMERZ_STORE_PASSWORD ?? "";
const MODE = process.env.SSLCOMMERZ_MODE === "live" ? "live" : "sandbox";

export const isSslcommerzConfigured = Boolean(STORE_ID && STORE_PASSWORD);

const BASE_URL =
  MODE === "live"
    ? "https://securepay.sslcommerz.com"
    : "https://sandbox.sslcommerz.com";

/** Create & Get Session (POST, form-encoded). */
const SESSION_API = `${BASE_URL}/gwprocess/v4/api.php`;
/** Order Validation API (GET). */
const VALIDATION_API = `${BASE_URL}/validator/api/validationserverAPI.php`;
/** Transaction Query API (GET) — by tran_id or sessionkey. */
const QUERY_API = `${BASE_URL}/validator/api/merchantTransIDvalidationAPI.php`;

const FETCH_TIMEOUT_MS = 15_000;

/** Whole-taka integer → gateway decimal string, e.g. 1450 → "1450.00". */
export function toGatewayAmount(amountTaka: number): string {
  return Math.round(amountTaka).toFixed(2);
}

/** Gateway amount string → whole-taka integer, e.g. "1450.00" → 1450. */
export function fromGatewayAmount(amount: string | undefined): number | null {
  if (!amount) return null;
  const n = Number.parseFloat(amount);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/* ─── Types (mirroring the official API reference) ─────────────────── */

export type SslczSessionRequest = {
  /** tran_id — unique per order; LIVRA uses the orderNumber. */
  tranId: string;
  /** Whole-taka integer; converted internally to decimal(10,2). */
  totalAmount: number;
  /** ISO-4217. Always BDT for LIVRA. */
  currency: "BDT";
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  /** Server-to-server notification URL (also settable in the panel). */
  ipnUrl?: string;
  cusName: string;
  /** Gateway mandates an email; caller synthesizes a placeholder if empty. */
  cusEmail: string;
  cusAdd1: string;
  cusCity: string;
  cusPostcode?: string;
  cusCountry?: string;
  cusPhone: string;
  productName: string;
  productCategory: string;
  productProfile: "general" | "physical-goods" | "non physical-goods";
  shippingMethod?: "NO";
  emiOption?: 0 | 1;
  /** Free pass-through echoed on every callback — LIVRA sends orderNumber. */
  valueA?: string;
};

export type SslczSessionResult =
  | { ok: true; gatewayPageUrl: string; sessionKey: string }
  | { ok: false; error: string };

export type SslczValidation = {
  /** VALID | VALIDATED | INVALID_TRANSACTION | … */
  status?: string;
  tranId?: string;
  valId?: string;
  amount?: string;
  storeAmount?: string;
  currency?: string;
  currencyType?: string;
  currencyAmount?: string;
  bankTranId?: string;
  cardType?: string;
  cardBrand?: string;
  riskLevel?: string;
  riskTitle?: string;
  apiConnect?: string;
  [key: string]: unknown;
};

/* ─── Session initiation ───────────────────────────────────────────── */

export async function createSslczSession(
  req: SslczSessionRequest,
): Promise<SslczSessionResult> {
  if (!isSslcommerzConfigured) {
    return {
      ok: false,
      error:
        "SSLCommerz is not configured — set SSLCOMMERZ_STORE_ID / SSLCOMMERZ_STORE_PASSWORD.",
    };
  }

  const body = new URLSearchParams({
    store_id: STORE_ID,
    store_passwd: STORE_PASSWORD,
    total_amount: toGatewayAmount(req.totalAmount),
    currency: req.currency,
    tran_id: req.tranId,
    product_name: req.productName.slice(0, 255),
    product_category: req.productCategory.slice(0, 100),
    product_profile: req.productProfile,
    success_url: req.successUrl,
    fail_url: req.failUrl,
    cancel_url: req.cancelUrl,
    ipn_url: req.ipnUrl ?? "",
    cus_name: req.cusName.slice(0, 50),
    cus_email: req.cusEmail.slice(0, 50),
    cus_add1: req.cusAdd1.slice(0, 50),
    cus_city: req.cusCity.slice(0, 50),
    cus_country: req.cusCountry?.slice(0, 50) || "Bangladesh",
    cus_phone: req.cusPhone.slice(0, 20),
    shipping_method: req.shippingMethod ?? "NO",
    emi_option: String(req.emiOption ?? 0),
  });
  if (req.cusPostcode) body.set("cus_postcode", req.cusPostcode.slice(0, 30));
  if (req.valueA) body.set("value_a", req.valueA.slice(0, 255));

  try {
    const res = await fetch(SESSION_API, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      return { ok: false, error: `Gateway session API returned ${res.status}.` };
    }
    const data = (await res.json()) as {
      status?: string;
      failedreason?: string;
      sessionkey?: string;
      GatewayPageURL?: string;
    };
    if (data.status === "SUCCESS" && data.GatewayPageURL) {
      return {
        ok: true,
        gatewayPageUrl: data.GatewayPageURL,
        sessionKey: data.sessionkey ?? "",
      };
    }
    return {
      ok: false,
      error: data.failedreason || "Gateway rejected the session request.",
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not reach SSLCommerz.",
    };
  }
}

/* ─── Order Validation API ─────────────────────────────────────────── */

/**
 * Server-side source of truth: a transaction only counts as paid when this
 * returns status VALID (first validation) or VALIDATED (already validated).
 */
export async function validateSslczTransaction(
  valId: string,
): Promise<SslczValidation | null> {
  if (!isSslcommerzConfigured || !valId) return null;
  const url = new URL(VALIDATION_API);
  url.searchParams.set("val_id", valId);
  url.searchParams.set("store_id", STORE_ID);
  url.searchParams.set("store_passwd", STORE_PASSWORD);
  url.searchParams.set("format", "json");
  url.searchParams.set("v", "1");

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as SslczValidation;
  } catch (e) {
    console.error("[sslcommerz] validation API failed:", e);
    return null;
  }
}

/* ─── IPN hash verification (per official Hash Validation method) ──── */

/**
 * Verifies the MD5 signature SSLCommerz sends with IPN/success/fail POSTs.
 * Mirrors the official PHP SDK's SSLCOMMERZ_hash_verify exactly: take
 * verify_key's comma-separated key list, keep only keys present in the POST
 * (empty-string values ARE included), append `store_passwd=<md5(password)>`,
 * sort by key, join as `key=value` with `&`, md5, compare with verify_sign.
 * Raw POST values are used — no re-encoding. Note: the example verify_sign
 * in the developer docs does not verify against its own recipe (the fixture
 * is illustrative); this implementation follows the SDK source, which is
 * what the gateway actually signs with.
 */
export function verifySslczSign(params: Record<string, string>): boolean {
  const sign = params.verify_sign;
  const verifyKey = params.verify_key;
  if (!sign || !verifyKey) return false;

  const keys = verifyKey
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const entries = new Map<string, string>();
  for (const key of keys) {
    const value = params[key];
    if (value === undefined) continue;
    entries.set(key, value);
  }
  entries.set("store_passwd", md5(STORE_PASSWORD));

  const hashString = [...entries.keys()]
    .sort()
    .map((key) => `${key}=${entries.get(key)}`)
    .join("&");

  return md5(hashString) === sign;
}

function md5(input: string): string {
  return createHash("md5").update(input, "utf8").digest("hex");
}

/* ─── Transaction Query API (reconciliation / recovery) ────────────── */

/** Query all gateway transactions recorded against one tran_id. */
export async function querySslczTransactions(
  tranId: string,
): Promise<SslczValidation[]> {
  if (!isSslcommerzConfigured || !tranId) return [];
  const url = new URL(QUERY_API);
  url.searchParams.set("tran_id", tranId);
  url.searchParams.set("store_id", STORE_ID);
  url.searchParams.set("store_passwd", STORE_PASSWORD);
  url.searchParams.set("format", "json");

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      element?: SslczValidation | SslczValidation[];
    };
    if (!data.element) return [];
    return Array.isArray(data.element) ? data.element : [data.element];
  } catch (e) {
    console.error("[sslcommerz] transaction query failed:", e);
    return [];
  }
}
