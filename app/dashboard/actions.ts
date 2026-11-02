// app/dashboard/actions.ts
"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { logAudit } from "@/lib/audit"
import { requireAdmin } from "@/lib/auth"
import { isServiceKey, SERVICE_KEYS, SERVICES } from "@/lib/services"

import { getConfig, isServiceOn, setShutdownFlags } from "./config-db"

export type ActionResult = { ok: boolean; message: string }

function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Errore sconosciuto"
}

/** Accende o spegne un servizio (config.shutdown_<servizio>: 0 = acceso, 1 = spento). */
export async function setServiceActive(service: unknown, active: unknown): Promise<ActionResult> {
  await requireAdmin()
  if (!isServiceKey(service) || typeof active !== "boolean") {
    return { ok: false, message: "Richiesta non valida." }
  }

  try {
    await setShutdownFlags([service], active ? 0 : 1)
  } catch (e) {
    return { ok: false, message: errorMessage(e) }
  }

  await logAudit(active ? "service_on" : "service_off", service)
  revalidatePath("/dashboard", "layout")
  return { ok: true, message: `${SERVICES[service].label} ${active ? "acceso" : "spento"}.` }
}

/** Accende o spegne tutti i servizi; nel registro finiscono solo quelli che cambiano davvero. */
export async function setAllServicesActive(active: unknown): Promise<ActionResult> {
  await requireAdmin()
  if (typeof active !== "boolean") return { ok: false, message: "Richiesta non valida." }

  let changed: (typeof SERVICE_KEYS)[number][]
  try {
    const cfg = await getConfig()
    changed = SERVICE_KEYS.filter((service) => isServiceOn(cfg, service) !== active)
    await setShutdownFlags(changed, active ? 0 : 1)
  } catch (e) {
    return { ok: false, message: errorMessage(e) }
  }

  for (const service of changed) await logAudit(active ? "service_on" : "service_off", service)
  revalidatePath("/dashboard", "layout")

  if (changed.length === 0) {
    return { ok: true, message: `Erano già tutti ${active ? "accesi" : "spenti"}.` }
  }
  const names = changed.map((service) => SERVICES[service].label).join(", ")
  return { ok: true, message: `${active ? "Accesi" : "Spenti"}: ${names}.` }
}

export async function logoutAction() {
  await logAudit("logout")
  const store = await cookies()
  store.delete("admin_session")
  redirect("/login")
}
