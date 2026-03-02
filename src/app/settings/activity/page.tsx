export const dynamic = 'force-dynamic'
export const metadata = { title: 'Activity Log — Archway' }

import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shared/app-shell'
import { ActivityLog } from '@/components/settings/activity-log'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export default async function ActivityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const caller = await prisma.userProfile.findUnique({ where: { id: user.id } })
  if (!caller || caller.role !== 'admin') redirect('/dashboard')

  return (
    <AppShell>
      <div className="px-8 py-6 max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">All system actions and mutations</p>
        </div>
        <ActivityLog />
      </div>
    </AppShell>
  )
}
