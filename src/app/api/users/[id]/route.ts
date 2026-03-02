import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const caller = await prisma.userProfile.findUnique({ where: { id: user.id } })
  if (!caller || caller.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { fullName, role, phone, isActive } = body

  const validRoles = ['admin', 'staff', 'pm', 'pm_staff']
  if (role && !validRoles.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Prevent admin from deactivating themselves
  if (id === user.id && isActive === false) {
    return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (fullName !== undefined) data.fullName = fullName.trim()
  if (role !== undefined) data.role = role
  if (phone !== undefined) data.phone = phone?.trim() || null
  if (isActive !== undefined) data.isActive = isActive

  const updated = await prisma.userProfile.update({
    where: { id },
    data,
  })

  await prisma.activityLog.create({
    data: {
      entityType: 'user',
      entityId: id,
      action: 'updated',
      details: data as Prisma.InputJsonValue,
      userId: user.id,
    },
  })

  return NextResponse.json(updated)
}
