// app/dashboard/monitor/page.tsx
// Monitor di app calcio: chi apre l'app, da dove, con che dispositivo e quali squadre confronta
// (tabella calcio_visits su Turso, vedi visits-db.ts). Tutto si può filtrare per IP.

import type { ReactNode } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import {
  Activity,
  Download,
  EyeOff,
  Filter,
  Globe,
  Network,
  RefreshCw,
  ScrollText,
  Search,
  Smartphone,
  Swords,
  Users,
  X,
} from "lucide-react"

import { requireAdmin } from "@/lib/auth"
import { ago, formatDateTime, place, requestClock } from "@/lib/format"
import { requestInfo } from "@/lib/request"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/admin/page-header"
import { StatCard } from "@/components/admin/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

import { ActivityChart, ChartLegend, COMPARE_FILL, VISIT_FILL } from "./activity-chart"
import {
  getMonitorData,
  RANGES,
  RECENT_LIMIT,
  type Count,
  type IpCount,
  type IpFilter,
  type MonitorData,
  type RangeKey,
  type Visit,
} from "./visits-db"

export const runtime = "edge"

export const metadata: Metadata = { title: "Monitor app calcio" }

const SCOPE_LABEL: Record<string, string> = {
  all: "Ufficiali",
  league: "Campionato",
  friendlies: "Con amichevoli",
}

function parseRange(value: string | undefined): RangeKey {
  return value && value in RANGES ? (value as RangeKey) : "7d"
}

/** `?ip=93.41.12.7,2a01:e11&mode=exclude` → filtro; più IP separati da virgole o spazi. */
function parseIpFilter(ip: string | undefined, mode: string | undefined): IpFilter | null {
  const terms = (ip ?? "")
    .toLowerCase()
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map((term) => term.slice(0, 64))
  const unique = [...new Set(terms)].slice(0, 10)
  return unique.length > 0 ? { terms: unique, mode: mode === "exclude" ? "exclude" : "only" } : null
}

function monitorHref(range: RangeKey, filter: IpFilter | null) {
  const params = new URLSearchParams({ range })
  if (filter && filter.terms.length > 0) {
    params.set("ip", filter.terms.join(","))
    if (filter.mode === "exclude") params.set("mode", "exclude")
  }
  return `/dashboard/monitor?${params}`
}

function onlyIp(ip: string): IpFilter {
  return { terms: [ip], mode: "only" }
}

/** Aggiunge l'IP agli esclusi, o parte da un nuovo filtro di esclusione. */
function excludeIp(filter: IpFilter | null, ip: string): IpFilter {
  const terms = filter?.mode === "exclude" ? filter.terms : []
  return { terms: terms.includes(ip) ? terms : [...terms, ip], mode: "exclude" }
}

function withoutTerm(filter: IpFilter, term: string): IpFilter | null {
  const terms = filter.terms.filter((t) => t !== term)
  return terms.length > 0 ? { ...filter, terms } : null
}

/** IP di chi guarda il monitor: di solito è lo stesso con cui apre app calcio. */
async function viewerIp() {
  const { ip } = await requestInfo()
  return ip && ip !== "::1" && ip !== "127.0.0.1" ? ip : null
}

