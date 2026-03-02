export const dynamic = 'force-dynamic'
export const metadata = { title: 'Login — Archway' }

import { LoginForm } from './login-form'

export default async function LoginPage() {
  let logoUrl = ''
  try {
    // Dynamic import keeps Prisma out of the module-level scope so that
    // any initialisation failure (cold-start, missing env, bundle issue)
    // is caught here instead of crashing the entire server function.
    const { prisma } = await import('@/lib/prisma')
    const pref = await prisma.systemPreference.findUnique({
      where: { key: 'app_preferences' },
    })
    if (pref?.value) {
      const prefs = pref.value as Record<string, unknown>
      logoUrl = (prefs.companyLogoUrl as string) ?? ''
    }
  } catch {
    // DB or Prisma unavailable — render without logo
  }

  return <LoginForm logoUrl={logoUrl} />
}
