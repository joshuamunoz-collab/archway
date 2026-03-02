import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const users = await prisma.userProfile.findMany({
    orderBy: [{ isActive: 'desc' }, { fullName: 'asc' }],
  })

  return NextResponse.json(users)
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await request.json()
  const { email, fullName, role, phone } = body

  if (!email?.trim() || !fullName?.trim()) {
    return NextResponse.json({ error: 'Email and full name are required' }, { status: 400 })
  }

  const validRoles = ['admin', 'staff', 'pm', 'pm_staff']
  if (role && !validRoles.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Create Supabase Auth user with service role
  const admin = createAdminClient()
  const tempPassword = crypto.randomUUID().slice(0, 16) + '!A1'
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: email.trim(),
    password: tempPassword,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Create user profile row
  const profile = await prisma.userProfile.create({
    data: {
      id: authData.user.id,
      email: email.trim().toLowerCase(),
      fullName: fullName.trim(),
      role: role || 'staff',
      phone: phone?.trim() || null,
    },
  })

  await prisma.activityLog.create({
    data: {
      entityType: 'user',
      entityId: profile.id,
      action: 'created',
      details: { email: profile.email, role: profile.role },
      userId: auth.user.id,
    },
  })

  return NextResponse.json({ ...profile, tempPassword }, { status: 201 })
}
