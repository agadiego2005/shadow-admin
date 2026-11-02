// Come si presenta una riga del registro attività: icona colorata + frase in italiano.

import { LogIn, LogOut, Power, PowerOff, ShieldAlert, type LucideIcon } from "lucide-react"

import type { AuditEntry } from "@/lib/audit"
import { isServiceKey, SERVICES } from "@/lib/services"
import { cn } from "@/lib/utils"

const STYLE: Record<AuditEntry["action"], { icon: LucideIcon; tone: string }> = {
  login: { icon: LogIn, tone: "bg-[#2a78d6]/10 text-[#2a78d6] dark:text-[#3987e5]" },
  login_failed: { icon: ShieldAlert, tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  logout: { icon: LogOut, tone: "bg-muted text-muted-foreground" },
  service_on: { icon: Power, tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  service_off: { icon: PowerOff, tone: "bg-red-500/10 text-red-700 dark:text-red-400" },
}

export function auditText(entry: Pick<AuditEntry, "action" | "target">) {
  const service = isServiceKey(entry.target) ? SERVICES[entry.target].label : (entry.target ?? "Servizio")
  switch (entry.action) {
    case "login":
      return "Accesso al pannello"
    case "login_failed":
      return "Accesso fallito"
    case "logout":
      return "Uscita dal pannello"
    case "service_on":
      return `${service} acceso`
    case "service_off":
      return `${service} spento`
    default:
      return entry.action
  }
}

export function AuditEvent({ entry, className }: { entry: Pick<AuditEntry, "action" | "target">; className?: string }) {
  const style = STYLE[entry.action] ?? STYLE.logout
  const Icon = style.icon
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
      <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", style.tone)}>
        <Icon className="size-3.5" />
      </span>
      <span className="truncate font-medium">{auditText(entry)}</span>
    </span>
  )
}
