import { NextResponse, type NextRequest } from "next/server";
export function requireAuth(req: NextRequest) {
  const token = req.cookies.get("sb-access-token")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));
  return null;
}
