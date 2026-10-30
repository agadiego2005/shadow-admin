// app/dashboard/monitor/page.tsx
// Monitor di app calcio: chi apre l'app, da dove, con che dispositivo e quali squadre confronta
// (tabella calcio_visits su Turso, vedi visits-db.ts).

import type { ReactNode } from "react"
import Link from "next/link"
import { Activity, ArrowLeft, Download, Globe, Network, RefreshCw, Smartphone, Swords, Users } from "lucide-react"

import { requireAdmin } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import {
  getMonitorData,
  RANGES,
  RECENT_LIMIT,
  type Count,
  type MonitorData,
  type RangeKey,
  type Visit,
} from "./visits-db"

export const runtime = "edge"

const SCOPE_LABEL: Record<string, string> = {
  all: "Ufficiali",
  league: "Campionato",
  friendlies: "Con amichevoli",
}

const dateTime = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
})

function parseRange(value: string | undefined): RangeKey {
  return value && value in RANGES ? (value as RangeKey) : "7d"
}

function monitorHref(range: RangeKey, ip: string | null) {
  const params = new URLSearchParams({ range })
  if (ip) params.set("ip", ip)
  return `/dashboard/monitor?${params}`
}

// Nome del paese in italiano ("IT" → "Italia"): le emoji delle bandiere su Windows sono solo lettere.
const countryNames = new Intl.DisplayNames("it", { type: "region" })

function countryName(code: string | null) {
  if (!code || !/^[A-Z]{2}$/i.test(code)) return code
  try {
    return countryNames.of(code.toUpperCase()) ?? code
  } catch {
    return code
  }
}

function place(v: { city: string | null; region?: string | null; country: string | null }) {
  const parts = [v.city, v.region, countryName(v.country)].filter(Boolean)
  return parts.length > 0 ? parts.join(", ") : "Sconosciuto"
}

export default async function MonitorPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; ip?: string }>
}) {
  await requireAdmin()

  const params = await searchParams
  const range = parseRange(params.range)
  const ip = params.ip?.trim() || null

  let data: MonitorData | null = null
  let error: string | null = null
  try {
    data = await getMonitorData(range, ip)
  } catch (e) {
    error = e instanceof Error ? e.message : "Errore sconosciuto"
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto max-w-6xl p-6 space-y-6">
        {/* Top bar */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Control Center
            </Link>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <h1 className="text-2xl font-semibold tracking-tight">Monitor app calcio</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Aperture dell&apos;app e confronti (Turso: calcio_visits). Orari di Roma.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(RANGES) as RangeKey[]).map((key) => (
              <Button key={key} asChild size="sm" variant={key === range ? "default" : "outline"}>
                <Link href={monitorHref(key, ip)}>{RANGES[key].label}</Link>
              </Button>
            ))}
            <Button asChild size="sm" variant="ghost" aria-label="Aggiorna">
              <Link href={monitorHref(range, ip)} prefetch={false}>
                <RefreshCw className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {ip ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
            <span>
              Filtro IP: <span className="font-mono">{ip}</span>
            </span>
            <Button asChild size="sm" variant="outline">
              <Link href={monitorHref(range, null)}>Rimuovi filtro</Link>
            </Button>
          </div>
        ) : null}

        {error ? (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-base">Turso non raggiungibile</CardTitle>
              <CardDescription className="break-words">{error}</CardDescription>
            </CardHeader>
          </Card>
        ) : data ? (
          <MonitorContent data={data} range={range} ip={ip} />
        ) : null}
      </div>
    </div>
  )
}

