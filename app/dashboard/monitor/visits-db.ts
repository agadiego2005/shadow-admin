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

export const RANGES = {
  "24h": { label: "24 ore", hours: 24 },
  "7d": { label: "7 giorni", hours: 24 * 7 },
  "30d": { label: "30 giorni", hours: 24 * 30 },
} as const

export type RangeKey = keyof typeof RANGES

export const RECENT_LIMIT = 200

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
  count: number
}

export type MonitorData = {
  totals: { visits: number; visitors: number; comparisons: number; appVisits: number }
  places: PlaceCount[]
  devices: Count[]
  matchups: Count[]
  referrers: Count[]
  ips: IpCount[]
  recent: Visit[]
}

function str(value: Row[string]): string | null {
  return value === null || value === undefined ? null : String(value)
}

function num(value: Row[string]): number {
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

/** Riepilogo e ultimi eventi del periodo; con `ip` tutto è filtrato su quell'indirizzo. */
export async function getMonitorData(range: RangeKey, ip: string | null): Promise<MonitorData> {
  const client = getTursoClient()
  await ensureSchema()

  const since = new Date(Date.now() - RANGES[range].hours * 60 * 60 * 1000).toISOString()
  const where = ip ? "created_at >= ? AND ip = ?" : "created_at >= ?"
  const args: InValue[] = ip ? [since, ip] : [since]
  const query = (sql: string) => client.execute({ sql, args })

  const [totals, places, devices, matchups, referrers, ips, recent] = await Promise.all([
    query(`SELECT
        COALESCE(SUM(event = 'visit'), 0) AS visits,
        COUNT(DISTINCT CASE WHEN event = 'visit'
          THEN COALESCE(ip, '') || '|' || COALESCE(user_agent, '') END) AS visitors,
        COALESCE(SUM(event = 'compare'), 0) AS comparisons,
        COALESCE(SUM(event = 'visit' AND standalone = 1), 0) AS app_visits
      FROM calcio_visits WHERE ${where}`),
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
    query(`SELECT ip, MAX(country) AS country, MAX(city) AS city, MAX(isp) AS isp, COUNT(*) AS n
      FROM calcio_visits WHERE ${where} AND ip IS NOT NULL
      GROUP BY ip ORDER BY n DESC LIMIT 10`),
    query(`SELECT * FROM calcio_visits WHERE ${where}
      ORDER BY created_at DESC, id DESC LIMIT ${RECENT_LIMIT}`),
  ])

  const t = totals.rows[0]
  return {
    totals: {
      visits: num(t?.visits),
      visitors: num(t?.visitors),
      comparisons: num(t?.comparisons),
      appVisits: num(t?.app_visits),
    },
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
      count: num(row.n),
    })),
    recent: recent.rows.map(toVisit),
  }
}
