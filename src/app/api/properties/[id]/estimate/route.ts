import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

const RENTCAST_URL = 'https://api.rentcast.io/v1/avm/value'

// POST /api/properties/[id]/estimate — fetch value estimate from RentCast
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const apiKey = process.env.RENTCAST_API_KEY
  if (!apiKey || apiKey === 'your_rentcast_api_key_here') {
    return NextResponse.json({ error: 'RENTCAST_API_KEY not configured' }, { status: 500 })
  }

  const { id } = await params
  const property = await prisma.property.findUnique({
    where: { id },
    select: { id: true, addressLine1: true, city: true, state: true, zip: true },
  })

  if (!property) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 })
  }

  const estimate = await fetchEstimate(apiKey, property)
  if (!estimate.ok) {
    return NextResponse.json({ error: estimate.error }, { status: 502 })
  }

  await prisma.property.update({
    where: { id },
    data: { zestimate: estimate.value },
  })

  return NextResponse.json({ zestimate: estimate.value })
}

export async function fetchEstimate(
  apiKey: string,
  property: { addressLine1: string; city: string; state: string; zip: string }
): Promise<{ ok: true; value: number } | { ok: false; error: string }> {
  try {
    const url = new URL(RENTCAST_URL)
    url.searchParams.set('address', property.addressLine1)
    url.searchParams.set('city', property.city)
    url.searchParams.set('state', property.state)
    url.searchParams.set('zipCode', property.zip)

    const res = await fetch(url.toString(), {
      headers: { 'X-Api-Key': apiKey },
      signal: AbortSignal.timeout(15000),
    })

    if (res.status === 429) {
      return { ok: false, error: 'Rate limited — try again later' }
    }
    if (!res.ok) {
      return { ok: false, error: `RentCast API error: ${res.status}` }
    }

    const data = await res.json()
    const price = data.price
    if (typeof price !== 'number' || price <= 0) {
      return { ok: false, error: 'No value estimate available for this address' }
    }

    return { ok: true, value: Math.round(price) }
  } catch {
    return { ok: false, error: 'Failed to connect to RentCast API' }
  }
}
