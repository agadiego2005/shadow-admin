// app/dashboard/page.tsx
// Panoramica: stato dei servizi, app calcio nelle ultime 24 ore e attività recente, a colpo d'occhio.

import type { ReactNode } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { Activity, AlertTriangle, ArrowRight, Clock, LayoutDashboard, Swords, Users } from "lucide-react"

import { getAuditEntries, getLastServiceChanges } from "@/lib/audit"
import { requireAdmin } from "@/lib/auth"
import { ago, clock, formatDateTime, place } from "@/lib/format"
import { SERVICE_KEYS, SERVICES } from "@/lib/services"
import { cn } from "@/lib/utils"
import { AuditEvent } from "@/components/admin/audit-event"
import { PageHeader } from "@/components/admin/page-header"
import { SERVICE_ICONS, ServiceStatus } from "@/components/admin/service-icon"
import { StatCard } from "@/components/admin/stat-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { getConfig, isServiceOn } from "./config-db"
import { ActivityChart, ChartLegend, COMPARE_FILL, VISIT_FILL } from "./monitor/activity-chart"
import { getMonitorData } from "./monitor/visits-db"

export const runtime = "edge"

export const metadata: Metadata = { title: "Panoramica" }

const rome = { timeZone: "Europe/Rome" } as const
const longDay = new Intl.DateTimeFormat("it-IT", { ...rome, weekday: "long", day: "numeric", month: "long" })
const romeHour = new Intl.DateTimeFormat("en-GB", { ...rome, hour: "2-digit", hourCycle: "h23" })

function greeting() {
  const hour = Number(romeHour.format(Date.now()))
  const hello = hour < 13 ? "Buongiorno" : hour < 18 ? "Buon pomeriggio" : "Buonasera"
  return `${hello}, oggi è ${longDay.format(Date.now())}`
}

function reason(result: PromiseRejectedResult) {
  return result.reason instanceof Error ? result.reason.message : "Errore sconosciuto"
}

