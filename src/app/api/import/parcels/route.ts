import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

// POST /api/import/parcels — import parcel numbers from CSV data
export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { rows } = (await request.json()) as {
    rows: { address: string; unit: string; parcel: string }[]
  }

  const properties = await prisma.property.findMany({
    select: { id: true, addressLine1: true, addressLine2: true, parcelNumber: true },
  })

  let matched = 0
  let updated = 0
  let notFound = 0
  const notFoundAddresses: string[] = []

  for (const row of rows) {
    if (!row.address || !row.parcel) continue

    const addrLower = row.address.toLowerCase()
    const unitLower = (row.unit ?? '').toLowerCase()
    const match = properties.find(p => {
      const pAddr = p.addressLine1.toLowerCase()
      const pUnit = (p.addressLine2 ?? '').toLowerCase()
      return (pAddr === addrLower || pAddr.includes(addrLower) || addrLower.includes(pAddr)) &&
             pUnit === unitLower
    })

    if (!match) {
      notFound++
      notFoundAddresses.push(`${row.address} ${row.unit}`.trim())
      continue
    }

    matched++
    if (match.parcelNumber === row.parcel) continue

    await prisma.property.update({
      where: { id: match.id },
      data: { parcelNumber: row.parcel },
    })
    updated++
  }

  return NextResponse.json({
    matched,
    updated,
    alreadySet: matched - updated,
    notFound,
    notFoundAddresses,
  })
}
