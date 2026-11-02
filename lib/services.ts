// lib/services.ts
// I servizi che il pannello accende e spegne (tabella `config` su Turso, una colonna per servizio).
// Niente "server-only": nomi e descrizioni servono anche ai componenti client.

export const SERVICE_KEYS = ["website", "api", "dashboard", "admin"] as const

export type ServiceKey = (typeof SERVICE_KEYS)[number]

export const SERVICES: Record<ServiceKey, { label: string; description: string; column: string }> = {
  website: { label: "Website", description: "Frontend pubblico", column: "shutdown_website" },
  api: { label: "API", description: "Servizi di backend", column: "shutdown_api" },
  dashboard: { label: "Dashboard", description: "Pannello admin", column: "shutdown_dashboard" },
  admin: { label: "Admin", description: "Area amministrazione", column: "shutdown_admin" },
}

export function isServiceKey(value: unknown): value is ServiceKey {
  return typeof value === "string" && (SERVICE_KEYS as readonly string[]).includes(value)
}
