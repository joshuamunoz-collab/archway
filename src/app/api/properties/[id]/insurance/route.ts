import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const policies = await prisma.insurancePolicy.findMany({
    where: { propertyId: id },
    orderBy: { effectiveDate: 'desc' },
  })
  return NextResponse.json(policies)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
      userId: user.id,
    },
  })

  return NextResponse.json(policy, { status: 201 })
}
