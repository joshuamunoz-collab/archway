import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

const VALID_STATUSES = ['occupied', 'vacant', 'rehab', 'pending_inspection', 'pending_packet']
const VALID_TYPES = ['single_family', 'duplex', 'multi_family', '']

interface ImportRow {
  address: string
  unit?: string
  city?: string
  state?: string
  zip: string
  entity_name: string
  parcel_number?: string
  type?: string
  beds?: string
  baths?: string
  sqft?: string
  year_built?: string
  is_section_8?: string
  status?: string
  vacant_since?: string
  neighborhood?: string
  ward?: string
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rows }: { rows: ImportRow[] } = await request.json()
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }

  // Pre-load all entities for lookup
  const entities = await prisma.entity.findMany({ select: { id: true, name: true } })
  const entityMap = new Map(entities.map(e => [e.name.toLowerCase().trim(), e.id]))

  const results: { row: number; address: string; success: boolean; error?: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1
    const address = row.address?.trim()

    try {
      // Validate required fields
      if (!address) throw new Error('address is required')
      if (!row.zip?.trim()) throw new Error('zip is required')
      if (!row.entity_name?.trim()) throw new Error('entity_name is required')

      // Lookup entity
      const entityId = entityMap.get(row.entity_name.toLowerCase().trim())
      if (!entityId) throw new Error(`Entity "${row.entity_name}" not found — add it in Settings → Entities first`)

      // Validate status
      const status = row.status?.trim() || 'vacant'
      if (!VALID_STATUSES.includes(status)) {
        throw new Error(`Invalid status "${status}". Must be: ${VALID_STATUSES.join(', ')}`)
      }

      // Validate type
      const propertyType = row.type?.trim() || null
      if (propertyType && !VALID_TYPES.includes(propertyType)) {
        throw new Error(`Invalid type "${propertyType}". Must be: single_family, duplex, multi_family`)
      }

      // Parse vacantSince
      let vacantSince: Date | null = null
      if (status === 'vacant') {
        if (row.vacant_since?.trim()) {
          const d = new Date(row.vacant_since.trim())
          if (isNaN(d.getTime())) throw new Error(`Invalid vacant_since date: "${row.vacant_since}"`)
          vacantSince = d
        } else {
          vacantSince = new Date()
        }
      }

      const property = await prisma.property.create({
        data: {
          entityId,
          addressLine1: address,
          addressLine2: row.unit?.trim() || null,
          city: row.city?.trim() || 'St. Louis',
          state: row.state?.trim() || 'MO',
          zip: row.zip.trim(),
          parcelNumber: row.parcel_number?.trim() || null,
          propertyType: propertyType || null,
          beds: row.beds ? parseInt(row.beds) : null,
          baths: row.baths ? parseFloat(row.baths) : null,
          sqft: row.sqft ? parseInt(row.sqft) : null,
          yearBuilt: row.year_built ? parseInt(row.year_built) : null,
          isSection8: row.is_section_8?.toLowerCase() === 'true',
          status,
          vacantSince,
          neighborhood: row.neighborhood?.trim() || null,
          ward: row.ward?.trim() || null,
        },
      })

      await prisma.activityLog.create({
        data: {
          entityType: 'property',
          entityId: property.id,
          action: 'imported',
          details: { address },
          userId: user.id,
        },
      })

      results.push({ row: rowNum, address, success: true })
    } catch (err) {
      results.push({
        row: rowNum,
        address: address || `Row ${rowNum}`,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  return NextResponse.json({ results })
}
