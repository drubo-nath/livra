import { NextResponse, type NextRequest } from "next/server";
import {
  finalizeSslczPayment,
  ipnStatusToTransition,
  markSslczPaymentStatus,
} from "@/lib/payments";
import { verifySslczSign } from "@/lib/sslcommerz";
import { formToRecord } from "../callbacks";

/**
 * IPN listener — the server-to-server source of truth. Covers customers who
 * pay but never make it back to the site (closed tab, dropped connection).
 * Always answers 200: retries for non-200s would re-deliver the same event,
 * and every transition here is idempotent anyway.
 *
 * Signature policy: VALID transitions are always attempted — they are gated
 * by the credential-authenticated Order Validation API, which cross-checks
 * tran_id, amount and currency against our own record, so no missed payment
 * can be caused by a hash edge case. Negative transitions (failed/cancelled)
 * carry no such proof, so they are only applied when the MD5 signature
 * verifies.
 */
export async function POST(request: NextRequest) {
  const params = await formToRecord(request);
  const tranId = params.tran_id;

  const hasSign = Boolean(params.verify_sign && params.verify_key);
  const signOk = hasSign && verifySslczSign(params);
  if (hasSign && !signOk) {
    console.error("[payment] IPN failed MD5 signature check:", tranId);
  }

  let outcome = "ignored";
  const { kind } = ipnStatusToTransition(params.status);
  switch (kind) {
    case "finalize":
      outcome = await finalizeSslczPayment(params);
      break;
    case "failed":
      if (!hasSign || signOk) {
        outcome = await markSslczPaymentStatus(params, "failed");
      } else {
        outcome = "skipped-bad-sign";
      }
      break;
    case "cancelled":
      if (!hasSign || signOk) {
        outcome = await markSslczPaymentStatus(params, "cancelled");
      } else {
        outcome = "skipped-bad-sign";
      }
      break;
    default:
      console.warn("[payment] IPN with unmapped status:", params.status);
  }

  console.info("[payment] IPN:", { tranId, status: params.status, outcome });
  return NextResponse.json({ ok: true });
}
