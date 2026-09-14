import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";

const handlers = toNextJsHandler(auth);

export const POST = handlers.POST;

export async function GET(request: NextRequest) {
  // Check if client is requesting the active session
  if (request.nextUrl.pathname.endsWith("/get-session")) {
    const adminToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (adminToken) {
      const adminSession = await verifyAdminSessionToken(adminToken);
      if (adminSession) {
        return NextResponse.json({
          session: adminSession.session,
          user: adminSession.user,
        });
      }
    }
  }

  return handlers.GET(request);
}
