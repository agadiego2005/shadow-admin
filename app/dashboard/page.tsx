// app/dashboard/page.tsx
import { cookies } from "next/headers"
import { requireAdmin } from "@/lib/auth"
import { DashboardClient } from "./DashboardClient"
import { getConfig } from "./config-db"
export const runtime = 'edge';
export default async function DashboardPage() {
  await requireAdmin()

  const store = await cookies()
  const lastAction = store.get("last_shutdown_action")?.value ?? "nessuna"

  const cfg = await getConfig()

  // In DB: 0 = acceso (online), 1 = spento (offline)
  const websiteStatus: "online" | "offline" = cfg.shutdown_website === 0 ? "online" : "offline"
  const apiStatus: "online" | "offline" = cfg.shutdown_api === 0 ? "online" : "offline"
  const dashboardStatus: "online" | "offline" = cfg.shutdown_dashboard === 0 ? "online" : "offline"
  const adminStatus: "online" | "offline" = cfg.shutdown_admin === 0 ? "online" : "offline"

  return (
    <DashboardClient
      lastAction={lastAction}
      websiteStatus={websiteStatus}
      apiStatus={apiStatus}
      dashboardStatus={dashboardStatus}
      adminStatus={adminStatus}
    />
  )
}
