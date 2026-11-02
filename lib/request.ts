// lib/request.ts
// IP e user agent di chi sta usando il pannello, dagli header del proxy (Cloudflare o simili).

import "server-only"

import { headers } from "next/headers"

export async function requestInfo() {
  const h = await headers()
  const ip = (h.get("cf-connecting-ip") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0])
    ?.trim()
    .toLowerCase()
  return { ip: ip || null, userAgent: h.get("user-agent")?.slice(0, 400) || null }
}
