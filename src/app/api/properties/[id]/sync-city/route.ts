import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

const ARCGIS_ZONING_URL =
  'https://stlgis.stlouis-mo.gov/arcgis/rest/services/public/PDA_ZONING/MapServer/0/query'

interface ArcGISFeature {
  attributes: Record<string, string | number | null>
}

// GET /api/properties/[id]/sync-city — preview city record data
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const property = await prisma.property.findUnique({
    where: { id },
    select: { id: true, parcelNumber: true, ward: true, neighborhood: true },
  })

  if (!property) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 })
  }
  if (!property.parcelNumber) {
    return NextResponse.json({ error: 'No parcel number set for this property' }, { status: 400 })
  }

  const cityData = await fetchCityRecord(property.parcelNumber)
  if (!cityData) {
    return NextResponse.json({ error: 'No city record found for this parcel number' }, { status: 404 })
  }

  return NextResponse.json({
    current: {
      ward: property.ward,
      neighborhood: property.neighborhood,
    },
    cityRecord: cityData,
    parcelNumber: property.parcelNumber,
  })
}

// POST /api/properties/[id]/sync-city — apply city record data
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const property = await prisma.property.findUnique({
    where: { id },
    select: { id: true, parcelNumber: true },
  })

  if (!property) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 })
  }
  if (!property.parcelNumber) {
    return NextResponse.json({ error: 'No parcel number set for this property' }, { status: 400 })
  }

  const cityData = await fetchCityRecord(property.parcelNumber)
  if (!cityData) {
    return NextResponse.json({ error: 'No city record found for this parcel number' }, { status: 404 })
  }

  // Update property fields from city data
  const updateData: Record<string, string | null> = {}
  if (cityData.ward) updateData.ward = cityData.ward
  if (cityData.neighborhood) updateData.neighborhood = cityData.neighborhood

  if (Object.keys(updateData).length > 0) {
    await prisma.property.update({
      where: { id },
      data: updateData,
    })
  }

  // Upsert property_details with additional fields
  await prisma.propertyDetails.upsert({
    where: { propertyId: id },
    create: {
      propertyId: id,
      parcelNumber: property.parcelNumber,
      ward: cityData.ward,
      neighborhood: cityData.neighborhood,
      zoning: cityData.zoning,
      lotSize: cityData.landArea ? parseFloat(cityData.landArea) : null,
      lastSyncedAt: new Date(),
    },
    update: {
      parcelNumber: property.parcelNumber,
      ward: cityData.ward,
      neighborhood: cityData.neighborhood,
      zoning: cityData.zoning,
      lotSize: cityData.landArea ? parseFloat(cityData.landArea) : null,
      lastSyncedAt: new Date(),
    },
  })

  // Log the sync
  await prisma.activityLog.create({
    data: {
      entityType: 'property',
      entityId: id,
      action: 'synced_city_records',
      details: { parcelNumber: property.parcelNumber, ...cityData },
      userId: auth.user.id,
    },
  })

  return NextResponse.json({ success: true, synced: cityData })
}

async function fetchCityRecord(parcelNumber: string) {
  try {
    const url = new URL(ARCGIS_ZONING_URL)
    url.searchParams.set('where', `HANDLE='${parcelNumber}'`)
    url.searchParams.set('outFields', 'HANDLE,WARD,NBRHD,OWNERNAME,LANDAREA,ASRUSE,ZONING')
    url.searchParams.set('returnGeometry', 'false')
    url.searchParams.set('f', 'json')

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null

    const data = await res.json()
    const features = data.features as ArcGISFeature[] | undefined
    if (!features || features.length === 0) return null

    const attrs = features[0].attributes
    return {
      ward: attrs.WARD ? String(attrs.WARD) : null,
      neighborhood: attrs.NBRHD ? String(attrs.NBRHD) : null,
      ownerName: attrs.OWNERNAME ? String(attrs.OWNERNAME) : null,
      landArea: attrs.LANDAREA ? String(attrs.LANDAREA) : null,
      zoning: attrs.ZONING ? String(attrs.ZONING) : null,
      asrUse: attrs.ASRUSE ? String(attrs.ASRUSE) : null,
    }
  } catch {
    return null
  }
}
