// lib/audit.ts
// Registro delle azioni admin (tabella `admin_audit` su Turso): accessi al pannello e modifiche
// ai servizi, con IP e user agent di chi le ha fatte.

import "server-only"

import type { Row } from "@libsql/client"

import { requestInfo } from "@/lib/request"
import { getTursoClient } from "@/lib/turso"

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS admin_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    action TEXT NOT NULL,
    target TEXT,
    ip TEXT,
    user_agent TEXT
  )`,
  "CREATE INDEX IF NOT EXISTS admin_audit_created_at ON admin_audit(created_at)",
]

export type AuditAction = "login" | "login_failed" | "logout" | "service_on" | "service_off"

export type AuditEntry = {
  id: number
  createdAt: string
  action: AuditAction
  target: string | null
  ip: string | null
  userAgent: string | null
}

export const AUDIT_KINDS = {
  all: { label: "Tutto", actions: null },
  services: { label: "Servizi", actions: ["service_on", "service_off"] },
  access: { label: "Accessi", actions: ["login", "login_failed", "logout"] },
} as const satisfies Record<string, { label: string; actions: AuditAction[] | null }>

export type AuditKind = keyof typeof AUDIT_KINDS

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

function str(value: Row[string] | undefined): string | null {
  return value === null || value === undefined ? null : String(value)
}

function toEntry(row: Row): AuditEntry {
  return {
    id: Number(row.id ?? 0),
    createdAt: str(row.created_at) ?? "",
    action: str(row.action) as AuditAction,
    target: str(row.target),
    ip: str(row.ip),
    userAgent: str(row.user_agent),
  }
}

/** Scrive una riga nel registro. Non lancia mai: un registro giù non deve bloccare l'azione. */
export async function logAudit(action: AuditAction, target: string | null = null) {
  try {
    const { ip, userAgent } = await requestInfo()
    await ensureSchema()
    await getTursoClient().execute({
      sql: "INSERT INTO admin_audit (action, target, ip, user_agent) VALUES (?, ?, ?, ?)",
      args: [action, target, ip, userAgent],
    })
  } catch (error) {
    console.error("admin_audit: scrittura fallita", error)
  }
}

export async function getAuditEntries(kind: AuditKind, limit: number): Promise<AuditEntry[]> {
  await ensureSchema()
  const actions: readonly AuditAction[] | null = AUDIT_KINDS[kind].actions
  const where = actions ? `WHERE action IN (${actions.map(() => "?").join(", ")})` : ""
  const result = await getTursoClient().execute({
    sql: `SELECT * FROM admin_audit ${where} ORDER BY created_at DESC, id DESC LIMIT ${limit}`,
    args: actions ? [...actions] : [],
  })
  return result.rows.map(toEntry)
}

/** L'ultima accensione o spegnimento di ogni servizio, per servizio. */
export async function getLastServiceChanges(): Promise<Record<string, AuditEntry>> {
  await ensureSchema()
  const result = await getTursoClient().execute(`SELECT * FROM admin_audit WHERE id IN (
      SELECT MAX(id) FROM admin_audit WHERE action IN ('service_on', 'service_off') GROUP BY target
    )`)
  return Object.fromEntries(result.rows.map(toEntry).map((entry) => [entry.target ?? "", entry]))
}
