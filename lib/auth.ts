import "server-only"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

const SESSION_COOKIE = "admin_session"

export async function setAdminSession() {
  const token = process.env.ADMIN_SESSION_TOKEN
  if (!token) throw new Error("Missing ADMIN_SESSION_TOKEN")

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  })
}

export async function requireAdmin() {
  const token = process.env.ADMIN_SESSION_TOKEN
  const cookieStore = await cookies()
  const cookie = cookieStore.get(SESSION_COOKIE)?.value

  if (!token || cookie !== token) redirect("/login")
}