export default async function MonitorPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; ip?: string; mode?: string }>
}) {
  await requireAdmin()

  const params = await searchParams
  const range = parseRange(params.range)
  const filter = parseIpFilter(params.ip, params.mode)
  const myIp = await viewerIp()

  let data: MonitorData | null = null
  let error: string | null = null
  try {
    data = await getMonitorData(range, filter)
  } catch (e) {
    error = e instanceof Error ? e.message : "Errore sconosciuto"
  }

  return (
    <>
      <PageHeader
        icon={Activity}
        title="Monitor app calcio"
        description={`Aperture dell'app e confronti · orari di Roma · aggiornato alle ${requestClock()}`}
        actions={
          <>
            <nav aria-label="Periodo" className="inline-flex rounded-lg border bg-card p-1 shadow-xs">
              {(Object.keys(RANGES) as RangeKey[]).map((key) => (
                <Link
                  key={key}
                  href={monitorHref(key, filter)}
                  aria-current={key === range ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                    key === range && "bg-muted text-foreground",
                  )}
                >
                  {RANGES[key].label}
                </Link>
              ))}
            </nav>
            <Button asChild size="icon" variant="outline" aria-label="Aggiorna">
              <Link href={monitorHref(range, filter)} prefetch={false}>
                <RefreshCw />
              </Link>
            </Button>
          </>
        }
      />

      <IpFilterBar range={range} filter={filter} myIp={myIp} totals={data?.totals ?? null} />

      {error ? (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base">Turso non raggiungibile</CardTitle>
            <CardDescription className="break-words">{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : data ? (
        <MonitorContent data={data} range={range} filter={filter} myIp={myIp} />
      ) : null}
    </>
  )
}

function IpFilterBar({
  range,
  filter,
  myIp,
  totals,
}: {
  range: RangeKey
  filter: IpFilter | null
  myIp: string | null
  totals: MonitorData["totals"] | null
}) {
  const myIpHidden = myIp !== null && filter?.mode === "exclude" && filter.terms.includes(myIp)
  const chipLink = "rounded-full text-muted-foreground transition-colors hover:text-foreground"
  const textLink = "underline-offset-4 transition-colors hover:text-foreground hover:underline"

  return (
    <Card className="gap-3 py-4">
      <CardContent className="space-y-3 px-4 sm:px-6">
        {/* Form GET semplice: i due pulsanti mandano anche `mode`, Invio vale "Mostra solo". */}
        <form
          key={monitorHref(range, filter)}
          method="get"
          action="/dashboard/monitor"
          className="flex flex-col gap-2 sm:flex-row"
        >
          <input type="hidden" name="range" value={range} />
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="ip"
              defaultValue={filter?.terms.join(", ") ?? ""}
              placeholder="Filtra per IP: 93.41.12.7, 93.41 oppure 2a01:e11:*"
              aria-label="IP da filtrare"
              autoComplete="off"
              spellCheck={false}
              className="pl-9 font-mono placeholder:font-sans"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" name="mode" value="only" className="flex-1 sm:flex-none">
              <Filter />
              Mostra solo
            </Button>
            <Button type="submit" name="mode" value="exclude" variant="outline" className="flex-1 sm:flex-none">
              <EyeOff />
              Escludi
            </Button>
          </div>
        </form>

        {filter ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">{filter.mode === "only" ? "Solo" : "Esclusi"}</span>
            {filter.terms.map((term) => (
              <span
                key={term}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border py-0.5 pl-2.5 pr-1 font-mono text-xs",
                  filter.mode === "only"
                    ? "border-[#2a78d6]/30 bg-[#2a78d6]/10"
                    : "bg-muted line-through decoration-muted-foreground/60",
                )}
              >
                {term}
                <Link
                  href={monitorHref(range, withoutTerm(filter, term))}
                  aria-label={`Togli ${term}`}
                  className={cn(chipLink, "p-0.5")}
                >
                  <X className="size-3" />
                </Link>
              </span>
            ))}
            <Link
              href={monitorHref(range, { ...filter, mode: filter.mode === "only" ? "exclude" : "only" })}
              className={cn("text-xs text-muted-foreground", textLink)}
            >
              {filter.mode === "only" ? "Escludi invece" : "Mostra solo questi"}
            </Link>
            <Button asChild size="sm" variant="ghost" className="ml-auto h-7 text-xs">
              <Link href={monitorHref(range, null)}>
                <X />
                Rimuovi filtro
              </Link>
            </Button>
          </div>
        ) : null}

        {filter?.mode === "only" && totals ? (
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            {totals.ips === 0 ? (
              "Nessun evento per questo filtro nel periodo."
            ) : (
              <>
                <span className="font-medium text-foreground">{totals.ips}</span> {totals.ips === 1 ? "IP" : "IP diversi"} ·{" "}
                <span className="font-medium text-foreground">{totals.visits + totals.comparisons}</span> eventi · primo{" "}
                {formatDateTime(totals.firstSeen)} · ultimo {formatDateTime(totals.lastSeen)} ({ago(totals.lastSeen)})
              </>
            )}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Prefissi (93.41 = 93.41.x.x), * come jolly, più IP separati da virgola.</span>
          {myIp ? (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                Il tuo IP: <span className="font-mono text-foreground">{myIp}</span>
              </span>
              {myIpHidden ? (
                <span>le tue visite sono nascoste</span>
              ) : (
                <Link href={monitorHref(range, excludeIp(filter, myIp))} className={textLink}>
                  Nascondi le mie visite
                </Link>
              )}
              <Link href={monitorHref(range, onlyIp(myIp))} className={textLink}>
                Solo le mie
              </Link>
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function MonitorContent({
  data,
  range,
  filter,
  myIp,
}: {
  data: MonitorData
  range: RangeKey
  filter: IpFilter | null
  myIp: string | null
}) {
  const { totals } = data
  const appShare = totals.visits > 0 ? Math.round((totals.appVisits / totals.visits) * 100) : 0
  const perVisit =
    totals.visits > 0
      ? (totals.comparisons / totals.visits).toLocaleString("it-IT", { maximumFractionDigits: 1 })
      : "0"

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Activity />}
          tone="blue"
          label="Visite"
          value={totals.visits}
          hint={totals.lastSeen ? `ultima ${ago(totals.lastSeen)}` : "nessuna nel periodo"}
        />
        <StatCard
          icon={<Users />}
          tone="violet"
          label="Visitatori unici"
          value={totals.visitors}
          hint={`IP + browser · ${totals.ips} IP`}
        />
        <StatCard
          icon={<Swords />}
          tone="orange"
          label="Confronti"
          value={totals.comparisons}
          hint={`${perVisit} per visita`}
        />
        <StatCard
          icon={<Download />}
          tone="aqua"
          label="Da app installata"
          value={totals.appVisits}
          hint={`${appShare}% delle visite`}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="text-base">Andamento</CardTitle>
            <CardDescription>
              {range === "24h" ? "Per ora" : range === "7d" ? "Ogni 6 ore" : "Per giorno"}
              {filter ? " · con il filtro IP" : ""}. Passa sopra una barra per i numeri.
            </CardDescription>
          </div>
          <ChartLegend />
        </CardHeader>
        <CardContent>
          <ActivityChart timeline={data.timeline} range={range} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <TopList
          icon={<Globe />}
          title="Luoghi"
          fill={VISIT_FILL}
          items={data.places.map((p) => ({ label: place(p), count: p.count }))}
        />
        <TopList icon={<Smartphone />} title="Dispositivi" fill={VISIT_FILL} items={data.devices} />
        <TopList icon={<Swords />} title="Confronti più visti" fill={COMPARE_FILL} items={data.matchups} />
        <TopList icon={<Network />} title="Provenienza" fill={VISIT_FILL} items={data.referrers} />
        <IpList ips={data.ips} range={range} filter={filter} myIp={myIp} />
      </div>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScrollText className="size-4 text-muted-foreground" />
            Log eventi
          </CardTitle>
          <CardDescription>
            {data.recent.length === RECENT_LIMIT ? `Gli ultimi ${RECENT_LIMIT}` : `${data.recent.length} eventi`} del
            periodo{filter ? " con il filtro IP" : ""}. Tocca un IP per vedere solo i suoi, passa sul dispositivo per lo
            user agent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.recent.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              {filter
                ? "Nessun evento con questo filtro nel periodo."
                : "Nessun evento nel periodo. Se l'app è online da un po', controlla che il Worker di app calcio abbia i secret TURSO_DATABASE_URL e TURSO_AUTH_TOKEN."}
            </p>
          ) : (
            <div className="max-h-[36rem] overflow-auto rounded-lg border">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="sticky top-0 z-10 bg-muted/90 text-xs text-muted-foreground backdrop-blur">
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
                    <VisitRow key={visit.id} visit={visit} range={range} myIp={myIp} />
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

function TopList({ icon, title, fill, items }: { icon: ReactNode; title: string; fill: string; items: Count[] }) {
  const max = Math.max(1, ...items.map((item) => item.count))
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base [&>svg]:size-4 [&>svg]:text-muted-foreground">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessun dato.</p>
        ) : (
          <ul className="space-y-2.5 text-sm">
            {items.map((item) => (
              <li key={item.label} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate" title={item.label}>
                    {item.label}
                  </span>
                  <span className="tabular-nums text-muted-foreground">{item.count.toLocaleString("it-IT")}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", fill)} style={{ width: `${(item.count / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function IpList({
  ips,
  range,
  filter,
  myIp,
}: {
  ips: IpCount[]
  range: RangeKey
  filter: IpFilter | null
  myIp: string | null
}) {
  return (
    <Card className="gap-4 md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4 text-muted-foreground" />
          IP più attivi
        </CardTitle>
        <CardDescription>Tocca un IP per vedere solo i suoi eventi, l&apos;occhio per nasconderlo.</CardDescription>
      </CardHeader>
      <CardContent>
        {ips.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessun dato.</p>
        ) : (
          <ul className="-mx-2 space-y-0.5 text-sm">
            {ips.map((row) => (
              <li key={row.ip} className="flex items-center gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-muted/60">
                <Link
                  href={monitorHref(range, onlyIp(row.ip))}
                  title="Mostra solo questo IP"
                  className="min-w-0 max-w-[45%] truncate font-mono text-[13px] hover:underline"
                >
                  {row.ip}
                </Link>
                {row.ip === myIp ? <Badge variant="outline">tu</Badge> : null}
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {place(row)}
                  {row.isp ? ` · ${row.isp}` : ""}
                </span>
                <span className="hidden whitespace-nowrap text-xs text-muted-foreground sm:inline">{ago(row.lastSeen)}</span>
                <Badge variant="secondary" className="tabular-nums">
                  {row.count.toLocaleString("it-IT")}
                </Badge>
                <Button asChild size="icon-sm" variant="ghost" className="size-7 text-muted-foreground">
                  <Link
                    href={monitorHref(range, excludeIp(filter, row.ip))}
                    title="Nascondi questo IP"
                    aria-label={`Nascondi ${row.ip}`}
                  >
                    <EyeOff />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function VisitRow({ visit, range, myIp }: { visit: Visit; range: RangeKey; myIp: string | null }) {
  const isCompare = visit.event === "compare"
  return (
    <tr className="align-top transition-colors hover:bg-muted/40">
      <td className="whitespace-nowrap px-3 py-2">
        <div className="tabular-nums">{formatDateTime(visit.createdAt || null)}</div>
        <div className="text-xs text-muted-foreground">{ago(visit.createdAt || null)}</div>
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium">
            <span className={cn("size-2 rounded-full", isCompare ? COMPARE_FILL : VISIT_FILL)} />
            {isCompare ? "Confronto" : "Visita"}
          </span>
          {visit.standalone ? <Badge variant="outline">App</Badge> : null}
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
        {visit.ip ? (
          <span className="inline-flex items-center gap-1.5">
            <Link href={monitorHref(range, onlyIp(visit.ip))} title="Mostra solo questo IP" className="hover:underline">
              {visit.ip}
            </Link>
            {visit.ip === myIp ? (
              <Badge variant="outline" className="font-sans">
                tu
              </Badge>
            ) : null}
          </span>
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
