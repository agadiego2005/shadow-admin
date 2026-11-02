// app/dashboard/monitor/visits-db.ts
// Lettura della tabella `calcio_visits` su Turso, scritta dal Worker di app calcio (lib/visits.ts):
// una riga per ogni apertura dell'app ("visit") e per ogni confronto tra due squadre ("compare").

import "server-only"

import type { InValue, Row } from "@libsql/client"

import { getTursoClient } from "@/lib/turso"

// Stesso schema di app calcio (lib/visits.ts): tenerli allineati. Qui serve solo se il monitor
// si apre prima che arrivi la prima visita.
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS calcio_visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    event TEXT NOT NULL CHECK (event IN ('visit','compare')),
    path TEXT,
    team_a TEXT,
    team_b TEXT,
    scope TEXT,
    ip TEXT,
    country TEXT,
    region TEXT,
    city TEXT,
    isp TEXT,
    device TEXT,
    os TEXT,
    browser TEXT,
    user_agent TEXT,
    language TEXT,
    timezone TEXT,
    screen TEXT,
    standalone INTEGER NOT NULL DEFAULT 0,
    referrer TEXT
  )`,
  "CREATE INDEX IF NOT EXISTS calcio_visits_created_at ON calcio_visits(created_at)",
]

// Ogni periodo è fatto di `buckets` fasce del grafico (ora, 6 ore o giorno di Roma); l'ultima è
// quella in corso, quindi il periodo parte dall'inizio della prima fascia.
export const RANGES = {
  "24h": { label: "24 ore", bucket: "hour", buckets: 24 },
  "7d": { label: "7 giorni", bucket: "6h", buckets: 28 },
  "30d": { label: "30 giorni", bucket: "day", buckets: 30 },
} as const

export type RangeKey = keyof typeof RANGES
export type BucketSize = (typeof RANGES)[RangeKey]["bucket"]

export const RECENT_LIMIT = 200

/**
 * Filtro sugli IP. Ogni termine è un IP intero ("93.41.12.7"), un prefisso che si ferma a un
 * separatore ("93.41" = 93.41.x.x, "2a01:e11" = 2a01:e11:…) o un modello con * come jolly.
 */
export type IpFilter = { terms: string[]; mode: "only" | "exclude" }

export type Visit = {
  id: number
  createdAt: string
  event: "visit" | "compare"
  path: string | null
  teamA: string | null
  teamB: string | null
  scope: string | null
  ip: string | null
  country: string | null
  region: string | null
  city: string | null
  isp: string | null
  device: string | null
  os: string | null
  browser: string | null
  userAgent: string | null
  language: string | null
  timezone: string | null
  screen: string | null
  standalone: boolean
  referrer: string | null
}

export type Count = { label: string; count: number }

export type PlaceCount = {
  city: string | null
  country: string | null
  count: number
}

export type IpCount = {
  ip: string
  country: string | null
  city: string | null
  isp: string | null
  lastSeen: string | null
  count: number
}

export type TimelineBucket = { start: string; end: string; visits: number; comparisons: number }

export type MonitorData = {
  totals: {
    visits: number
    visitors: number
    comparisons: number
    appVisits: number
    ips: number
    firstSeen: string | null
    lastSeen: string | null
  }
  timeline: TimelineBucket[]
  places: PlaceCount[]
  devices: Count[]
  matchups: Count[]
  referrers: Count[]
  ips: IpCount[]
  recent: Visit[]
}

function str(value: Row[string] | undefined): string | null {
  return value === null || value === undefined ? null : String(value)
}

function num(value: Row[string] | undefined): number {
  return Number(value ?? 0)
}

let schemaReady: Promise<unknown> | null = null

function ensureSchema() {
  const client = getTursoClient()
  schemaReady ??= SCHEMA.reduce<Promise<unknown>>(
    (previous, sql) => previous.then(() => client.execute(sql)),
    Promise.resolve(),
  ).catch((error: unknown) => {
    schemaReady = null
    throw error
  })
  return schemaReady
}

function toCounts(rows: Row[]): Count[] {
  return rows.map((row) => ({ label: str(row.label) ?? "?", count: num(row.n) }))
}

function toVisit(row: Row): Visit {
  return {
    id: num(row.id),
    createdAt: str(row.created_at) ?? "",
    event: row.event === "compare" ? "compare" : "visit",
    path: str(row.path),
    teamA: str(row.team_a),
    teamB: str(row.team_b),
    scope: str(row.scope),
    ip: str(row.ip),
    country: str(row.country),
    region: str(row.region),
    city: str(row.city),
    isp: str(row.isp),
    device: str(row.device),
    os: str(row.os),
    browser: str(row.browser),
    userAgent: str(row.user_agent),
    language: str(row.language),
    timezone: str(row.timezone),
    screen: str(row.screen),
    standalone: num(row.standalone) === 1,
    referrer: str(row.referrer),
  }
}

const HOUR = 60 * 60 * 1000

const romeParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Rome",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
})

function bucketKey(time: number, size: BucketSize): string {
  if (size === "hour") return String(time)
  const parts = Object.fromEntries(romeParts.formatToParts(time).map((part) => [part.type, part.value]))
  const day = `${parts.year}-${parts.month}-${parts.day}`
  return size === "day" ? day : `${day}|${Math.floor(Number(parts.hour) / 6)}`
}

/** Le fasce del grafico, dalla più vecchia a quella in corso, con le ore UTC che contengono. */
function timelineBuckets(range: RangeKey) {
  const { bucket, buckets: count } = RANGES[range]
  const result: { key: string; start: number; end: number; hours: string[] }[] = []
  // Si va all'indietro un'ora alla volta, così le fasce seguono l'ora legale di Roma.
  for (let time = Math.floor(Date.now() / HOUR) * HOUR; ; time -= HOUR) {
    const key = bucketKey(time, bucket)
    if (result[0]?.key !== key) {
      if (result.length === count) break
      result.unshift({ key, start: time, end: time + HOUR, hours: [] })
    }
    result[0].start = time
    result[0].hours.push(new Date(time).toISOString().slice(0, 13))
  }
  return result
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

function ipTermCondition(term: string): { sql: string; args: InValue[] } {
  const like = escapeLike(term)
  if (term.includes("*")) return { sql: "ip LIKE ? ESCAPE '\\'", args: [like.replaceAll("*", "%")] }
  if (/[.:]$/.test(term)) return { sql: "ip LIKE ? ESCAPE '\\'", args: [`${like}%`] }
  // IP intero oppure prefisso fino a un separatore: "93.41" prende 93.41.x.x ma non 93.410.x.x.
  return {
    sql: "(ip = ? OR ip LIKE ? ESCAPE '\\' OR ip LIKE ? ESCAPE '\\')",
    args: [term, `${like}.%`, `${like}:%`],
  }
}

function ipCondition(filter: IpFilter): { sql: string; args: InValue[] } {
  const terms = filter.terms.map(ipTermCondition)
  const match = terms.map((term) => term.sql).join(" OR ")
  const args = terms.flatMap((term) => term.args)
  return filter.mode === "only"
    ? { sql: `(${match})`, args }
    : { sql: `(ip IS NULL OR NOT (${match}))`, args }
}

/** Riepilogo, andamento e ultimi eventi del periodo; con `ipFilter` tutto rispetta il filtro. */
export async function getMonitorData(range: RangeKey, ipFilter: IpFilter | null): Promise<MonitorData> {
  const client = getTursoClient()
  await ensureSchema()

  const buckets = timelineBuckets(range)
  const since = new Date(buckets[0].start).toISOString()
  const filter = ipFilter && ipFilter.terms.length > 0 ? ipCondition(ipFilter) : null
  const where = filter ? `created_at >= ? AND ${filter.sql}` : "created_at >= ?"
  const args: InValue[] = filter ? [since, ...filter.args] : [since]
  const query = (sql: string) => client.execute({ sql, args })

  const [totals, hourly, places, devices, matchups, referrers, ips, recent] = await Promise.all([
    query(`SELECT
        COALESCE(SUM(event = 'visit'), 0) AS visits,
        COUNT(DISTINCT CASE WHEN event = 'visit'
          THEN COALESCE(ip, '') || '|' || COALESCE(user_agent, '') END) AS visitors,
        COALESCE(SUM(event = 'compare'), 0) AS comparisons,
        COALESCE(SUM(event = 'visit' AND standalone = 1), 0) AS app_visits,
        COUNT(DISTINCT ip) AS ips,
        MIN(created_at) AS first_seen,
        MAX(created_at) AS last_seen
      FROM calcio_visits WHERE ${where}`),
    query(`SELECT substr(created_at, 1, 13) AS hour,
        SUM(event = 'visit') AS visits, SUM(event = 'compare') AS comparisons
      FROM calcio_visits WHERE ${where} GROUP BY hour`),
    query(`SELECT COALESCE(city, region) AS city, country, COUNT(*) AS n
      FROM calcio_visits WHERE ${where} AND event = 'visit'
      GROUP BY COALESCE(city, region), country ORDER BY n DESC LIMIT 8`),
    query(`SELECT COALESCE(device, '?') || ' · ' || COALESCE(os, '?') || ' · ' || COALESCE(browser, '?') AS label,
        COUNT(*) AS n
      FROM calcio_visits WHERE ${where} AND event = 'visit'
      GROUP BY label ORDER BY n DESC LIMIT 8`),
    query(`SELECT team_a || ' vs ' || team_b AS label, COUNT(*) AS n
      FROM calcio_visits WHERE ${where} AND event = 'compare'
      GROUP BY label ORDER BY n DESC LIMIT 8`),
    query(`SELECT COALESCE(referrer, 'Diretto / app') AS label, COUNT(*) AS n
      FROM calcio_visits WHERE ${where} AND event = 'visit'
      GROUP BY label ORDER BY n DESC LIMIT 8`),
    query(`SELECT ip, MAX(country) AS country, MAX(city) AS city, MAX(isp) AS isp,
        MAX(created_at) AS last_seen, COUNT(*) AS n
      FROM calcio_visits WHERE ${where} AND ip IS NOT NULL
      GROUP BY ip ORDER BY n DESC LIMIT 10`),
    query(`SELECT * FROM calcio_visits WHERE ${where}
      ORDER BY created_at DESC, id DESC LIMIT ${RECENT_LIMIT}`),
  ])

  const byHour = new Map(hourly.rows.map((row) => [str(row.hour), row]))
  const t = totals.rows[0]
  return {
    totals: {
      visits: num(t?.visits),
      visitors: num(t?.visitors),
      comparisons: num(t?.comparisons),
      appVisits: num(t?.app_visits),
      ips: num(t?.ips),
      firstSeen: str(t?.first_seen),
      lastSeen: str(t?.last_seen),
    },
    timeline: buckets.map((bucket) => {
      const rows = bucket.hours.map((hour) => byHour.get(hour))
      return {
        start: new Date(bucket.start).toISOString(),
        end: new Date(bucket.end).toISOString(),
        visits: rows.reduce((sum, row) => sum + num(row?.visits), 0),
        comparisons: rows.reduce((sum, row) => sum + num(row?.comparisons), 0),
      }
    }),
    places: places.rows.map((row) => ({
      city: str(row.city),
      country: str(row.country),
      count: num(row.n),
    })),
    devices: toCounts(devices.rows),
    matchups: toCounts(matchups.rows),
    referrers: toCounts(referrers.rows),
    ips: ips.rows.map((row) => ({
      ip: str(row.ip) ?? "",
      country: str(row.country),
      city: str(row.city),
      isp: str(row.isp),
      lastSeen: str(row.last_seen),
      count: num(row.n),
    })),
    recent: recent.rows.map(toVisit),
  }
}
