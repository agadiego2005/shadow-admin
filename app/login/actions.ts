"use server"

import { redirect } from "next/navigation"

import { logAudit } from "@/lib/audit"
import { setAdminSession } from "@/lib/auth"

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "")
  const password = String(formData.get("password") ?? "")
  const rawNext = String(formData.get("next") ?? "/dashboard")
  // Solo percorsi interni: niente redirect verso altri siti dopo il login.
  const nextPath = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard"

  const adminUser = process.env.ADMIN_USERNAME ?? "admin"
  const adminPass = process.env.ADMIN_PASSWORD ?? ""

  if (username !== adminUser || password !== adminPass) {
    await logAudit("login_failed")
    redirect(`/login?error=1&next=${encodeURIComponent(nextPath)}`)
  }

  await setAdminSession()
  await logAudit("login")
  redirect(nextPath)
}
