import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { milestoneId } = await params
  const body = await request.json()

  const updateData: Record<string, unknown> = {}
  if (body.name !== undefined) updateData.name = body.name.trim()
  if (body.targetDate !== undefined) updateData.targetDate = body.targetDate ? new Date(body.targetDate) : null
  if (body.actualDate !== undefined) updateData.actualDate = body.actualDate ? new Date(body.actualDate) : null
  if (body.status !== undefined) updateData.status = body.status
  if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null

  const milestone = await prisma.rehabMilestone.update({
    where: { id: milestoneId },
    data: updateData,
  })

  return NextResponse.json(milestone)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { milestoneId } = await params
  await prisma.rehabMilestone.delete({ where: { id: milestoneId } })
  return NextResponse.json({ ok: true })
}
