// lib/turso.ts
// Client Turso (libSQL) condiviso dalle pagine admin: tabella config e monitor visite.

import "server-only"

import { createClient, type Client } from "@libsql/client"

let _client: Client | null = null

export function getTursoClient(): Client {
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
