import { AppShell } from '@/components/shared/app-shell'

export default async function DashboardPage() {
  return (
    <AppShell>
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">Coming in Sprint 2.</p>
      </div>
    </AppShell>
  )
}
