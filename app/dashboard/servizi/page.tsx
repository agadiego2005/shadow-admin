// app/dashboard/servizi/page.tsx
// Accensione e spegnimento dei servizi (tabella `config` su Turso).

import type { Metadata } from "next"
import { Power } from "lucide-react"

import { getLastServiceChanges, type AuditEntry } from "@/lib/audit"
import { requireAdmin } from "@/lib/auth"
import { ago, formatDateTime } from "@/lib/format"
import { SERVICE_KEYS } from "@/lib/services"
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { getConfig, isServiceOn } from "../config-db"
import { ServicesPanel, type ServiceView } from "./ServicesPanel"

export const runtime = "edge"

export const metadata: Metadata = { title: "Servizi" }

export default async function ServicesPage() {
  await requireAdmin()

  const [config, changes] = await Promise.allSettled([getConfig(), getLastServiceChanges()])
  const lastChanges: Record<string, AuditEntry> = changes.status === "fulfilled" ? changes.value : {}

  return (
    <>
      <PageHeader
        icon={Power}
        title="Servizi"
        description="Accendi e spegni i servizi. Lo stato è salvato su Turso (tabella config) e ogni modifica finisce nel registro."
      />

      {config.status === "rejected" ? (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base">Turso non raggiungibile</CardTitle>
            <CardDescription className="break-words">
              {config.reason instanceof Error ? config.reason.message : "Errore sconosciuto"}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ServicesPanel
          configUpdated={`${ago(config.value.updated_at)} (${formatDateTime(config.value.updated_at)})`}
          services={SERVICE_KEYS.map((key): ServiceView => {
            const change = lastChanges[key]
            return {
              key,
              on: isServiceOn(config.value, key),
              changedAgo: change ? ago(change.createdAt) : null,
              changedAt: change ? formatDateTime(change.createdAt) : null,
              changedFrom: change?.ip ?? null,
            }
          })}
        />
      )}
    </>
  )
}
