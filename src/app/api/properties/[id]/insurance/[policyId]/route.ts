import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; policyId: string }> }
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { id, policyId } = await params
  const body = await request.json()

  try {
    const updated = await prisma.insurancePolicy.update({
      where: { id: policyId, propertyId: id },
      data: {
        carrier: body.carrier,
        policyNumber: body.policyNumber || null,
        policyType: body.policyType || 'standard',
        premiumAnnual: body.premiumAnnual ? parseFloat(body.premiumAnnual) : null,
        liabilityLimit: body.liabilityLimit ? parseFloat(body.liabilityLimit) : null,
        premisesLimit: body.premisesLimit ? parseFloat(body.premisesLimit) : null,
        effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : null,
        expirationDate: body.expirationDate ? new Date(body.expirationDate) : null,
        notes: body.notes || null,
      },
    })

    await prisma.activityLog.create({
      data: {
        entityType: 'property',
        entityId: id,
        action: 'insurance_updated',
        details: { policyId },
        userId: auth.user.id,
      },
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Policy not found' }, { status: 404 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; policyId: string }> }
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { id, policyId } = await params

  try {
    await prisma.insurancePolicy.delete({ where: { id: policyId, propertyId: id } })

    await prisma.activityLog.create({
      data: {
        entityType: 'property',
        entityId: id,
        action: 'insurance_deleted',
        details: { policyId },
        userId: auth.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Policy not found' }, { status: 404 })
  }
}
