"use server"

import { redirect } from "next/navigation"
import { setAdminSession } from "@/lib/auth"

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "")
  const password = String(formData.get("password") ?? "")
  const nextPath = String(formData.get("next") ?? "/dashboard")

  const adminUser = process.env.ADMIN_USERNAME ?? "admin"
  const adminPass = process.env.ADMIN_PASSWORD ?? ""

  if (username !== adminUser || password !== adminPass) {
    redirect(`/login?error=1&next=${encodeURIComponent(nextPath)}`)
  }

  await setAdminSession()
  redirect(nextPath)
}
