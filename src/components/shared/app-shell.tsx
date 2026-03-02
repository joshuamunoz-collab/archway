import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Sidebar } from './sidebar'
import { GlobalSearch } from './global-search'

export async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) redirect('/login')

  let profile = null
  try {
    profile = await prisma.userProfile.findUnique({
      where: { id: user.id },
      select: { fullName: true, email: true },
    })
  } catch {
    // DB unavailable — still render the shell with fallback user info
  }

  const userName = profile?.fullName ?? user.email ?? 'User'
  const userEmail = profile?.email ?? user.email ?? ''

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userEmail={userEmail} userName={userName} />
      <div className="ml-60 min-h-screen flex flex-col">
        {/* Top header with search */}
        <header className="sticky top-0 z-30 h-14 shrink-0 border-b bg-white/80 backdrop-blur-sm flex items-center px-6 gap-4">
          <GlobalSearch />
        </header>
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
