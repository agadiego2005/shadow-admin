// app/dashboard/servizi/ServicesPanel.tsx
"use client"

// Interruttori dei servizi. Accendere è immediato, spegnere chiede conferma; lo stato cambia
// subito a schermo (ottimistico) e torna indietro da solo se Turso risponde con un errore.

import { useOptimistic, useState, useTransition } from "react"
import { toast } from "sonner"
import { AlertTriangle, CheckCircle2, Loader2, Power, PowerOff } from "lucide-react"

import { SERVICE_KEYS, SERVICES, type ServiceKey } from "@/lib/services"
import { cn } from "@/lib/utils"
import { SERVICE_ICONS, ServiceStatus } from "@/components/admin/service-icon"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"

import { setAllServicesActive, setServiceActive, type ActionResult } from "../actions"

export type ServiceView = {
  key: ServiceKey
  on: boolean
  changedAgo: string | null
  changedAt: string | null
  changedFrom: string | null
}

type States = Record<ServiceKey, boolean>

export function ServicesPanel({ services, configUpdated }: { services: ServiceView[]; configUpdated: string }) {
  const serverStates = Object.fromEntries(services.map((s) => [s.key, s.on])) as States
  const [states, setOptimistic] = useOptimistic(serverStates, (current, update: Partial<States>) => ({
    ...current,
    ...update,
  }))
  const [isPending, startTransition] = useTransition()
  // `confirm` resta impostato anche mentre il dialogo si chiude, così il testo non sparisce durante l'animazione.
  const [confirm, setConfirm] = useState<ServiceKey | "all" | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  function askConfirm(target: ServiceKey | "all") {
    setConfirm(target)
    setConfirmOpen(true)
  }

  function run(update: Partial<States>, action: () => Promise<ActionResult>) {
    startTransition(async () => {
      setOptimistic(update)
      const result = await action()
      if (result.ok) toast.success(result.message)
      else toast.error("Operazione non riuscita", { description: result.message })
    })
  }

  const setOne = (key: ServiceKey, active: boolean) => run({ [key]: active }, () => setServiceActive(key, active))
  const setAll = (active: boolean) =>
    run(Object.fromEntries(SERVICE_KEYS.map((key) => [key, active])), () => setAllServicesActive(active))

  const off = SERVICE_KEYS.filter((key) => !states[key])
  const allOn = off.length === 0

  return (
    <>
      <Card className="gap-4 py-5">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-10 items-center justify-center rounded-xl",
                allOn
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
              )}
            >
              {allOn ? <CheckCircle2 className="size-5" /> : <AlertTriangle className="size-5" />}
            </span>
            <div>
              <div className="font-semibold">
                {allOn
                  ? "Tutti i servizi sono accesi"
                  : `${off.length === 1 ? "1 servizio spento" : `${off.length} servizi spenti`}: ${off.map((key) => SERVICES[key].label).join(", ")}`}
              </div>
              <div className="text-xs text-muted-foreground">Config aggiornata {configUpdated}</div>
            </div>
          </div>
          <div className="w-full space-y-1.5 sm:w-48">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Accesi</span>
              <span className="tabular-nums">
                {SERVICE_KEYS.length - off.length} di {SERVICE_KEYS.length}
              </span>
            </div>
            <div className="flex gap-1">
              {SERVICE_KEYS.map((key) => (
                <span
                  key={key}
                  title={`${SERVICES[key].label}: ${states[key] ? "acceso" : "spento"}`}
                  className={cn("h-2 flex-1 rounded-full", states[key] ? "bg-emerald-500" : "bg-red-500")}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {services.map((service) => {
          const { label, description, column } = SERVICES[service.key]
          const Icon = SERVICE_ICONS[service.key]
          const on = states[service.key]
          const busy = isPending && on !== service.on
          return (
            <Card
              key={service.key}
              className={cn("gap-0 overflow-hidden py-0 transition-colors", !on && "border-red-500/30 dark:border-red-500/40")}
            >
              <div className="flex items-start gap-4 p-5">
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors",
                    on ? "bg-[#2a78d6]/10 text-[#2a78d6] dark:text-[#3987e5]" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{label}</span>
                    <ServiceStatus on={on} />
                  </div>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  {busy ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
                  <Switch
                    checked={on}
                    disabled={isPending}
                    onCheckedChange={(checked) => (checked ? setOne(service.key, true) : askConfirm(service.key))}
                    aria-label={`${on ? "Spegni" : "Accendi"} ${label}`}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t bg-muted/40 px-5 py-2.5 text-xs text-muted-foreground">
                <code className="font-mono">config.{column}</code>
                <span title={service.changedAt ?? undefined}>
                  {service.changedAgo
                    ? `Modificato ${service.changedAgo}${service.changedFrom ? ` · ${service.changedFrom}` : ""}`
                    : "Nessuna modifica registrata"}
                </span>
              </div>
            </Card>
          )
        })}
      </div>

      <Card className="gap-4 border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4 text-destructive" />
            Zona pericolosa
          </CardTitle>
          <CardDescription>Spegne o riaccende tutti i servizi insieme. Ogni servizio che cambia finisce nel registro.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={isPending || allOn} onClick={() => setAll(true)}>
            <Power />
            Riaccendi tutti
          </Button>
          <Button variant="destructive" disabled={isPending || off.length === SERVICE_KEYS.length} onClick={() => askConfirm("all")}>
            <PowerOff />
            Spegni tutti
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "all" ? "Spegnere tutti i servizi?" : confirm ? `Spegnere ${SERVICES[confirm].label}?` : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "all"
                ? `${SERVICE_KEYS.map((key) => SERVICES[key].label).join(", ")} verranno spenti insieme finché non li riaccendi.`
                : confirm
                  ? `${SERVICES[confirm].description} resterà spento finché non lo riaccendi (config.${SERVICES[confirm].column} = 1).`
                  : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => {
                if (confirm === "all") setAll(false)
                else if (confirm) setOne(confirm, false)
              }}
            >
              <PowerOff />
              Spegni
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
