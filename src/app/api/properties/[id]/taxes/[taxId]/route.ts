import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; taxId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, taxId } = await params
  const body = await request.json()

  const updated = await prisma.propertyTax.update({
    where: { id: taxId, propertyId: id },
    data: {
      taxYear: body.taxYear ? parseInt(body.taxYear) : undefined,
      assessedValue: body.assessedValue !== undefined ? (body.assessedValue ? parseFloat(body.assessedValue) : null) : undefined,
      annualAmount: body.annualAmount !== undefined ? (body.annualAmount ? parseFloat(body.annualAmount) : null) : undefined,
      status: body.status ?? undefined,
      paidDate: body.paidDate !== undefined ? (body.paidDate ? new Date(body.paidDate) : null) : undefined,
      paidAmount: body.paidAmount !== undefined ? (body.paidAmount ? parseFloat(body.paidAmount) : null) : undefined,
      notes: body.notes !== undefined ? body.notes || null : undefined,
    },
  })

  await prisma.activityLog.create({
    data: {
      entityType: 'property',
      entityId: id,
      action: 'tax_record_updated',
      details: { taxId },
      userId: user.id,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; taxId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, taxId } = await params
  await prisma.propertyTax.delete({ where: { id: taxId, propertyId: id } })

  return NextResponse.json({ success: true })
}
