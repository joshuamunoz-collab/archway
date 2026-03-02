import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // After exchanging the code, link the OAuth user to an existing
      // user_profiles row (created via email/password) by matching email.
      // This handles the ID mismatch when switching auth providers.
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email) {
          const existing = await prisma.userProfile.findUnique({
            where: { id: user.id },
          })
          if (!existing) {
            // No profile for this auth ID — look for one with matching email
            const byEmail = await prisma.userProfile.findFirst({
              where: { email: user.email },
            })
            if (byEmail) {
              // Create a profile with the new OAuth ID, copying role & info
              await prisma.userProfile.create({
                data: {
                  id: user.id,
                  email: byEmail.email,
                  fullName: byEmail.fullName,
                  role: byEmail.role,
                  phone: byEmail.phone,
                  isActive: byEmail.isActive,
                },
              })
            }
          }
        }
      } catch {
        // Profile linking failed — user will land on dashboard without admin access
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
