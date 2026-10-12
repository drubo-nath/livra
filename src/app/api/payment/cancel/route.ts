import { NextResponse, type NextRequest } from "next/server";
import { ajPayment } from "@/lib/arcjet";
import { markSslczPaymentStatus } from "@/lib/payments";
import { arcjetGuard, formToRecord, resultUrl } from "../callbacks";

/** Gateway POSTs here when the customer abandons the payment page. */
export async function POST(request: NextRequest) {
  const denied = await arcjetGuard(request, ajPayment);
  if (denied) return denied;

  const params = await formToRecord(request);
  const tranId = params.tran_id;

  const outcome = await markSslczPaymentStatus(params, "cancelled");
  console.info("[payment] cancel callback:", { tranId, outcome });

  return NextResponse.redirect(
    resultUrl(request.nextUrl.origin, "cancel", tranId),
    303,
  );
}
