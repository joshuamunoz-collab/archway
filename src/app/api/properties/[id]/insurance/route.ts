import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const policies = await prisma.insurancePolicy.findMany({
    where: { propertyId: id },
    orderBy: { effectiveDate: 'desc' },
  })
  // Serialize Prisma Decimal fields
  const serialized = policies.map(p => ({
    ...p,
    premiumAnnual: p.premiumAnnual !== null ? Number(p.premiumAnnual) : null,
    liabilityLimit: p.liabilityLimit !== null ? Number(p.liabilityLimit) : null,
    premisesLimit: p.premisesLimit !== null ? Number(p.premisesLimit) : null,
  }))

  return NextResponse.json(serialized)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await request.json()

  const policy = await prisma.insurancePolicy.create({
    data: {
      propertyId: id,
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
      action: 'insurance_added',
      details: { carrier: body.carrier, policyType: body.policyType },
      userId: auth.user.id,
    },
  })

  return NextResponse.json({
    ...policy,
    premiumAnnual: policy.premiumAnnual !== null ? Number(policy.premiumAnnual) : null,
    liabilityLimit: policy.liabilityLimit !== null ? Number(policy.liabilityLimit) : null,
    premisesLimit: policy.premisesLimit !== null ? Number(policy.premisesLimit) : null,
  }, { status: 201 })
}