export default async function OverviewPage() {
  await requireAdmin()

  const [config, monitor, audit, changes] = await Promise.allSettled([
    getConfig(),
    getMonitorData("24h", null),
    getAuditEntries("all", 6),
    getLastServiceChanges(),
  ])

  const off = config.status === "fulfilled" ? SERVICE_KEYS.filter((key) => !isServiceOn(config.value, key)) : []
  const lastVisit = monitor.status === "fulfilled" ? monitor.value.recent.find((v) => v.event === "visit") : undefined

  return (
    <>
      <PageHeader icon={LayoutDashboard} title="Panoramica" description={greeting()} />

      {off.length > 0 ? (
        <Link
          href="/dashboard/servizi"
          className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm transition-colors hover:bg-amber-500/15"
        >
          <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="flex-1">
            <span className="font-medium">
              {off.length === 1 ? "1 servizio spento" : `${off.length} servizi spenti`}:
            </span>{" "}
            {off.map((key) => SERVICES[key].label).join(", ")}
          </span>
          <span className="hidden items-center gap-1 font-medium sm:inline-flex">
            Gestisci <ArrowRight className="size-4" />
          </span>
        </Link>
      ) : null}

      <section className="space-y-3">
        <SectionTitle title="Servizi" href="/dashboard/servizi" link="Gestisci servizi" />
        {config.status === "rejected" ? (
          <ErrorCard message={reason(config)} />
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {SERVICE_KEYS.map((key) => {
              const Icon = SERVICE_ICONS[key]
              const on = isServiceOn(config.value, key)
              const change = changes.status === "fulfilled" ? changes.value[key] : undefined
              return (
                <Link key={key} href="/dashboard/servizi" className="group">
                  <Card
                    className={cn(
                      "h-full gap-3 py-4 transition-colors group-hover:border-foreground/20",
                      !on && "border-red-500/30 dark:border-red-500/40",
                    )}
                  >
                    <CardContent className="space-y-3 px-4">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "flex size-9 items-center justify-center rounded-lg",
                            on ? "bg-[#2a78d6]/10 text-[#2a78d6] dark:text-[#3987e5]" : "bg-muted text-muted-foreground",
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <ServiceStatus on={on} />
                      </div>
                      <div>
                        <div className="font-semibold">{SERVICES[key].label}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {change ? `Modificato ${ago(change.createdAt)}` : SERVICES[key].description}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <SectionTitle title="App calcio · ultime 24 ore" href="/dashboard/monitor?range=24h" link="Apri il monitor" />
        {monitor.status === "rejected" ? (
          <ErrorCard message={reason(monitor)} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard icon={<Activity />} tone="blue" label="Visite" value={monitor.value.totals.visits} hint="nelle ultime 24 ore" />
              <StatCard
                icon={<Users />}
                tone="violet"
                label="Visitatori unici"
                value={monitor.value.totals.visitors}
                hint={`${monitor.value.totals.ips} IP diversi`}
              />
              <StatCard
                icon={<Swords />}
                tone="orange"
                label="Confronti"
                value={monitor.value.totals.comparisons}
                hint="squadre messe a confronto"
              />
              <StatCard
                icon={<Clock />}
                tone="aqua"
                label="Ultima visita"
                value={lastVisit ? clock.format(new Date(lastVisit.createdAt)) : "—"}
                hint={lastVisit ? `${ago(lastVisit.createdAt)} · ${place(lastVisit)}` : "nessuna nelle ultime 24 ore"}
              />
            </div>
            <Card>
              <CardHeader className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <CardTitle className="text-base">Andamento per ora</CardTitle>
                  <CardDescription>Passa sopra una barra per i numeri.</CardDescription>
                </div>
                <ChartLegend />
              </CardHeader>
              <CardContent>
                <ActivityChart timeline={monitor.value.timeline} range="24h" height="h-36" />
              </CardContent>
            </Card>
          </>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-4">
          <CardHeader className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Ultimi eventi in app calcio</CardTitle>
            <CardLink href="/dashboard/monitor">Tutti</CardLink>
          </CardHeader>
          <CardContent>
            {monitor.status === "rejected" ? (
              <p className="text-sm text-muted-foreground">Non disponibili.</p>
            ) : monitor.value.recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun evento nelle ultime 24 ore.</p>
            ) : (
              <ul className="-mx-2 space-y-0.5">
                {monitor.value.recent.slice(0, 6).map((visit) => {
                  const isCompare = visit.event === "compare"
                  return (
                    <li key={visit.id} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm">
                      <span className={cn("size-2 shrink-0 rounded-full", isCompare ? COMPARE_FILL : VISIT_FILL)} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {isCompare
                            ? `${visit.teamA} vs ${visit.teamB}`
                            : visit.path && visit.path !== "/"
                              ? `Visita a ${visit.path}`
                              : "Visita"}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {place(visit)}
                          {visit.device ? ` · ${visit.device}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground" title={formatDateTime(visit.createdAt)}>
                        {ago(visit.createdAt)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="gap-4">
          <CardHeader className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Attività nel pannello</CardTitle>
            <CardLink href="/dashboard/attivita">Registro</CardLink>
          </CardHeader>
          <CardContent>
            {audit.status === "rejected" ? (
              <p className="text-sm text-muted-foreground">Non disponibile.</p>
            ) : audit.value.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ancora niente: da adesso vengono registrati accessi e modifiche ai servizi.
              </p>
            ) : (
              <ul className="-mx-2 space-y-0.5">
                {audit.value.map((entry) => (
                  <li key={entry.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm">
                    <AuditEvent entry={entry} className="flex-1" />
                    <span className="hidden font-mono text-xs text-muted-foreground sm:inline">{entry.ip ?? ""}</span>
                    <span className="shrink-0 text-xs text-muted-foreground" title={formatDateTime(entry.createdAt)}>
                      {ago(entry.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function SectionTitle({ title, href, link }: { title: string; href: string; link: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      <CardLink href={href}>{link}</CardLink>
    </div>
  )
}

function CardLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-medium text-[#2a78d6] hover:underline dark:text-[#3987e5]"
    >
      {children}
      <ArrowRight className="size-3.5" />
    </Link>
  )
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-base">Turso non raggiungibile</CardTitle>
        <CardDescription className="break-words">{message}</CardDescription>
      </CardHeader>
    </Card>
  )
}
