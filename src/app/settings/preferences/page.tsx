export const dynamic = 'force-dynamic'
export const metadata = { title: 'Preferences — Archway' }

import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shared/app-shell'
import { PreferencesManager } from '@/components/settings/preferences-manager'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

const DEFAULT_PREFERENCES = {
  defaultPmFeePct: 10,
  vacancyWarningDays: 30,
  vacancyUrgentDays: 45,
  vacancyCriticalDays: 60,
  taskEscalationHours: 48,
  leaseExpiryWarningDays: 60,
  companyName: '',
  companyPhone: '',
  companyEmail: '',
}

export default async function PreferencesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const caller = await prisma.userProfile.findUnique({ where: { id: user.id } })
  if (!caller || caller.role !== 'admin') redirect('/dashboard')

  const pref = await prisma.systemPreference.findUnique({
    where: { key: 'app_preferences' },
  })

  const preferences = pref
    ? { ...DEFAULT_PREFERENCES, ...(pref.value as Record<string, unknown>) }
    : DEFAULT_PREFERENCES

  return (
    <AppShell>
      <div className="p-6 lg:p-8 max-w-3xl">
        <PreferencesManager initial={preferences} />
      </div>
    </AppShell>
  )
}
