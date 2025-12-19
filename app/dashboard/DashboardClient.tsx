// app/dashboard/DashboardClient.tsx
"use client"

import { useEffect } from "react"
import { useActionState } from "react"
import { toast } from "sonner"
import { Power, ShieldAlert, Activity, LayoutDashboard, User } from "lucide-react"

import type { ActionState } from "./actions"
import {
  shutdownApiAction,
  shutdownDashboardAction,
  shutdownWebsiteAction,
  logoutAction,
} from "./actions"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useFormStatus } from "react-dom"

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? "Eseguo..." : children}
    </Button>
  )
}

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

function ShutdownConfirm({
  label,
  description,
  formAction,
}: {
  label: string
  description: string
  formAction: (payload: FormData) => void
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full">
          <Power className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confermi?</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annulla</AlertDialogCancel>
          <form action={formAction}>
            <AlertDialogAction asChild>
              <SubmitButton>Conferma</SubmitButton>
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function ServiceCard({
  title,
  subtitle,
  status,
  confirmText,
  formAction,
}: {
  title: string
  subtitle: string
  status: "online" | "offline"
  confirmText: string
  formAction: (payload: FormData) => void
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
        <ShutdownConfirm
          label={`Shutdown ${title.toLowerCase()}`}
          description={confirmText}
          formAction={formAction}
        />
        <p className="text-xs text-muted-foreground">
          Mock: cambia solo lo stato in UI (cookie + re-render).
        </p>
      </CardContent>
    </Card>
  )
}

export function DashboardClient(props: {
  lastAction: string
  websiteStatus: "online" | "offline"
  apiStatus: "online" | "offline"
  dashboardStatus: "online" | "offline"
}) {
  const [websiteState, websiteFormAction] = useActionState<ActionState, FormData>(
    shutdownWebsiteAction,
    null
  )
  const [apiState, apiFormAction] = useActionState<ActionState, FormData>(shutdownApiAction, null)
  const [dashState, dashFormAction] = useActionState<ActionState, FormData>(
    shutdownDashboardAction,
    null
  )

  useEffect(() => {
    const s = websiteState ?? apiState ?? dashState
    if (!s) return
    if (s.ok) toast.success(`${s.title}: ok`, { description: s.message })
    else toast.error(`${s.title}: errore`, { description: s.message })
  }, [websiteState?.ts, apiState?.ts, dashState?.ts])

  const activity = [
    { icon: <Activity className="h-4 w-4" />, title: "Ultima azione", desc: props.lastAction },
    { icon: <ShieldAlert className="h-4 w-4" />, title: "Policy", desc: "Azioni per ora SOLO mock" },
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
            <div className="grid gap-4 md:grid-cols-3">
              <ServiceCard
                title="Website"
                subtitle="Frontend pubblico"
                status={props.websiteStatus}
                confirmText="Mock: imposta Website su OFFLINE."
                formAction={websiteFormAction}
              />
              <ServiceCard
                title="API"
                subtitle="Backend services"
                status={props.apiStatus}
                confirmText="Mock: imposta API su OFFLINE."
                formAction={apiFormAction}
              />
              <ServiceCard
                title="Dashboard"
                subtitle="Pannello admin"
                status={props.dashboardStatus}
                confirmText="Mock: imposta Dashboard su OFFLINE."
                formAction={dashFormAction}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Activity feed</CardTitle>
                  <CardDescription>Per ora “semi-mock” (ultima azione + placeholder).</CardDescription>
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
                <CardTitle className="text-base">Activity (mock)</CardTitle>
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
                  Azioni distruttive (sempre con conferma). Qui puoi mettere anche “reset”.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <ShutdownConfirm
                  label="Shutdown website"
                  description="Mock: spegne il sito (stato OFFLINE)."
                  formAction={websiteFormAction}
                />
                <ShutdownConfirm
                  label="Shutdown api"
                  description="Mock: spegne le API (stato OFFLINE)."
                  formAction={apiFormAction}
                />
                <ShutdownConfirm
                  label="Shutdown dashboard"
                  description="Mock: spegne la dashboard (stato OFFLINE)."
                  formAction={dashFormAction}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
