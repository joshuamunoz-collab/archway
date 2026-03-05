/**
 * Import parcel numbers from CSV into existing properties.
 *
 * Usage:
 *   node --env-file=.env.local scripts/import-parcels.mjs [path-to-csv]
 *
 * Default CSV path: C:\Users\Neil Justine Reyes\Downloads\properties (2).csv
 */

import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const csvPath = process.argv[2] || String.raw`C:\Users\Neil Justine Reyes\Downloads\properties (2).csv`

function parseCsvLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

console.log(`Reading CSV: ${csvPath}`)
const raw = fs.readFileSync(csvPath, 'utf-8')
const lines = raw.trim().split('\n')
const header = parseCsvLine(lines[0])
const rows = lines.slice(1).map(line => {
  const vals = parseCsvLine(line)
  const obj = {}
  header.forEach((h, i) => { obj[h.trim()] = vals[i]?.trim() ?? '' })
  return obj
})

console.log(`Parsed ${rows.length} rows from CSV`)

// Load all properties via Supabase
const { data: properties, error: fetchErr } = await supabase
  .from('properties')
  .select('id, address_line1, address_line2, parcel_number')

if (fetchErr) {
  console.error('Failed to fetch properties:', fetchErr.message)
  process.exit(1)
}
console.log(`Found ${properties.length} properties in database`)

let matched = 0
let updated = 0
let skipped = 0
let notFound = 0

for (const row of rows) {
  const address = row['address'] ?? ''
  const unit = row['unit'] ?? ''
  const parcel = row['Parcel number'] ?? ''

  if (!address || !parcel) {
    skipped++
    continue
  }

  const addrLower = address.toLowerCase()
  const unitLower = unit.toLowerCase()
  const match = properties.find(p => {
    const pAddr = p.address_line1.toLowerCase()
    const pUnit = (p.address_line2 ?? '').toLowerCase()
    return (pAddr === addrLower || pAddr.includes(addrLower) || addrLower.includes(pAddr)) &&
           pUnit === unitLower
  })

  if (!match) {
    console.log(`  NOT FOUND: ${address} ${unit}`)
    notFound++
    continue
  }

  matched++

  if (match.parcel_number === parcel) {
    continue
  }

  const { error: updateErr } = await supabase
    .from('properties')
    .update({ parcel_number: parcel })
    .eq('id', match.id)

  if (updateErr) {
    console.error(`  ERROR updating ${address}: ${updateErr.message}`)
    continue
  }

  updated++
  console.log(`  UPDATED: ${address} ${unit} → parcel ${parcel}`)
}

console.log(`\nDone!`)
console.log(`  Matched: ${matched}`)
console.log(`  Updated: ${updated}`)
console.log(`  Already set: ${matched - updated}`)
console.log(`  Not found: ${notFound}`)
console.log(`  Skipped (empty): ${skipped}`)
