import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; inspectionId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { inspectionId } = await params
  const body = await request.json()

  const updateData: Record<string, unknown> = {}
  if (body.inspectionType !== undefined) updateData.inspectionType = body.inspectionType
  if (body.scheduledDate !== undefined) updateData.scheduledDate = body.scheduledDate ? new Date(body.scheduledDate) : null
  if (body.completedDate !== undefined) updateData.completedDate = body.completedDate ? new Date(body.completedDate) : null
  if (body.inspector !== undefined) updateData.inspector = body.inspector?.trim() || null
  if (body.result !== undefined) updateData.result = body.result || null
  if (body.deficiencies !== undefined) updateData.deficiencies = body.deficiencies?.trim() || null
  if (body.reinspectionDeadline !== undefined) updateData.reinspectionDeadline = body.reinspectionDeadline ? new Date(body.reinspectionDeadline) : null
  if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null

  const inspection = await prisma.inspection.update({
    where: { id: inspectionId },
    data: updateData,
  })

  return NextResponse.json(inspection)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; inspectionId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { inspectionId } = await params
  await prisma.inspection.delete({ where: { id: inspectionId } })
  return NextResponse.json({ ok: true })
}
