// Icona di ogni servizio, uguale in Panoramica e in Servizi.

import { AppWindow, Globe, Server, Shield, type LucideIcon } from "lucide-react"

import type { ServiceKey } from "@/lib/services"

export const SERVICE_ICONS: Record<ServiceKey, LucideIcon> = {
  website: Globe,
  api: Server,
  dashboard: AppWindow,
  admin: Shield,
}

/** Pallino + "Acceso"/"Spento": lo stato non è mai affidato al solo colore. */
export function ServiceStatus({ on }: { on: boolean }) {
  return (
    <span
      className={
        on
          ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400"
          : "inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400"
      }
    >
      <span className={on ? "size-1.5 rounded-full bg-emerald-500" : "size-1.5 rounded-full bg-red-500"} />
      {on ? "Acceso" : "Spento"}
    </span>
  )
}
