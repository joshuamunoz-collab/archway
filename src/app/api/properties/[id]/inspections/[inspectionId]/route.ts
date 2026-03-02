import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; inspectionId: string }> }
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { id, inspectionId } = await params
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

  try {
    const inspection = await prisma.inspection.update({
      where: { id: inspectionId },
      data: updateData,
    })

    await prisma.activityLog.create({
      data: {
        entityType: 'property',
        entityId: id,
        action: 'inspection_updated',
        details: { inspectionId, changes: Object.keys(updateData) },
        userId: auth.user.id,
      },
    })

    return NextResponse.json(inspection)
  } catch {
    return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; inspectionId: string }> }
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { id, inspectionId } = await params

  try {
    await prisma.inspection.delete({ where: { id: inspectionId } })

    await prisma.activityLog.create({
      data: {
        entityType: 'property',
        entityId: id,
        action: 'inspection_deleted',
        details: { inspectionId },
        userId: auth.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
  }
}
