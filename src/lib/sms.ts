/**
 * sms.net.bd (Alpha SMS) transactional SMS sender for LIVRA.
 *
 * Configure via .env.local:
 *   SMS_NET_BD_API_KEY      — your portal API key (omit in dev to log to console)
 *   SMS_NET_BD_SENDER_ID    — approved Sender ID (optional)
 *   SMS_NET_BD_API_URL      — override send endpoint (defaults to https://api.sms.net.bd/sendsms)
 *   SMS_NET_BD_BALANCE_URL  — override balance endpoint (defaults to https://api.sms.net.bd/user/balance/)
 *
 * Dev fallback: without an API key, messages print nicely to the server console
 * so OTP and order notification testing costs nothing.
 */

const DEFAULT_SEND_URL = "https://api.sms.net.bd/sendsms";
const DEFAULT_BALANCE_URL = "https://api.sms.net.bd/user/balance/";

/** Error descriptions for standard sms.net.bd error codes */
const ERROR_TEXT: Record<number, string> = {
  0: "Success",
  400: "Bad Request — missing or invalid parameters",
  401: "Unauthorized — invalid API Key",
  402: "Payment Required — insufficient balance",
  403: "Forbidden — invalid sender ID or unauthorized sender",
  404: "Not Found — route or endpoint not found",
  405: "Invalid mobile number format",
  422: "Unprocessable Entity — message rejected by gateway",
  429: "Too Many Requests — rate limit exceeded",
  500: "SMS Gateway internal server error",
};

export type SmsResponseData = {
  request_id?: number | string;
  balance?: number | string;
  [key: string]: unknown;
};

export type GatewayResponse = {
  error?: number | string;
  msg?: string;
  message?: string;
  status?: string;
  data?: SmsResponseData;
};

export type SmsResult = {
  ok: boolean;
  dev?: boolean;
  requestId?: string | number;
  error?: string;
};

/** Normalize phone number to 8801XXXXXXXXX required by SMS gateway */
function toGatewayNumber(phone: string): string {
  const cleaned = phone.replace(/[\s\-()+]/g, "").trim();
  if (cleaned.startsWith("880")) return cleaned;
  if (cleaned.startsWith("01")) return `88${cleaned}`;
  if (cleaned.startsWith("1") && cleaned.length === 10) return `880${cleaned}`;
  return cleaned;
}

function getApiKey(): string | undefined {
  return (
    process.env.SMS_NET_BD_API_KEY ||
    process.env.SMS_API_KEY ||
    process.env.BULKSMSBD_API_KEY
  );
}

function getSenderId(): string | undefined {
  return (
    process.env.SMS_NET_BD_SENDER_ID ||
    process.env.SMS_SENDER_ID ||
    process.env.BULKSMSBD_SENDER_ID
  );
}

/**
 * Send an SMS to one or more mobile numbers.
 */
export async function sendSMS(
  to: string | string[],
  message: string,
): Promise<SmsResult> {
  const apiKey = getApiKey();

  const recipients = (Array.isArray(to) ? to : [to])
    .map(toGatewayNumber)
    .filter(Boolean);

  if (recipients.length === 0) {
    return { ok: false, error: "No valid recipient mobile number provided" };
  }

  // Dev fallback: when no API key is provided, log to console
  if (!apiKey) {
    console.log(`\n[sms:dev] ───────────────────────────────────────────────`);
    console.log(`[sms:dev] To:  ${recipients.join(", ")}`);
    console.log(`[sms:dev] Msg: ${message}`);
    console.log(`[sms:dev] (No SMS_NET_BD_API_KEY configured — logged in dev)`);
    console.log(`[sms:dev] ───────────────────────────────────────────────\n`);
    return { ok: true, dev: true };
  }

  const senderId = getSenderId();
  const endpoint = process.env.SMS_NET_BD_API_URL || DEFAULT_SEND_URL;

  try {
    const formData = new FormData();
    formData.append("api_key", apiKey);
    formData.append("msg", message);
    formData.append("to", recipients.join(","));
    if (senderId) {
      formData.append("sender_id", senderId);
    }

    console.log(formData)

    const res = await fetch(endpoint, {
      method: "POST",
      body: formData,
      cache: "no-store",
    });

    const text = await res.text();
    let data: GatewayResponse | null = null;
    try {
      data = JSON.parse(text) as GatewayResponse;
    } catch {
      if (!res.ok) {
        console.error(`[sms] gateway HTTP ${res.status}: ${text}`);
        return { ok: false, error: text || `HTTP ${res.status}` };
      }
    }

    const errorCode = data?.error !== undefined ? Number(data.error) : null;
    const isSuccess =
      res.ok &&
      (errorCode === 0 || (errorCode === null && /success/i.test(text)));

    if (!isSuccess) {
      const errorMsg =
        data?.msg ||
        data?.message ||
        (errorCode !== null ? ERROR_TEXT[errorCode] : undefined) ||
        `SMS send failed (HTTP ${res.status})`;
      console.error(`[sms] gateway error (${errorCode ?? res.status}): ${errorMsg}`);
      return { ok: false, error: errorMsg };
    }

    return {
      ok: true,
      requestId: data?.data?.request_id,
    };
  } catch (err) {
    console.error("[sms] send failed with exception:", err);
    return { ok: false, error: "SMS gateway unreachable" };
  }
}

/**
 * Check remaining balance from sms.net.bd portal.
 */
export async function getBalance(): Promise<number | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const endpoint = process.env.SMS_NET_BD_BALANCE_URL || DEFAULT_BALANCE_URL;

  try {
    const url = new URL(endpoint);
    url.searchParams.set("api_key", apiKey);

    const res = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
    });

    const data = (await res.json().catch(() => null)) as GatewayResponse | null;
    if (data && Number(data.error) === 0 && data.data?.balance !== undefined) {
      const numeric = parseFloat(String(data.data.balance));
      return isNaN(numeric) ? null : numeric;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Standard message template for Better Auth phone verification OTP.
 */
export function otpMessage(code: string): string {
  return `Your LIVRA verification code is ${code}.`;
}

/**
 * Standard message template for customer order confirmation.
 */
export function orderConfirmationMessage(
  orderNumber: string,
  total: number,
): string {
  return `Thank you for shopping at LIVRA! Your order #${orderNumber} for BDT ${total.toLocaleString("en-BD")} has been placed successfully.`;
}

/**
 * Standard message template for order status update notifications.
 */
export function orderStatusUpdateMessage(
  orderNumber: string,
  status: string,
): string {
  const prettyStatus = status.charAt(0).toUpperCase() + status.slice(1);
  return `Your LIVRA order #${orderNumber} status is now: ${prettyStatus}. Thank you for choosing LIVRA.`;
}
