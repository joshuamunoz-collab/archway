import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await request.json()

  const allowed = ['firstName', 'lastName', 'phone', 'email', 'voucherNumber', 'phaCaseworker', 'phaPhone', 'notes']
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key] || null
  }
  // Names can't be null
  if ('firstName' in data && !data.firstName) return NextResponse.json({ error: 'First name required' }, { status: 400 })
  if ('lastName' in data && !data.lastName) return NextResponse.json({ error: 'Last name required' }, { status: 400 })

  const tenant = await prisma.tenant.update({ where: { id }, data })

  await prisma.activityLog.create({
    data: {
      entityType: 'tenant',
      entityId: id,
      action: 'tenant_updated',
      details: { updatedFields: Object.keys(data) },
      userId: auth.user.id,
    },
  })

  return NextResponse.json(tenant)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  // Check for active leases
  const activeLease = await prisma.lease.findFirst({ where: { tenantId: id, status: 'active' } })
  if (activeLease) {
    return NextResponse.json({ error: 'Cannot delete tenant with an active lease' }, { status: 409 })
  }

  await prisma.tenant.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
