// app/dashboard/layout.tsx
// Guscio del pannello: barra laterale con le sezioni e contenuto a destra.

import { AdminSidebar } from "@/components/admin/sidebar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/40 dark:bg-background">
      <AdminSidebar />
      <div className="lg:pl-64">
        <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  )
}
