// app/dashboard/config-db.ts
// Helper server-side per leggere/scrivere la tabella `config` su Turso (libSQL).

import "server-only"

import { createClient, type Client } from "@libsql/client"

export type ConfigRow = {
  shutdown_website: number
  shutdown_api: number
  shutdown_dashboard: number
  shutdown_admin: number
  updated_at: string
}

let _client: Client | null = null

function getClient(): Client {
  if (_client) return _client

  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!url) {
    throw new Error(
      "Missing TURSO_DATABASE_URL (o DATABASE_URL). Imposta le env per connetterti a Turso/libSQL."
    )
  }

  _client = createClient({ url, authToken })
  return _client
}

async function ensureConfigRow() {
  const client = getClient()

  // Fail-safe: crea tabella se manca.
  await client.execute({
    sql: `CREATE TABLE IF NOT EXISTS config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shutdown_website   INTEGER NOT NULL DEFAULT 0 CHECK (shutdown_website IN (0,1)),
      shutdown_api       INTEGER NOT NULL DEFAULT 0 CHECK (shutdown_api IN (0,1)),
      shutdown_dashboard INTEGER NOT NULL DEFAULT 0 CHECK (shutdown_dashboard IN (0,1)),
      shutdown_admin     INTEGER NOT NULL DEFAULT 0 CHECK (shutdown_admin IN (0,1)),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );`,
  })

  // Una riga fissa: id=1
  await client.execute({ sql: "INSERT OR IGNORE INTO config(id) VALUES(1)" })
}

export async function getConfig(): Promise<ConfigRow> {
  const client = getClient()
  await ensureConfigRow()

  const res = await client.execute({
    sql: "SELECT shutdown_website, shutdown_api, shutdown_dashboard, shutdown_admin, updated_at FROM config WHERE id = 1",
  })

  const row = res.rows?.[0] as any
  if (!row) {
    return {
      shutdown_website: 0,
      shutdown_api: 0,
      shutdown_dashboard: 0,
      shutdown_admin: 0,
      updated_at: new Date().toISOString(),
    }
  }

  return {
    shutdown_website: Number(row.shutdown_website ?? 0),
    shutdown_api: Number(row.shutdown_api ?? 0),
    shutdown_dashboard: Number(row.shutdown_dashboard ?? 0),
    shutdown_admin: Number(row.shutdown_admin ?? 0),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  }
}

export type ServiceKey = "website" | "api" | "dashboard" | "admin"

const FIELD_BY_SERVICE: Record<ServiceKey, string> = {
  website: "shutdown_website",
  api: "shutdown_api",
  dashboard: "shutdown_dashboard",
  admin: "shutdown_admin",
}

export async function setShutdownFlag(service: ServiceKey, shutdown: 0 | 1) {
  const client = getClient()
  await ensureConfigRow()

  const field = FIELD_BY_SERVICE[service]
  await client.execute({
    sql: `UPDATE config
          SET ${field} = ?, updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
          WHERE id = 1`,
    args: [shutdown],
  })
}
