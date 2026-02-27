import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; leaseId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: propertyId, leaseId } = await params
  const body = await request.json()

  const allowed = [
    'endDate', 'contractRent', 'hapAmount', 'tenantCopay',
    'utilityAllowance', 'paymentStandard', 'hapContractStart',
    'hapContractEnd', 'recertificationDate', 'status', 'notes',
  ]
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) {
      if (['endDate', 'hapContractStart', 'hapContractEnd', 'recertificationDate'].includes(key)) {
        data[key] = body[key] ? new Date(body[key]) : null
      } else {
        data[key] = body[key] ?? null
      }
    }
  }

  const lease = await prisma.lease.update({ where: { id: leaseId, propertyId }, data })

  // If terminating lease, set property to vacant
  if (body.status === 'terminated') {
    await prisma.property.update({
      where: { id: propertyId },
      data: { status: 'vacant', vacantSince: new Date() },
    })
  }

  await prisma.activityLog.create({
    data: {
      entityType: 'property',
      entityId: propertyId,
      action: 'lease_updated',
      details: { leaseId, updatedFields: Object.keys(data) },
      userId: user.id,
    },
  })

  return NextResponse.json(lease)
}
