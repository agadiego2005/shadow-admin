// app/dashboard/page.tsx
import { cookies } from "next/headers"
import { requireAdmin } from "@/lib/auth"
import { DashboardClient } from "./DashboardClient"

export default async function DashboardPage() {
  await requireAdmin()

  const store = await cookies()
  const lastAction = store.get("last_shutdown_action")?.value ?? "nessuna"

  const websiteStatus = (store.get("website_status")?.value ?? "online") as "online" | "offline"
  const apiStatus = (store.get("api_status")?.value ?? "online") as "online" | "offline"
  const dashboardStatus = (store.get("dashboard_status")?.value ?? "online") as "online" | "offline"

  return (
    <DashboardClient
      lastAction={lastAction}
      websiteStatus={websiteStatus}
      apiStatus={apiStatus}
      dashboardStatus={dashboardStatus}
    />
  )
}
