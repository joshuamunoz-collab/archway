export const dynamic = 'force-dynamic'
export const metadata = { title: 'Login — Archway' }

import { prisma } from '@/lib/prisma'
import { LoginForm } from './login-form'

export default async function LoginPage() {
  let logoUrl = ''
  try {
    const pref = await prisma.systemPreference.findUnique({
      where: { key: 'app_preferences' },
    })
    if (pref?.value) {
      const prefs = pref.value as Record<string, unknown>
      logoUrl = (prefs.companyLogoUrl as string) ?? ''
    }
  } catch {
    // DB unavailable — render without logo
  }

  return <LoginForm logoUrl={logoUrl} />
}
