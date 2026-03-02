import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const properties = await prisma.property.findMany({
    select: {
      id: true,
      addressLine1: true,
      streetNumber: true,
      streetName: true,
      entity: { select: { name: true } },
    },
    orderBy: { addressLine1: 'asc' },
  })

  return NextResponse.json(
    properties.map((p) => ({
      id: p.id,
      addressLine1: p.addressLine1,
      streetNumber: p.streetNumber,
      streetName: p.streetName,
      entityName: p.entity.name,
    })),
  )
}
