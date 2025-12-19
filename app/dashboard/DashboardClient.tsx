// app/dashboard/DashboardClient.tsx
"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useActionState } from "react"
import { toast } from "sonner"
import { ShieldAlert, Activity, LayoutDashboard, User } from "lucide-react"
import { useRouter } from "next/navigation"

import type { ActionState } from "./actions"
import {
  setApiActiveAction,
  setDashboardActiveAction,
  setWebsiteActiveAction,
  setAdminActiveAction,
  logoutAction,
} from "./actions"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function StatusBadge({ status }: { status: "online" | "offline" }) {
  return (
    <Badge variant={status === "online" ? "secondary" : "destructive"} className="gap-2">
      <span
        className={
          "h-2 w-2 rounded-full " + (status === "online" ? "bg-green-500" : "bg-red-500")
        }
      />
      {status.toUpperCase()}
    </Badge>
  )
}

function ServiceCard({
  title,
  subtitle,
  status,
  checked,
  disabled,
  onCheckedChange,
}: {
  title: string
  subtitle: string
  status: "online" | "offline"
  checked: boolean
  disabled?: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(80%_60%_at_50%_0%,hsl(var(--muted))_0%,transparent_60%)]" />
      <CardHeader className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{subtitle}</CardDescription>
          </div>
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="relative space-y-3">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Power</div>
            <div className="text-xs text-muted-foreground">0 = acceso, 1 = spento (Turso: config)</div>
          </div>
          <Switch
            checked={checked}
            onCheckedChange={onCheckedChange}
            disabled={disabled}
            aria-label={`Toggle ${title}`}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardClient(props: {
  lastAction: string
  websiteStatus: "online" | "offline"
  apiStatus: "online" | "offline"
  dashboardStatus: "online" | "offline"
  adminStatus: "online" | "offline"
}) {
  const router = useRouter()

  const [websiteState, websiteDispatch] = useActionState<ActionState, FormData>(
    setWebsiteActiveAction,
    null
  )
  const [apiState, apiDispatch] = useActionState<ActionState, FormData>(setApiActiveAction, null)
  const [dashState, dashDispatch] = useActionState<ActionState, FormData>(
    setDashboardActiveAction,
    null
  )
  const [adminState, adminDispatch] = useActionState<ActionState, FormData>(
    setAdminActiveAction,
    null
  )

  const [isWebsitePending, startWebsite] = useTransition()
  const [isApiPending, startApi] = useTransition()
  const [isDashPending, startDash] = useTransition()
  const [isAdminPending, startAdmin] = useTransition()

  const [websiteActive, setWebsiteActive] = useState(props.websiteStatus === "online")
  const [apiActive, setApiActive] = useState(props.apiStatus === "online")
  const [dashActive, setDashActive] = useState(props.dashboardStatus === "online")
  const [adminActive, setAdminActive] = useState(props.adminStatus === "online")

  useEffect(() => setWebsiteActive(props.websiteStatus === "online"), [props.websiteStatus])
  useEffect(() => setApiActive(props.apiStatus === "online"), [props.apiStatus])
  useEffect(() => setDashActive(props.dashboardStatus === "online"), [props.dashboardStatus])
  useEffect(() => setAdminActive(props.adminStatus === "online"), [props.adminStatus])

  useEffect(() => {
    const s = websiteState ?? apiState ?? dashState ?? adminState
    if (!s) return
    if (s.ok) toast.success(`${s.title}: ok`, { description: s.message })
    else toast.error(`${s.title}: errore`, { description: s.message })

    // rilegge da server (Turso) i nuovi stati
    if (s.ok) router.refresh()
  }, [websiteState?.ts, apiState?.ts, dashState?.ts, adminState?.ts, router])

  const websiteStatus: "online" | "offline" = websiteActive ? "online" : "offline"
  const apiStatus: "online" | "offline" = apiActive ? "online" : "offline"
  const dashboardStatus: "online" | "offline" = dashActive ? "online" : "offline"
  const adminStatus: "online" | "offline" = adminActive ? "online" : "offline"

  const setActive = useMemo(() => {
    const fd = (checked: boolean) => {
      const form = new FormData()
      // checked=true => servizio ATTIVO => shutdown=0
      form.set("active", checked ? "1" : "0")
      return form
    }
    return {
      website: (checked: boolean) => startWebsite(() => websiteDispatch(fd(checked))),
      api: (checked: boolean) => startApi(() => apiDispatch(fd(checked))),
      dashboard: (checked: boolean) => startDash(() => dashDispatch(fd(checked))),
      admin: (checked: boolean) => startAdmin(() => adminDispatch(fd(checked))),
    }
  }, [startWebsite, websiteDispatch, startApi, apiDispatch, startDash, dashDispatch, startAdmin, adminDispatch])

  const activity = [
    { icon: <Activity className="h-4 w-4" />, title: "Ultima azione", desc: props.lastAction },
    { icon: <ShieldAlert className="h-4 w-4" />, title: "Policy", desc: "Scrive su Turso (tabella config)" },
    { icon: <Activity className="h-4 w-4" />, title: "Audit", desc: "Log completo: TODO" },
    { icon: <Activity className="h-4 w-4" />, title: "Healthcheck", desc: "TODO: ping servizi" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto max-w-6xl p-6 space-y-6">
        {/* Top bar */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5" />
              <h1 className="text-2xl font-semibold tracking-tight">Control Center</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Overview stile admin: cards, status, activity, e “danger zone”.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline">admin</Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="User menu">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Session</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>Impostazioni (TODO)</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <form action={logoutAction} className="w-full">
                    <button className="w-full text-left">Logout</button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="danger">Danger Zone</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <ServiceCard
                title="Website"
                subtitle="Frontend pubblico"
                status={websiteStatus}
                checked={websiteActive}
                disabled={isWebsitePending}
                onCheckedChange={(checked) => {
                  setWebsiteActive(checked)
                  setActive.website(checked)
                }}
              />
              <ServiceCard
                title="API"
                subtitle="Backend services"
                status={apiStatus}
                checked={apiActive}
                disabled={isApiPending}
                onCheckedChange={(checked) => {
                  setApiActive(checked)
                  setActive.api(checked)
                }}
              />
              <ServiceCard
                title="Dashboard"
                subtitle="Pannello admin"
                status={dashboardStatus}
                checked={dashActive}
                disabled={isDashPending}
                onCheckedChange={(checked) => {
                  setDashActive(checked)
                  setActive.dashboard(checked)
                }}
              />
              <ServiceCard
                title="Admin"
                subtitle="Area amministrazione"
                status={adminStatus}
                checked={adminActive}
                disabled={isAdminPending}
                onCheckedChange={(checked) => {
                  setAdminActive(checked)
                  setActive.admin(checked)
                }}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Activity feed</CardTitle>
                  <CardDescription>Ultima azione (cookie) + placeholder.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-56 pr-3">
                    <div className="space-y-3">
                      {activity.map((a, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                          <div className="mt-0.5 text-muted-foreground">{a.icon}</div>
                          <div className="space-y-0.5">
                            <div className="text-sm font-medium">{a.title}</div>
                            <div className="text-xs text-muted-foreground">{a.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick checks</CardTitle>
                  <CardDescription>Idee “fighe” da mettere dopo.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span>Health endpoints</span>
                    <Badge variant="outline">TODO</Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span>Audit trail vero</span>
                    <Badge variant="outline">TODO</Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span>Ruoli / permessi</span>
                    <Badge variant="outline">TODO</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Activity (placeholder)</CardTitle>
                <CardDescription>Qui poi ci mettiamo log server-side serio.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-72 pr-3">
                  <div className="space-y-2">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between rounded-md border p-3">
                        <div className="text-sm">Evento #{i + 1}</div>
                        <Badge variant="secondary">mock</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="danger">
            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  Danger zone
                </CardTitle>
                <CardDescription>
                  Toggle hard (scrive su Turso: tabella <code>config</code>).
                </CardDescription>
              </CardHeader>

              <CardContent className="grid gap-3 md:grid-cols-2">
                {/* stesso pattern per i 4 switch */}
                {/* Website */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="text-sm font-medium">Website</div>
                    <div className="text-xs text-muted-foreground">shutdown_website</div>
                  </div>
                  <Switch
                    checked={websiteActive}
                    onCheckedChange={(checked) => {
                      setWebsiteActive(checked)
                      setActive.website(checked)
                    }}
                    disabled={isWebsitePending}
                  />
                </div>

                {/* API */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="text-sm font-medium">API</div>
                    <div className="text-xs text-muted-foreground">shutdown_api</div>
                  </div>
                  <Switch
                    checked={apiActive}
                    onCheckedChange={(checked) => {
                      setApiActive(checked)
                      setActive.api(checked)
                    }}
                    disabled={isApiPending}
                  />
                </div>

                {/* Dashboard */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="text-sm font-medium">Dashboard</div>
                    <div className="text-xs text-muted-foreground">shutdown_dashboard</div>
                  </div>
                  <Switch
                    checked={dashActive}
                    onCheckedChange={(checked) => {
                      setDashActive(checked)
                      setActive.dashboard(checked)
                    }}
                    disabled={isDashPending}
                  />
                </div>

                {/* Admin */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="text-sm font-medium">Admin</div>
                    <div className="text-xs text-muted-foreground">shutdown_admin</div>
                  </div>
                  <Switch
                    checked={adminActive}
                    onCheckedChange={(checked) => {
                      setAdminActive(checked)
                      setActive.admin(checked)
                    }}
                    disabled={isAdminPending}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
