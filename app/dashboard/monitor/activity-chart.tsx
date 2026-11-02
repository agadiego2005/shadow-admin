// app/dashboard/monitor/activity-chart.tsx
// Grafico dell'andamento di app calcio: colonne impilate (visite sotto, confronti sopra) con
// tooltip in solo CSS, niente JS lato client. Usato dal Monitor e dalla Panoramica.

import { cn } from "@/lib/utils"
import { clock } from "@/lib/format"

import { RANGES, type RangeKey, type TimelineBucket } from "./visits-db"

// Colori delle due serie, gli stessi nel grafico, nelle barre delle liste e nei log.
export const VISIT_FILL = "bg-[#2a78d6] dark:bg-[#3987e5]"
export const COMPARE_FILL = "bg-[#eb6834] dark:bg-[#d95926]"

const rome = { timeZone: "Europe/Rome" } as const
const weekdayDate = new Intl.DateTimeFormat("it-IT", { ...rome, weekday: "short", day: "2-digit", month: "2-digit" })
const shortDate = new Intl.DateTimeFormat("it-IT", { ...rome, day: "2-digit", month: "2-digit" })
const romeHour = new Intl.DateTimeFormat("en-GB", { ...rome, hour: "2-digit", hourCycle: "h23" })

export function LegendItem({ fill, label }: { fill: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-[3px]", fill)} />
      {label}
    </span>
  )
}

export function ChartLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <LegendItem fill={VISIT_FILL} label="Visite" />
      <LegendItem fill={COMPARE_FILL} label="Confronti" />
    </div>
  )
}

/** Il massimo dell'asse: il doppio di un passo "tondo" (1, 2, 5 × 10ⁿ), così anche la metà è tonda. */
function niceTop(max: number) {
  const half = Math.max(1, max / 2)
  const power = 10 ** Math.floor(Math.log10(half))
  const step = [1, 2, 5, 10].map((m) => m * power).find((s) => s >= half) ?? 10 * power
  return step * 2
}

function bucketTitle(bucket: TimelineBucket, range: RangeKey) {
  const start = new Date(bucket.start)
  if (RANGES[range].bucket === "day") return weekdayDate.format(start)
  return `${weekdayDate.format(start)}, ${clock.format(start)}–${clock.format(new Date(bucket.end))}`
}

function bucketTick(bucket: TimelineBucket, index: number, count: number, range: RangeKey) {
  const start = new Date(bucket.start)
  const hour = Number(romeHour.format(start))
  switch (RANGES[range].bucket) {
    case "hour":
      return hour % 6 === 0 ? clock.format(start) : null
    case "6h":
      return hour === 0 ? shortDate.format(start) : null
    case "day":
      return (count - 1 - index) % 7 === 0 ? shortDate.format(start) : null
  }
}

export function ActivityChart({
  timeline,
  range,
  height = "h-44",
}: {
  timeline: TimelineBucket[]
  range: RangeKey
  height?: string
}) {
  const top = niceTop(Math.max(0, ...timeline.map((b) => b.visits + b.comparisons)))
  const empty = timeline.every((b) => b.visits + b.comparisons === 0)

  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-3">
      <div className={cn("relative text-right text-[11px] tabular-nums text-muted-foreground", height)}>
        <span className="invisible">{top.toLocaleString("it-IT")}</span>
        {[top, top / 2, 0].map((value) => (
          <span key={value} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - (value / top) * 100}%` }}>
            {value.toLocaleString("it-IT")}
          </span>
        ))}
      </div>

      <div role="group" aria-label="Andamento di visite e confronti" className={cn("relative", height)}>
        {[0, 50, 100].map((pos) => (
          <div key={pos} className="absolute inset-x-0 border-t" style={{ bottom: `${pos}%` }} />
        ))}
        {empty ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Nessun evento nel periodo
          </div>
        ) : null}
        <div className="absolute inset-0 flex items-end gap-0.5">
          {timeline.map((bucket, i) => {
            const total = bucket.visits + bucket.comparisons
            const title = bucketTitle(bucket, range)
            const align =
              i < timeline.length / 3
                ? "left-0"
                : i >= (timeline.length * 2) / 3
                  ? "right-0"
                  : "left-1/2 -translate-x-1/2"
            return (
              <div
                key={bucket.start}
                tabIndex={0}
                aria-label={`${title}: ${bucket.visits} visite, ${bucket.comparisons} confronti`}
                className="group relative flex h-full min-w-0 flex-1 items-end justify-center rounded-sm outline-none hover:bg-muted/70 focus-visible:bg-muted/70"
              >
                {total > 0 ? (
                  <div
                    className="flex w-full max-w-6 flex-col justify-end gap-0.5"
                    style={{ height: `${(total / top) * 100}%` }}
                  >
                    {bucket.comparisons > 0 ? (
                      <div
                        className={cn("min-h-0.5 basis-0 rounded-t-[4px]", COMPARE_FILL)}
                        style={{ flexGrow: bucket.comparisons }}
                      />
                    ) : null}
                    {bucket.visits > 0 ? (
                      <div
                        className={cn("min-h-0.5 basis-0", bucket.comparisons === 0 && "rounded-t-[4px]", VISIT_FILL)}
                        style={{ flexGrow: bucket.visits }}
                      />
                    ) : null}
                  </div>
                ) : null}
                <div
                  className={cn(
                    "pointer-events-none absolute bottom-full z-20 mb-2 hidden w-max rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md group-hover:block group-focus-visible:block",
                    align,
                  )}
                >
                  <div className="mb-1 font-medium">{title}</div>
                  <TooltipRow fill={VISIT_FILL} label="Visite" value={bucket.visits} />
                  <TooltipRow fill={COMPARE_FILL} label="Confronti" value={bucket.comparisons} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div />
      <div className="flex h-6 gap-0.5 pt-2">
        {timeline.map((bucket, i) => {
          const tick = bucketTick(bucket, i, timeline.length, range)
          return (
            <div key={bucket.start} className="relative min-w-0 flex-1">
              {tick ? (
                <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] tabular-nums text-muted-foreground">
                  {tick}
                </span>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TooltipRow({ fill, label, value }: { fill: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("size-2 rounded-[2px]", fill)} />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto pl-3 font-medium tabular-nums">{value.toLocaleString("it-IT")}</span>
    </div>
  )
}
