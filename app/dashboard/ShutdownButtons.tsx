// app/dashboard/ShutdownButtons.tsx
"use client"

import { Switch } from "@/components/ui/switch"

export function ShutdownButtons(props: {
  websiteActive: boolean
  apiActive: boolean
  dashboardActive: boolean
  adminActive: boolean
  onWebsiteChange: (checked: boolean) => void
  onApiChange: (checked: boolean) => void
  onDashboardChange: (checked: boolean) => void
  onAdminChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <div className="text-sm font-medium">Website</div>
          <div className="text-xs text-muted-foreground">shutdown_website</div>
        </div>
        <Switch checked={props.websiteActive} onCheckedChange={props.onWebsiteChange} disabled={props.disabled} />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <div className="text-sm font-medium">API</div>
          <div className="text-xs text-muted-foreground">shutdown_api</div>
        </div>
        <Switch checked={props.apiActive} onCheckedChange={props.onApiChange} disabled={props.disabled} />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <div className="text-sm font-medium">Dashboard</div>
          <div className="text-xs text-muted-foreground">shutdown_dashboard</div>
        </div>
        <Switch checked={props.dashboardActive} onCheckedChange={props.onDashboardChange} disabled={props.disabled} />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <div className="text-sm font-medium">Admin</div>
          <div className="text-xs text-muted-foreground">shutdown_admin</div>
        </div>
        <Switch checked={props.adminActive} onCheckedChange={props.onAdminChange} disabled={props.disabled} />
      </div>
    </div>
  )
}
