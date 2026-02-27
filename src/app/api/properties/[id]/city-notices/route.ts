import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  if (!body.description?.trim()) {
    return NextResponse.json({ error: 'description is required' }, { status: 400 })
  }
  if (!body.dateReceived) {
    return NextResponse.json({ error: 'dateReceived is required' }, { status: 400 })
  }

  const notice = await prisma.cityNotice.create({
    data: {
      propertyId: id,
      dateReceived: new Date(body.dateReceived),
      noticeType: body.noticeType || null,
      description: body.description.trim(),
      deadline: body.deadline ? new Date(body.deadline) : null,
      assignedTo: body.assignedTo || null,
      status: 'open',
    },
  })

  await prisma.activityLog.create({
    data: {
      entityType: 'property',
      entityId: id,
      action: 'city_notice_added',
      details: { noticeType: body.noticeType, description: body.description },
      userId: user.id,
    },
  })

  return NextResponse.json(notice, { status: 201 })
}
