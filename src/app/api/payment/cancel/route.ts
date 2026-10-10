import { NextResponse, type NextRequest } from "next/server";
import { markSslczPaymentStatus } from "@/lib/payments";
import { formToRecord, resultUrl } from "../callbacks";

/** Gateway POSTs here when the customer abandons the payment page. */
export async function POST(request: NextRequest) {
  const params = await formToRecord(request);
  const tranId = params.tran_id;

  const outcome = await markSslczPaymentStatus(params, "cancelled");
  console.info("[payment] cancel callback:", { tranId, outcome });

  return NextResponse.redirect(
    resultUrl(request.nextUrl.origin, "cancel", tranId),
    303,
  );
}
