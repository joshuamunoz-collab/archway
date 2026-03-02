import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; leaseId: string }> }
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

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
      userId: auth.user.id,
    },
  })

  // Convert Prisma Decimal fields to numbers for JSON serialization
  const serialized = {
    ...lease,
    contractRent: Number(lease.contractRent),
    hapAmount: lease.hapAmount ? Number(lease.hapAmount) : null,
    tenantCopay: lease.tenantCopay ? Number(lease.tenantCopay) : null,
    utilityAllowance: lease.utilityAllowance ? Number(lease.utilityAllowance) : null,
    paymentStandard: lease.paymentStandard ? Number(lease.paymentStandard) : null,
  }

  return NextResponse.json(serialized)
}
