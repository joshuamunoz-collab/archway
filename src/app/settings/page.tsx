export const dynamic = 'force-dynamic'
export const metadata = { title: 'Settings — Archway' }

import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shared/app-shell'
import { SettingsTabs } from '@/components/settings/settings-tabs'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '@/lib/expense-categories'

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
  companyLogoUrl: '',
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const caller = await prisma.userProfile.findUnique({ where: { id: user.id } })
  if (!caller || caller.role !== 'admin') redirect('/dashboard')

  const [entities, users, catPref, prefPref, entityNamesRaw] = await Promise.all([
    prisma.entity.findMany({
      include: { bankAccounts: { orderBy: { accountType: 'asc' } } },
      orderBy: { name: 'asc' },
    }),
    prisma.userProfile.findMany({
      orderBy: [{ isActive: 'desc' }, { fullName: 'asc' }],
    }),
    prisma.systemPreference.findUnique({ where: { key: 'expense_categories' } }),
    prisma.systemPreference.findUnique({ where: { key: 'app_preferences' } }),
    prisma.entity.findMany({ select: { name: true }, orderBy: { name: 'asc' } }),
  ])

  const serializedEntities = entities.map(e => ({
    ...e,
    pmFeePct: Number(e.pmFeePct),
    bankAccounts: e.bankAccounts,
  }))

  const serializedUsers = users.map(u => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  }))

  const categories = catPref
    ? (catPref.value as unknown as ExpenseCategory[])
    : EXPENSE_CATEGORIES

  const preferences = prefPref
    ? { ...DEFAULT_PREFERENCES, ...(prefPref.value as Record<string, unknown>) }
    : DEFAULT_PREFERENCES

  const entityNames = entityNamesRaw.map(e => e.name)

  return (
    <AppShell>
      <div className="px-8 py-6 max-w-5xl">
        <SettingsTabs
          entities={serializedEntities}
          users={serializedUsers}
          categories={categories}
          preferences={preferences}
          entityNames={entityNames}
        />
      </div>
    </AppShell>
  )
}
