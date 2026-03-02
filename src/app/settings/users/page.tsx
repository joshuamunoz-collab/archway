export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shared/app-shell'
import { UserManager } from '@/components/settings/user-manager'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Only admins can access
  const caller = await prisma.userProfile.findUnique({ where: { id: user.id } })
  if (!caller || caller.role !== 'admin') redirect('/dashboard')

  const users = await prisma.userProfile.findMany({
    orderBy: [{ isActive: 'desc' }, { fullName: 'asc' }],
  })

  const serialized = users.map(u => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  }))

  return (
    <AppShell>
      <div className="p-6 lg:p-8 max-w-5xl">
        <UserManager initial={serialized} />
      </div>
    </AppShell>
  )
}
