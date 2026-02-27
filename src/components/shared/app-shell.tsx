import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Sidebar } from './sidebar'

export async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
    select: { fullName: true, email: true },
  })

  const userName = profile?.fullName ?? user.email ?? 'User'
  const userEmail = profile?.email ?? user.email ?? ''

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userEmail={userEmail} userName={userName} />
      <main className="ml-60 min-h-screen">
        {children}
      </main>
    </div>
  )
}
