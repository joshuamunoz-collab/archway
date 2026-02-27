export const dynamic = 'force-dynamic'

import { AppShell } from '@/components/shared/app-shell'
import { ActivityLog } from '@/components/settings/activity-log'

export default function ActivityPage() {
  return (
    <AppShell>
      <div className="p-6 lg:p-8 max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Activity Log</h1>
          <p className="text-sm text-muted-foreground mt-0.5">All system actions and mutations</p>
        </div>
        <ActivityLog />
      </div>
    </AppShell>
  )
}
