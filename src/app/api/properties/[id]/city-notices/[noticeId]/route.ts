import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; noticeId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, noticeId } = await params
  const body = await request.json()

  const data: Record<string, unknown> = {}
  if (body.status !== undefined) {
    data.status = body.status
    if (body.status === 'resolved') data.resolvedDate = new Date()
    if (body.status === 'sent_to_pm') data.sentToPmDate = new Date()
    if (body.status === 'pm_acknowledged') data.pmResponseDate = new Date()
  }
  if (body.noticeType !== undefined) data.noticeType = body.noticeType || null
  if (body.description !== undefined) data.description = body.description
  if (body.deadline !== undefined) data.deadline = body.deadline ? new Date(body.deadline) : null
  if (body.assignedTo !== undefined) data.assignedTo = body.assignedTo || null
  if (body.resolutionNotes !== undefined) data.resolutionNotes = body.resolutionNotes || null

  const updated = await prisma.cityNotice.update({
    where: { id: noticeId, propertyId: id },
    data,
  })

  await prisma.activityLog.create({
    data: {
      entityType: 'property',
      entityId: id,
      action: 'city_notice_updated',
      details: { noticeId, status: body.status },
      userId: user.id,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; noticeId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, noticeId } = await params
  await prisma.cityNotice.delete({ where: { id: noticeId, propertyId: id } })

  return NextResponse.json({ success: true })
}