function MonitorContent({ data, range, ip }: { data: MonitorData; range: RangeKey; ip: string | null }) {
  const { totals } = data
  const appShare = totals.visits > 0 ? Math.round((totals.appVisits / totals.visits) * 100) : 0

  return (
    <>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Activity className="h-4 w-4" />} label="Visite" value={totals.visits} />
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Visitatori unici"
          value={totals.visitors}
          hint="IP + browser diversi"
        />
        <StatCard icon={<Swords className="h-4 w-4" />} label="Confronti" value={totals.comparisons} />
        <StatCard
          icon={<Download className="h-4 w-4" />}
          label="Da app installata"
          value={totals.appVisits}
          hint={`${appShare}% delle visite`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <TopList
          icon={<Globe className="h-4 w-4" />}
          title="Luoghi"
          items={data.places.map((p) => ({ label: place(p), count: p.count }))}
        />
        <TopList icon={<Smartphone className="h-4 w-4" />} title="Dispositivi" items={data.devices} />
        <TopList icon={<Swords className="h-4 w-4" />} title="Confronti più visti" items={data.matchups} />
        <TopList icon={<Network className="h-4 w-4" />} title="Provenienza" items={data.referrers} />
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              IP più attivi
            </CardTitle>
            <CardDescription>Tocca un IP per vedere solo i suoi eventi.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.ips.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun dato.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {data.ips.map((row) => (
                  <li key={row.ip} className="flex items-center justify-between gap-3">
                    <Link
                      href={monitorHref(range, row.ip)}
                      className="min-w-0 truncate font-mono hover:underline"
                    >
                      {row.ip}
                    </Link>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {place(row)}
                      {row.isp ? ` · ${row.isp}` : ""}
                    </span>
                    <Badge variant="secondary">{row.count}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ultimi eventi</CardTitle>
          <CardDescription>
            Gli ultimi {RECENT_LIMIT} del periodo{ip ? " per questo IP" : ""}. Passa sul dispositivo
            per lo user agent completo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessun evento nel periodo. Se l&apos;app è online da un po&apos;, controlla che il Worker
              di app calcio abbia i secret TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Quando</th>
                    <th className="px-3 py-2 font-medium">Evento</th>
                    <th className="px-3 py-2 font-medium">IP</th>
                    <th className="px-3 py-2 font-medium">Luogo · rete</th>
                    <th className="px-3 py-2 font-medium">Dispositivo</th>
                    <th className="px-3 py-2 font-medium">Pagina / confronto</th>
                    <th className="px-3 py-2 font-medium">Lingua · fuso</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.recent.map((visit) => (
                    <VisitRow key={visit.id} visit={visit} range={range} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode
  label: string
  value: number
  hint?: string
}) {
  return (
    <Card className="gap-2">
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          {icon}
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tabular-nums">{value.toLocaleString("it-IT")}</div>
        {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  )
}

function TopList({ icon, title, items }: { icon: ReactNode; title: string; items: Count[] }) {
  const max = Math.max(1, ...items.map((item) => item.count))
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessun dato.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {items.map((item) => (
              <li key={item.label} className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">{item.label}</span>
                  <span className="tabular-nums text-muted-foreground">{item.count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${(item.count / max) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function VisitRow({ visit, range }: { visit: Visit; range: RangeKey }) {
  const isCompare = visit.event === "compare"
  return (
    <tr className="align-top">
      <td className="whitespace-nowrap px-3 py-2 tabular-nums">
        {visit.createdAt ? dateTime.format(new Date(visit.createdAt)) : "?"}
      </td>
      <td className="px-3 py-2">
        <Badge variant={isCompare ? "default" : "secondary"}>{isCompare ? "Confronto" : "Visita"}</Badge>
        {visit.standalone ? (
          <Badge variant="outline" className="ml-1">
            App
          </Badge>
        ) : null}
      </td>
      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
        {visit.ip ? (
          <Link href={monitorHref(range, visit.ip)} className="hover:underline">
            {visit.ip}
          </Link>
        ) : (
          "?"
        )}
      </td>
      <td className="px-3 py-2">
        <div className="min-w-40">{place(visit)}</div>
        {visit.isp ? <div className="text-xs text-muted-foreground">{visit.isp}</div> : null}
      </td>
      <td className="px-3 py-2" title={visit.userAgent ?? undefined}>
        <div className="whitespace-nowrap capitalize">{visit.device ?? "?"}</div>
        <div className="whitespace-nowrap text-xs text-muted-foreground">
          {[visit.os, visit.browser, visit.screen].filter(Boolean).join(" · ")}
        </div>
      </td>
      <td className={cn("px-3 py-2", isCompare && "font-medium")}>
        {isCompare ? (
          <>
            <div>
              {visit.teamA} vs {visit.teamB}
            </div>
            <div className="text-xs font-normal text-muted-foreground">
              {SCOPE_LABEL[visit.scope ?? ""] ?? visit.scope ?? ""}
            </div>
          </>
        ) : (
          <span className="whitespace-nowrap font-mono text-xs">{visit.path ?? "/"}</span>
        )}
        {visit.referrer ? (
          <div className="text-xs font-normal text-muted-foreground">da {visit.referrer}</div>
        ) : null}
      </td>
      <td className="px-3 py-2 text-xs">
        <div>{visit.language ?? "—"}</div>
        <div className="text-muted-foreground">{visit.timezone ?? ""}</div>
      </td>
    </tr>
  )
}
