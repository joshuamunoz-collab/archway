import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const tenants = await prisma.tenant.findMany({
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    include: {
      leases: {
        where: { status: 'active' },
        take: 1,
        orderBy: { startDate: 'desc' },
        include: {
          property: {
            select: { id: true, addressLine1: true, addressLine2: true, city: true, state: true },
          },
        },
      },
    },
  })

  return NextResponse.json(tenants)
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const body = await request.json()
  const { firstName, lastName, phone, email, voucherNumber, phaCaseworker, phaPhone, notes } = body

  if (!firstName?.trim() || !lastName?.trim()) {
    return NextResponse.json({ error: 'First and last name are required' }, { status: 400 })
  }

  const tenant = await prisma.tenant.create({
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone || null,
      email: email || null,
      voucherNumber: voucherNumber || null,
      phaCaseworker: phaCaseworker || null,
      phaPhone: phaPhone || null,
      notes: notes || null,
    },
  })

  await prisma.activityLog.create({
    data: {
      entityType: 'tenant',
      entityId: tenant.id,
      action: 'tenant_created',
      details: { name: `${firstName} ${lastName}` },
      userId: auth.user.id,
    },
  })

  return NextResponse.json(tenant, { status: 201 })
}
