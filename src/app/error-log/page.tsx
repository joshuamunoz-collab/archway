export const dynamic = 'force-dynamic'
export const metadata = { title: 'Error Log — Archway' }

import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shared/app-shell'
import { ErrorLogViewer } from '@/components/settings/error-log-viewer'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export default async function ErrorLogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const caller = await prisma.userProfile.findUnique({ where: { id: user.id } })
  if (!caller || caller.role !== 'admin') redirect('/dashboard')

  return (
    <AppShell>
      <div className="px-8 py-6 max-w-5xl">
        <ErrorLogViewer standalone />
      </div>
    </AppShell>
  )
}
