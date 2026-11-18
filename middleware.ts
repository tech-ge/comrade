import { NextResponse, type NextRequest } from "next/server";
const PROTECTED = ["/posts","/gigs","/help-advice","/couples","/profile"];
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PROTECTED.some(p => pathname === p || pathname.startsWith(p + "/"))) {
    const hasSession = req.cookies.get("sb-access-token")?.value;
    if (!hasSession) return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
