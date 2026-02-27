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
      userId: user.id,
    },
  })

  return NextResponse.json(inspection, { status: 201 })
}
