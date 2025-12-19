// app/dashboard/actions.ts
"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/auth"

export type ActionState =
  | { ok: boolean; title: string; message: string; ts: string }
  | null

type Service = "website" | "api" | "dashboard"
type Status = "online" | "offline"

const cookieOpts = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 giorni
}

function nowTs() {
  return new Date().toISOString()
}

async function setServiceStatus(service: Service, status: Status) {
  const store = await cookies()
  store.set(`${service}_status`, status, cookieOpts)
}

async function setLastAction(value: string) {
  const store = await cookies()
  store.set("last_shutdown_action", value, cookieOpts)
}

export async function shutdownWebsiteAction(_prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireAdmin()
  await setServiceStatus("website", "offline")
  await setLastAction("shutdown website")
  revalidatePath("/dashboard")
  return { ok: true, title: "Website", message: "Website impostato OFFLINE (mock).", ts: nowTs() }
}

export async function shutdownApiAction(_prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireAdmin()
  await setServiceStatus("api", "offline")
  await setLastAction("shutdown api")
  revalidatePath("/dashboard")
  return { ok: true, title: "API", message: "API impostate OFFLINE (mock).", ts: nowTs() }
}

export async function shutdownDashboardAction(_prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireAdmin()
  await setServiceStatus("dashboard", "offline")
  await setLastAction("shutdown dashboard")
  revalidatePath("/dashboard")
  return { ok: true, title: "Dashboard", message: "Dashboard impostata OFFLINE (mock).", ts: nowTs() }
}

export async function logoutAction() {
  const store = await cookies()
  store.delete("admin_session")
  redirect("/login")
}
