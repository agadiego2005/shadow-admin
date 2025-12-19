// middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const SESSION_COOKIE = "admin_session"

export function middleware(req: NextRequest) {
  const sessionToken = process.env.ADMIN_SESSION_TOKEN
  const cookie = req.cookies.get(SESSION_COOKIE)?.value

  if (!sessionToken || cookie !== sessionToken) {
    const url = new URL("/login", req.url)
    url.searchParams.set("next", req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
