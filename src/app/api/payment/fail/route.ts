import { NextResponse, type NextRequest } from "next/server";
import { markSslczPaymentStatus } from "@/lib/payments";
import { formToRecord, resultUrl } from "../callbacks";

/** Gateway POSTs here when the bank declined the payment. */
export async function POST(request: NextRequest) {
  const params = await formToRecord(request);
  const tranId = params.tran_id;

  const outcome = await markSslczPaymentStatus(params, "failed");
  console.info("[payment] fail callback:", { tranId, outcome });

  return NextResponse.redirect(
    resultUrl(request.nextUrl.origin, "fail", tranId),
    303,
  );
}
