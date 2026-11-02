// lib/format.ts
// Formati condivisi dalle pagine admin: date e ore di Roma, tempi relativi, luoghi in italiano.

const rome = { timeZone: "Europe/Rome" } as const

export const dateTime = new Intl.DateTimeFormat("it-IT", {
  ...rome,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
})

export const clock = new Intl.DateTimeFormat("it-IT", { ...rome, hour: "2-digit", minute: "2-digit" })

const relative = new Intl.RelativeTimeFormat("it", { numeric: "auto" })

/** "adesso", "3 minuti fa", "ieri"… */
export function ago(iso: string | null) {
  if (!iso) return ""
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 45) return "adesso"
  if (abs < 60 * 60) return relative.format(Math.round(seconds / 60), "minute")
  if (abs < 24 * 60 * 60) return relative.format(Math.round(seconds / 3600), "hour")
  return relative.format(Math.round(seconds / 86400), "day")
}

export function formatDateTime(iso: string | null) {
  return iso ? dateTime.format(new Date(iso)) : "?"
}

/** Ora della richiesta: le pagine sono renderizzate sul server a ogni apertura. */
export function requestClock() {
  return clock.format(Date.now())
}

// Nome del paese in italiano ("IT" → "Italia"): le emoji delle bandiere su Windows sono solo lettere.
const countryNames = new Intl.DisplayNames("it", { type: "region" })

export function countryName(code: string | null) {
  if (!code || !/^[A-Z]{2}$/i.test(code)) return code
  try {
    return countryNames.of(code.toUpperCase()) ?? code
  } catch {
    return code
  }
}

export function place(v: { city: string | null; region?: string | null; country: string | null }) {
  const parts = [v.city, v.region, countryName(v.country)].filter(Boolean)
  return parts.length > 0 ? parts.join(", ") : "Sconosciuto"
}

/** "Chrome · Windows" da uno user agent, per i log dove non serve il dettaglio. */
export function describeUserAgent(ua: string | null) {
  if (!ua) return null
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /CriOS|Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : null
  const os = /iPhone|iPad|iPod/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Windows/.test(ua)
        ? "Windows"
        : /Macintosh|Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : null
  return [browser, os].filter(Boolean).join(" · ") || null
}
