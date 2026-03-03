import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from './sidebar'
import { GlobalSearch } from './global-search'
import { CreateNoteDialog } from './create-note-dialog'
export async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) redirect('/login')

  let profile = null
  let logoUrl = ''
  try {
    const { prisma } = await import('@/lib/prisma')
    profile = await prisma.userProfile.findUnique({
      where: { id: user.id },
      select: { fullName: true, email: true, role: true },
    })
  } catch {
    // DB or Prisma unavailable — still render the shell with fallback user info
  }
  try {
    const { prisma } = await import('@/lib/prisma')
    const pref = await prisma.systemPreference.findUnique({
      where: { key: 'app_preferences' },
    })
    if (pref?.value) {
      const prefs = pref.value as Record<string, unknown>
      logoUrl = (prefs.companyLogoUrl as string) ?? ''
    }
  } catch {
    // Logo query failed — continue without logo
  }

  const userName = profile?.fullName ?? user.email ?? 'User'
  const userRole = profile?.role ?? ''
  return (
    <div className="min-h-screen bg-background">
      <Sidebar userName={userName} userRole={userRole} logoUrl={logoUrl} />
      <div className="ml-60 min-h-screen flex flex-col">
        {/* Top header with search */}
        <header className="sticky top-0 z-30 h-14 shrink-0 border-b bg-white/80 backdrop-blur-sm flex items-center px-6 gap-4">
          <GlobalSearch />
          <CreateNoteDialog />
        </header>
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
