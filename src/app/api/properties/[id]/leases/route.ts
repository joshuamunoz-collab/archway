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

  const { id: propertyId } = await params
  const body = await request.json()

  const {
    tenantId,
    startDate,
    endDate,
    contractRent,
    hapAmount,
    tenantCopay,
    utilityAllowance,
    paymentStandard,
    hapContractStart,
    hapContractEnd,
    recertificationDate,
    notes,
  } = body

  if (!tenantId || !startDate || contractRent == null) {
    return NextResponse.json({ error: 'tenantId, startDate, and contractRent are required' }, { status: 400 })
  }

  // Terminate any existing active leases for this property
  await prisma.lease.updateMany({
    where: { propertyId, status: 'active' },
    data: { status: 'terminated' },
  })

  const lease = await prisma.lease.create({
    data: {
      propertyId,
      tenantId,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      contractRent: contractRent,
      hapAmount: hapAmount ?? null,
      tenantCopay: tenantCopay ?? null,
      utilityAllowance: utilityAllowance ?? null,
      paymentStandard: paymentStandard ?? null,
      hapContractStart: hapContractStart ? new Date(hapContractStart) : null,
      hapContractEnd: hapContractEnd ? new Date(hapContractEnd) : null,
      recertificationDate: recertificationDate ? new Date(recertificationDate) : null,
      status: 'active',
      notes: notes || null,
    },
    include: { tenant: true },
  })

  // Update property status to occupied
  await prisma.property.update({
    where: { id: propertyId },
    data: { status: 'occupied', vacantSince: null },
  })

  await prisma.activityLog.create({
    data: {
      entityType: 'property',
      entityId: propertyId,
      action: 'lease_created',
      details: {
        tenantName: `${lease.tenant.firstName} ${lease.tenant.lastName}`,
        startDate,
        contractRent: Number(contractRent),
      },
      userId: user.id,
    },
  })

  return NextResponse.json(lease, { status: 201 })
}
