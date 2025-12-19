import { loginAction } from "./actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

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
    <div className="min-h-[calc(100vh-1px)] flex items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Accedi come admin per entrare in dashboard.</CardDescription>
        </CardHeader>

        <CardContent>
          {showError ? <p className="mb-4 text-sm text-destructive">Credenziali non valide.</p> : null}

          <form action={loginAction} className="space-y-4">
            <input type="hidden" name="next" value={nextPath} />

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" autoComplete="username" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>

            <Button className="w-full" type="submit">
              Entra
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
