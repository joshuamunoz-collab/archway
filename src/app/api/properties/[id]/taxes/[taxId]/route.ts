import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; taxId: string }> }
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { id, taxId } = await params
  const body = await request.json()

  try {
    const updated = await prisma.propertyTax.update({
      where: { id: taxId, propertyId: id },
      data: {
        taxYear: body.taxYear ? parseInt(body.taxYear, 10) : undefined,
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
        userId: auth.user.id,
      },
    })

    return NextResponse.json({
      ...updated,
      assessedValue: updated.assessedValue !== null ? Number(updated.assessedValue) : null,
      annualAmount: updated.annualAmount !== null ? Number(updated.annualAmount) : null,
      paidAmount: updated.paidAmount !== null ? Number(updated.paidAmount) : null,
    })
  } catch {
    return NextResponse.json({ error: 'Tax record not found' }, { status: 404 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; taxId: string }> }
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { id, taxId } = await params

  try {
    await prisma.propertyTax.delete({ where: { id: taxId, propertyId: id } })

    await prisma.activityLog.create({
      data: {
        entityType: 'property',
        entityId: id,
        action: 'tax_record_deleted',
        details: { taxId },
        userId: auth.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Tax record not found' }, { status: 404 })
  }
}
