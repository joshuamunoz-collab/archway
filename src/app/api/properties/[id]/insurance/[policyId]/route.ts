import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; policyId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, policyId } = await params
  const body = await request.json()

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
      userId: user.id,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; policyId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, policyId } = await params
  await prisma.insurancePolicy.delete({ where: { id: policyId, propertyId: id } })

  await prisma.activityLog.create({
    data: {
      entityType: 'property',
      entityId: id,
      action: 'insurance_deleted',
      details: { policyId },
      userId: user.id,
    },
  })

  return NextResponse.json({ success: true })
}
