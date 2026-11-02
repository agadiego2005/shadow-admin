// Riquadro con un numero grande, usato in Panoramica e nel Monitor.

import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"

// Tinte delle icone: decorative, prese dalla stessa palette del grafico.
export const TONES = {
  blue: "bg-[#2a78d6]/10 text-[#2a78d6] dark:bg-[#3987e5]/15 dark:text-[#3987e5]",
  violet: "bg-[#6250d6]/10 text-[#6250d6] dark:bg-[#9085e9]/15 dark:text-[#9085e9]",
  orange: "bg-[#eb6834]/10 text-[#eb6834] dark:bg-[#d95926]/15 dark:text-[#eb6834]",
  aqua: "bg-[#1baf7a]/10 text-[#1baf7a] dark:bg-[#199e70]/15 dark:text-[#1baf7a]",
} as const

export function StatCard({
  icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: ReactNode
  tone: keyof typeof TONES
  label: string
  value: ReactNode
  hint?: ReactNode
}) {
  return (
    <Card className="gap-3 py-5">
      <CardHeader className="px-5">
        <CardDescription className="flex items-center gap-2.5">
          <span className={cn("flex size-8 items-center justify-center rounded-lg [&>svg]:size-4", TONES[tone])}>
            {icon}
          </span>
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5">
        <div className="truncate text-3xl font-semibold tracking-tight">
          {typeof value === "number" ? value.toLocaleString("it-IT") : value}
        </div>
        {hint ? <div className="mt-1 truncate text-xs text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  )
}
