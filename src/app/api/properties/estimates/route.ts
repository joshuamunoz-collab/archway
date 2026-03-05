import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { fetchEstimate } from '@/app/api/properties/[id]/estimate/route'

// POST /api/properties/estimates — bulk-fetch estimates for all properties
export async function POST() {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const apiKey = process.env.RENTCAST_API_KEY
  if (!apiKey || apiKey === 'your_rentcast_api_key_here') {
    return NextResponse.json({ error: 'RENTCAST_API_KEY not configured' }, { status: 500 })
  }

  const properties = await prisma.property.findMany({
    select: { id: true, addressLine1: true, city: true, state: true, zip: true },
    orderBy: { addressLine1: 'asc' },
  })

  let updated = 0
  let failed = 0
  let skipped = 0
  const errors: string[] = []

  for (const property of properties) {
    // Respect RentCast's 20 req/sec limit — space requests ~100ms apart
    if (updated + failed + skipped > 0) {
      await new Promise(r => setTimeout(r, 100))
    }

    const result = await fetchEstimate(apiKey, property)

    if (!result.ok) {
      // If rate limited, wait 2 seconds and retry once
      if (result.error.includes('Rate limited')) {
        await new Promise(r => setTimeout(r, 2000))
        const retry = await fetchEstimate(apiKey, property)
        if (retry.ok) {
          await prisma.property.update({
            where: { id: property.id },
            data: { zestimate: retry.value },
          })
          updated++
          continue
        }
      }
      failed++
      errors.push(`${property.addressLine1}: ${result.error}`)
      continue
    }

    await prisma.property.update({
      where: { id: property.id },
      data: { zestimate: result.value },
    })
    updated++
  }

  await prisma.activityLog.create({
    data: {
      entityType: 'system',
      entityId: 'bulk-estimates',
      action: 'refreshed_zestimates',
      details: { total: properties.length, updated, failed, skipped },
      userId: auth.user.id,
    },
  })

  return NextResponse.json({
    total: properties.length,
    updated,
    failed,
    errors: errors.slice(0, 10),
  })
}
