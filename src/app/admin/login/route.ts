import { NextResponse } from "next/server";

export function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") || "/admin";
  return NextResponse.redirect(new URL(`/atelier-portal?next=${encodeURIComponent(next)}`, request.url));
}

