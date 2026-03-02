export const dynamic = 'force-dynamic'
export const metadata = { title: 'Entities — Archway' }

import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shared/app-shell'
import { EntityManager } from '@/components/dashboard/entity-manager'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export default async function EntitiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const caller = await prisma.userProfile.findUnique({ where: { id: user.id } })
  if (!caller || caller.role !== 'admin') redirect('/dashboard')

  const entities = await prisma.entity.findMany({
    include: { bankAccounts: { orderBy: { accountType: 'asc' } } },
    orderBy: { name: 'asc' },
  })

  // Prisma Decimal → number for client component
  const serialized = entities.map(e => ({
    ...e,
    pmFeePct: Number(e.pmFeePct),
    bankAccounts: e.bankAccounts,
  }))

  return (
    <AppShell>
      <div className="px-8 py-6 max-w-5xl">
        <EntityManager initial={serialized} />
      </div>
    </AppShell>
  )
}
