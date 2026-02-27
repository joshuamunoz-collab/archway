import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

const VALID_STATUSES = ['occupied', 'vacant', 'rehab', 'pending_inspection', 'pending_packet']

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { status } = await request.json()

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const existing = await prisma.property.findUnique({
    where: { id },
    select: { status: true, vacantSince: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Domain rules
  let vacantSince: Date | null | undefined = undefined
  if (status === 'vacant' && existing.status !== 'vacant') {
    vacantSince = new Date()
  } else if (status !== 'vacant') {
    vacantSince = null
  }

  const updateData: Record<string, unknown> = { status }
  if (vacantSince !== undefined) updateData.vacantSince = vacantSince

  const updated = await prisma.property.update({
    where: { id },
    data: updateData,
    select: { id: true, status: true, vacantSince: true },
  })

  await prisma.activityLog.create({
    data: {
      entityType: 'property',
      entityId: id,
      action: 'status_changed',
      details: { from: existing.status, to: status },
      userId: user.id,
    },
  })

  return NextResponse.json(updated)
}
