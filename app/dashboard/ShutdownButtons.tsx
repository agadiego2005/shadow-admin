// app/dashboard/ShutdownButtons.tsx
"use client"

import { ReactNode } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
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

function ConfirmSubmit({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? "Eseguo..." : children}
    </Button>
  )
}

function ShutdownConfirm({
  label,
  description,
  action,
}: {
  label: string
  description: string
  action: (formData: FormData) => void | Promise<void>
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full sm:w-auto">
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

          <form action={action}>
            <AlertDialogAction asChild>
              <ConfirmSubmit>Conferma</ConfirmSubmit>
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function ShutdownButtons({
  shutdownWebsiteAction,
  shutdownApiAction,
  shutdownDashboardAction,
}: {
  shutdownWebsiteAction: any
  shutdownApiAction: any
  shutdownDashboardAction: any
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <ShutdownConfirm
        label="Shutdown website"
        description="Mock: simula lo spegnimento del sito pubblico."
        action={shutdownWebsiteAction}
      />
      <ShutdownConfirm
        label="Shutdown api"
        description="Mock: simula lo spegnimento delle API."
        action={shutdownApiAction}
      />
      <ShutdownConfirm
        label="Shutdown dashboard"
        description="Mock: simula lo spegnimento della dashboard."
        action={shutdownDashboardAction}
      />
    </div>
  )
}
