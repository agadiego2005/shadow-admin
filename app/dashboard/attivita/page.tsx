// app/dashboard/attivita/page.tsx
// Registro attività: accessi al pannello e modifiche ai servizi (tabella admin_audit su Turso).

import type { Metadata } from "next"
import Link from "next/link"
import { ScrollText } from "lucide-react"

import { AUDIT_KINDS, getAuditEntries, type AuditEntry, type AuditKind } from "@/lib/audit"
import { requireAdmin } from "@/lib/auth"
import { ago, clock, describeUserAgent } from "@/lib/format"
import { cn } from "@/lib/utils"
import { AuditEvent } from "@/components/admin/audit-event"
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const runtime = "edge"

export const metadata: Metadata = { title: "Registro attività" }

const LIMIT = 300

const rome = { timeZone: "Europe/Rome" } as const
const dayKey = new Intl.DateTimeFormat("en-CA", { ...rome, year: "numeric", month: "2-digit", day: "2-digit" })
const longDay = new Intl.DateTimeFormat("it-IT", { ...rome, weekday: "long", day: "numeric", month: "long" })
const seconds = new Intl.DateTimeFormat("it-IT", { ...rome, hour: "2-digit", minute: "2-digit", second: "2-digit" })

function parseKind(value: string | undefined): AuditKind {
  return value && value in AUDIT_KINDS ? (value as AuditKind) : "all"
}

/** Righe raggruppate per giorno di Roma: "Oggi", "Ieri", poi "lunedì 27 ottobre". */
function groupByDay(entries: AuditEntry[]) {
  const today = dayKey.format(Date.now())
  const yesterday = dayKey.format(Date.now() - 24 * 60 * 60 * 1000)
  const groups: { key: string; label: string; entries: AuditEntry[] }[] = []
  for (const entry of entries) {
    const date = new Date(entry.createdAt)
    const key = dayKey.format(date)
    if (groups.at(-1)?.key !== key) {
      const label = key === today ? "Oggi" : key === yesterday ? "Ieri" : longDay.format(date)
      groups.push({ key, label, entries: [] })
    }
    groups.at(-1)!.entries.push(entry)
  }
  return groups
}

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  await requireAdmin()
  const kind = parseKind((await searchParams).tipo)

  let entries: AuditEntry[] | null = null
  let error: string | null = null
  try {
    entries = await getAuditEntries(kind, LIMIT)
  } catch (e) {
    error = e instanceof Error ? e.message : "Errore sconosciuto"
  }

  return (
    <>
      <PageHeader
        icon={ScrollText}
        title="Registro attività"
        description="Accessi al pannello e modifiche ai servizi, con IP e dispositivo di chi le ha fatte."
        actions={
          <nav aria-label="Tipo" className="inline-flex rounded-lg border bg-card p-1 shadow-xs">
            {(Object.keys(AUDIT_KINDS) as AuditKind[]).map((key) => (
              <Link
                key={key}
                href={key === "all" ? "/dashboard/attivita" : `/dashboard/attivita?tipo=${key}`}
                aria-current={key === kind ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  key === kind && "bg-muted text-foreground",
                )}
              >
                {AUDIT_KINDS[key].label}
              </Link>
            ))}
          </nav>
        }
      />

      {error ? (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base">Turso non raggiungibile</CardTitle>
            <CardDescription className="break-words">{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : entries && entries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <ScrollText className="size-8 text-muted-foreground/60" />
            <div className="font-medium">Ancora niente da mostrare</div>
            <p className="max-w-sm text-sm text-muted-foreground">
              Da adesso il pannello registra ogni accesso, uscita e modifica ai servizi.
            </p>
          </CardContent>
        </Card>
      ) : entries ? (
        <div className="space-y-6">
          {groupByDay(entries).map((group) => (
            <section key={group.key} className="space-y-2">
              <h2 className="px-1 text-sm font-medium capitalize text-muted-foreground">{group.label}</h2>
              <Card className="gap-0 py-0">
                <ul className="divide-y">
                  {group.entries.map((entry) => (
                    <li key={entry.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm sm:flex-nowrap">
                      <span className="w-16 shrink-0 tabular-nums text-muted-foreground" title={seconds.format(new Date(entry.createdAt))}>
                        {clock.format(new Date(entry.createdAt))}
                      </span>
                      <AuditEvent entry={entry} className="min-w-0 flex-1" />
                      <span className="flex items-center gap-3 text-xs text-muted-foreground sm:justify-end">
                        <span className="font-mono">{entry.ip ?? "IP sconosciuto"}</span>
                        <span className="hidden sm:inline" title={entry.userAgent ?? undefined}>
                          {describeUserAgent(entry.userAgent) ?? "—"}
                        </span>
                        <span className="w-24 text-right">{ago(entry.createdAt)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          ))}
          {entries.length === LIMIT ? (
            <p className="text-center text-xs text-muted-foreground">Mostrate le ultime {LIMIT} attività.</p>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
