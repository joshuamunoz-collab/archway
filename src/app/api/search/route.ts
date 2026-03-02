import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) {
    return NextResponse.json({ properties: [], tenants: [], tasks: [] })
  }

  const [properties, tenants, tasks] = await Promise.all([
    prisma.property.findMany({
      where: {
        OR: [
          { addressLine1: { contains: q, mode: 'insensitive' } },
          { addressLine2: { contains: q, mode: 'insensitive' } },
          { neighborhood: { contains: q, mode: 'insensitive' } },
          { parcelNumber: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        addressLine1: true,
        addressLine2: true,
        status: true,
        neighborhood: true,
      },
      take: 5,
      orderBy: { addressLine1: 'asc' },
    }),
    prisma.tenant.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
          { voucherNumber: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
      },
      take: 5,
      orderBy: { lastName: 'asc' },
    }),
    prisma.pmTask.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return NextResponse.json({ properties, tenants, tasks })
}
