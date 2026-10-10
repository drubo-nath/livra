import { NextResponse, type NextRequest } from "next/server";
import { finalizeSslczPayment } from "@/lib/payments";
import { verifySslczSign } from "@/lib/sslcommerz";
import { formToRecord, resultUrl } from "../callbacks";

/**
 * SSLCommerz POSTs here after a (claimed) successful payment, then the
 * customer is redirected. The POST is NOT proof — payment only counts once
 * finalizeSslczPayment confirms it via the Order Validation API (server-side,
 * credential-authenticated, amount/currency/tran_id cross-checked). When
 * verification can't complete, the customer lands on a "verifying" page and
 * the IPN callback settles the order server-side.
 */
export async function POST(request: NextRequest) {
  const params = await formToRecord(request);
  const tranId = params.tran_id;

  const signOk = !params.verify_sign || verifySslczSign(params);
  if (!signOk) {
    console.error("[payment] success callback failed signature check:", tranId);
  }

  const outcome = await finalizeSslczPayment(params);
  console.info("[payment] success callback:", { tranId, signOk, outcome });

  const page =
    outcome === "paid" || outcome === "already-paid" ? "success" : "pending";
  return NextResponse.redirect(
    resultUrl(request.nextUrl.origin, page, tranId),
    303,
  );
}
