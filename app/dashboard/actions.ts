// app/dashboard/actions.ts
"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/auth"

import { setShutdownFlag, type ServiceKey } from "./config-db"

export type ActionState = { ok: boolean; title: string; message: string; ts: string } | null

const cookieOpts = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
}

function nowTs() {
  return new Date().toISOString()
}

async function setLastAction(value: string) {
  const store = await cookies()
  store.set("last_shutdown_action", value, cookieOpts)
}

function shutdownValueFromForm(fd: FormData): 0 | 1 {
  // active=1 => servizio acceso  => shutdown=0
  // active=0 => servizio spento  => shutdown=1
  const active = String(fd.get("active") ?? "")
  return active === "1" ? 0 : 1
}

async function setService(service: ServiceKey, title: string, fd: FormData): Promise<ActionState> {
  await requireAdmin()

  try {
    const shutdown = shutdownValueFromForm(fd)
    await setShutdownFlag(service, shutdown)

    const pretty = shutdown === 0 ? "ACCESO" : "SPENTO"
    await setLastAction(`${service}: ${pretty}`)

    revalidatePath("/dashboard")
    return {
      ok: true,
      title,
      message: `${title} impostato ${pretty} (Turso: config.${"shutdown_" + service}).`,
      ts: nowTs(),
    }
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : "Errore sconosciuto"
    return { ok: false, title, message: msg, ts: nowTs() }
  }
}

export async function setWebsiteActiveAction(_prev: ActionState, fd: FormData) {
  return setService("website", "Website", fd)
}

export async function setApiActiveAction(_prev: ActionState, fd: FormData) {
  return setService("api", "API", fd)
}

export async function setDashboardActiveAction(_prev: ActionState, fd: FormData) {
  return setService("dashboard", "Dashboard", fd)
}

export async function setAdminActiveAction(_prev: ActionState, fd: FormData) {
  return setService("admin", "Admin", fd)
}

export async function logoutAction() {
  const store = await cookies()
  store.delete("admin_session")
  redirect("/login")
}
