import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await request.json()

  if (!body.inspectionType) return NextResponse.json({ error: 'inspectionType is required' }, { status: 400 })

  const inspection = await prisma.inspection.create({
    data: {
      propertyId: id,
      inspectionType: body.inspectionType,
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
      completedDate: body.completedDate ? new Date(body.completedDate) : null,
      inspector: body.inspector?.trim() || null,
      result: body.result || null,
      deficiencies: body.deficiencies?.trim() || null,
      reinspectionDeadline: body.reinspectionDeadline ? new Date(body.reinspectionDeadline) : null,
      notes: body.notes?.trim() || null,
    },
  })

  await prisma.activityLog.create({
    data: {
      entityType: 'property',
      entityId: id,
      action: 'inspection_added',
      details: { inspectionType: body.inspectionType, result: body.result },
      userId: auth.user.id,
    },
  })

  return NextResponse.json(inspection, { status: 201 })
}
