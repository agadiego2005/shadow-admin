"use client"

import { useFormStatus } from "react-dom"
import { Loader2, LogIn } from "lucide-react"

import { Button } from "@/components/ui/button"

export function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button className="w-full" type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <LogIn />}
      {pending ? "Accesso in corso…" : "Entra"}
    </Button>
  )
}
