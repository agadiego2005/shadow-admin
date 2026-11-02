import type { Metadata } from "next"
import { AlertCircle, Lock, ShieldCheck, User } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { loginAction } from "./actions"
import { SubmitButton } from "./SubmitButton"

export const runtime = 'edge';

export const metadata: Metadata = { title: "Accedi" }

type LoginSearchParams = { error?: string; next?: string }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<LoginSearchParams>
}) {
  const sp = await searchParams

  const nextPath = sp.next ?? "/dashboard"
  const showError = sp.error === "1"

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted/40 p-6 dark:bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-[#2a78d6]/15 to-transparent" />

      <div className="relative w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2a78d6] to-[#6250d6] text-white shadow-lg">
            <ShieldCheck className="size-6" />
          </span>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Shadow Admin</h1>
            <p className="text-sm text-muted-foreground">Accedi per gestire servizi e monitor.</p>
          </div>
        </div>

        <Card className="py-6 shadow-lg">
          <CardContent className="space-y-4">
            {showError ? (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                <AlertCircle className="size-4 shrink-0" />
                Credenziali non valide.
              </div>
            ) : null}

            <form action={loginAction} className="space-y-4">
              <input type="hidden" name="next" value={nextPath} />

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="username" name="username" autoComplete="username" required autoFocus className="pl-9" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="pl-9"
                  />
                </div>
              </div>

              <SubmitButton />
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">Gli accessi vengono registrati con IP e dispositivo.</p>
      </div>
    </div>
  )
}
