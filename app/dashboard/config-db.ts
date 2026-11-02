// app/dashboard/config-db.ts
// Helper server-side per leggere/scrivere la tabella `config` su Turso (libSQL).

import "server-only"

import { SERVICES, type ServiceKey } from "@/lib/services"
import { getTursoClient as getClient } from "@/lib/turso"

export type ConfigRow = {
  shutdown_website: number
  shutdown_api: number
  shutdown_dashboard: number
  shutdown_admin: number
  updated_at: string
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

  const row = res.rows[0] as (typeof res.rows)[number] | undefined
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

/** Servizio acceso? In DB: 0 = acceso, 1 = spento. */
export function isServiceOn(cfg: ConfigRow, service: ServiceKey) {
  return cfg[SERVICES[service].column as keyof ConfigRow] === 0
}

export async function setShutdownFlag(service: ServiceKey, shutdown: 0 | 1) {
  await setShutdownFlags([service], shutdown)
}

export async function setShutdownFlags(services: readonly ServiceKey[], shutdown: 0 | 1) {
  if (services.length === 0) return
  const client = getClient()
  await ensureConfigRow()

  const fields = services.map((service) => `${SERVICES[service].column} = ?`)
  await client.execute({
    sql: `UPDATE config
          SET ${fields.join(", ")}, updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
          WHERE id = 1`,
    args: services.map(() => shutdown),
  })
}
