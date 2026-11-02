"use client"

// Barra laterale del pannello: fissa su desktop, menu a scomparsa su telefono.

import { useEffect, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  Activity,
  LayoutDashboard,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Power,
  ScrollText,
  ShieldCheck,
  Sun,
  X,
  type LucideIcon,
} from "lucide-react"

import { logoutAction } from "@/app/dashboard/actions"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type NavItem = { href: string; label: string; icon: LucideIcon }

const NAV: { title: string; items: NavItem[] }[] = [
  {
    title: "Generale",
    items: [
      { href: "/dashboard", label: "Panoramica", icon: LayoutDashboard },
      { href: "/dashboard/servizi", label: "Servizi", icon: Power },
    ],
  },
  {
    title: "App calcio",
    items: [{ href: "/dashboard/monitor", label: "Monitor visite", icon: Activity }],
  },
  {
    title: "Sistema",
    items: [{ href: "/dashboard/attivita", label: "Registro attività", icon: ScrollText }],
  },
]

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#2a78d6] to-[#6250d6] text-white shadow-sm">
        <ShieldCheck className="size-4" />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold">Shadow Admin</span>
        <span className="block text-xs text-muted-foreground">Pannello di controllo</span>
      </span>
    </Link>
  )
}

const THEMES = [
  { value: "light", label: "Chiaro", icon: Sun },
  { value: "dark", label: "Scuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const

const noopSubscribe = () => () => {}

function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  // Il tema salvato si conosce solo nel browser: sul server nessun pulsante è attivo.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false)
  return (
    <div role="group" aria-label="Tema" className="grid grid-cols-3 gap-1 rounded-lg border bg-background/60 p-1">
      {THEMES.map(({ value, label, icon: Icon }) => {
        const active = mounted && theme === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            title={label}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
              active && "bg-sidebar-accent text-foreground shadow-xs",
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        )
      })}
    </div>
  )
}

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center border-b px-5">
        <Brand />
      </div>

      <nav aria-label="Sezioni" className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
              {group.title}
            </div>
            {group.items.map((item) => {
              const active = isActive(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                  )}
                >
                  {active ? (
                    <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[#2a78d6] dark:bg-[#3987e5]" />
                  ) : null}
                  <item.icon className={cn("size-4", active && "text-[#2a78d6] dark:text-[#3987e5]")} />
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="space-y-3 border-t p-3">
        <ThemeSwitcher />
        <div className="flex items-center gap-3 rounded-lg px-2 py-1">
          <span className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">AD</span>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-sm font-medium">admin</div>
            <div className="text-xs text-muted-foreground">Sessione attiva</div>
          </div>
          <form action={logoutAction}>
            <Button type="submit" size="icon-sm" variant="ghost" aria-label="Esci" title="Esci">
              <LogOut />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export function AdminSidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-sidebar text-sidebar-foreground lg:block">
        <SidebarContent pathname={pathname} />
      </aside>

      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur lg:hidden">
        <Button size="icon-sm" variant="outline" aria-label="Apri menu" aria-expanded={open} onClick={() => setOpen(true)}>
          <Menu />
        </Button>
        <Brand />
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 animate-in fade-in-0" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r bg-sidebar text-sidebar-foreground shadow-xl animate-in slide-in-from-left duration-200">
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Chiudi menu"
              className="absolute right-3 top-4"
              onClick={() => setOpen(false)}
            >
              <X />
            </Button>
            <SidebarContent pathname={pathname} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}
    </>
  )
}
