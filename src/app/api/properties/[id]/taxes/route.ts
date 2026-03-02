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

  const tax = await prisma.propertyTax.create({
    data: {
      propertyId: id,
      taxYear: parseInt(body.taxYear),
      assessedValue: body.assessedValue ? parseFloat(body.assessedValue) : null,
      annualAmount: body.annualAmount ? parseFloat(body.annualAmount) : null,
      status: body.status || 'unpaid',
      paidDate: body.paidDate ? new Date(body.paidDate) : null,
      paidAmount: body.paidAmount ? parseFloat(body.paidAmount) : null,
      notes: body.notes || null,
    },
  })

  await prisma.activityLog.create({
    data: {
      entityType: 'property',
      entityId: id,
      action: 'tax_record_added',
      details: { taxYear: body.taxYear },
      userId: auth.user.id,
    },
  })

  return NextResponse.json(tax, { status: 201 })
}
