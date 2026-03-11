'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'

/* ── Types ── */

interface MaintenanceItem {
  date: string
  desc: string
  amount: number
}

interface PropertyData {
  address: string
  tenant: string
  payee: string
  rent: number
  pm_fee: number
  maintenance: number
  maintenance_items: MaintenanceItem[]
  net: number
  noi: number
}

interface ParsedSheet {
  portfolio: string | null
  month: string | null
  properties: PropertyData[]
}

interface MonthData {
  income: number
  expenses: number
  maintenance: number
  pm_fee: number
  noi: number
  properties: PropertyData[]
}

interface AggregatedPortfolio {
  byMonth: Record<string, MonthData>
  ytd: { income: number; expenses: number; noi: number }
  months: string[]
}

type PortfolioData = Record<string, Record<string, PropertyData[]>>

/* ── Parsing helpers ── */

// Search every cell in a row for a value (handles column shifts between years)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findCellByLabel(rows: any[][], label: string): { rowIdx: number; colIdx: number } | null {
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < (rows[r]?.length ?? 0); c++) {
      if (rows[r][c] !== null && String(rows[r][c]).trim() === label) {
        return { rowIdx: r, colIdx: c }
      }
    }
  }
  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findCellByPattern(rows: any[][], pattern: RegExp): { rowIdx: number; colIdx: number } | null {
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < (rows[r]?.length ?? 0); c++) {
      if (rows[r][c] !== null && pattern.test(String(rows[r][c]).trim())) {
        return { rowIdx: r, colIdx: c }
      }
    }
  }
  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseSheet(ws: XLSX.WorkSheet): ParsedSheet {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[][] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: null }).forEach((r: any[]) => {
    if (r.some((v: unknown) => v !== null)) rows.push(r)
  })

  console.log('[parseSheet] Total non-empty rows:', rows.length)
  // Log first 5 rows for debugging layout
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    console.log(`[parseSheet] Row ${i}:`, JSON.stringify(rows[i]?.slice(0, 12)))
  }

  let portfolio: string | null = null
  let month: string | null = null
  const properties: Record<string, { rent: number; pm_fee: number; tenants: string[]; payee: string[] }> = {}
  const maintenance: Record<string, MaintenanceItem[]> = {}
  let inDetails = false

  // Column offsets — detected dynamically, default to known 2025 layout
  let colPortfolioValue = 2
  let colMonthValue = 2
  let colAddr = 4
  let colPayee = 5
  let colTenant = 6
  let colRent = 9
  let colPM = 10
  let colMaintAddr = 16
  let colMaintDate = 18
  let colMaintDesc = 19
  let colMaintAmt = 20

  // Auto-detect column layout by finding key labels
  const portfolioCell = findCellByLabel(rows, 'Portfolio')
  if (portfolioCell) {
    colPortfolioValue = portfolioCell.colIdx + 1
    portfolio = rows[portfolioCell.rowIdx][colPortfolioValue]
      ? String(rows[portfolioCell.rowIdx][colPortfolioValue]).trim()
      : null
    console.log('[parseSheet] Found "Portfolio" at col', portfolioCell.colIdx, '→ value:', portfolio)
  }

  const monthCell = findCellByLabel(rows, 'Month Billed:') || findCellByPattern(rows, /^Month\s*Billed/i)
  if (monthCell) {
    colMonthValue = monthCell.colIdx + 1
    const raw = rows[monthCell.rowIdx][colMonthValue]
    console.log('[parseSheet] Found "Month Billed" at col', monthCell.colIdx, '→ raw value:', raw, '(type:', typeof raw, ')')
    if (raw instanceof Date) {
      month = `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, '0')}`
    } else if (typeof raw === 'number') {
      const d = XLSX.SSF.parse_date_code(raw)
      month = `${d.y}-${String(d.m).padStart(2, '0')}`
    } else if (raw) {
      const s = String(raw).trim()
      // Try to parse various date formats: "January 2026", "2026-01", "01/2026", etc.
      const isoMatch = s.match(/^(\d{4})-(\d{2})$/)
      if (isoMatch) {
        month = s
      } else {
        const parsed = new Date(s + ' 1') // "January 2026 1" → parseable
        if (!isNaN(parsed.getTime())) {
          month = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`
        } else {
          month = s
        }
      }
    }
    console.log('[parseSheet] Parsed month:', month)
  }

  const paymentIdCell = findCellByLabel(rows, 'Payment ID')
  if (paymentIdCell) {
    console.log('[parseSheet] Found "Payment ID" at row', paymentIdCell.rowIdx, 'col', paymentIdCell.colIdx)
    // Detect column layout from header row
    const headerRow = rows[paymentIdCell.rowIdx]
    for (let c = 0; c < (headerRow?.length ?? 0); c++) {
      const val = headerRow[c] ? String(headerRow[c]).trim().toLowerCase() : ''
      if (val === 'address' || val === 'property address' || val === 'property') colAddr = c
      if (val === 'payee' || val === 'pay to') colPayee = c
      if (val === 'tenant' || val === 'tenant name') colTenant = c
      if (val === 'rent' || val === 'amount' || val === 'rent amount') colRent = c
      if (val === 'pm fee' || val === 'management fee' || val === 'pm') colPM = c
    }
    console.log('[parseSheet] Detected columns — addr:', colAddr, 'tenant:', colTenant, 'rent:', colRent, 'pm:', colPM)
  }

  const toDateStr = (v: unknown): string => {
    if (!v) return ''
    if (v instanceof Date) return v.toISOString().slice(0, 10)
    if (typeof v === 'number') {
      const d = XLSX.SSF.parse_date_code(v)
      return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
    }
    return String(v)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function gotoMaint(row: any[]) {
    const mAddr = row[colMaintAddr] ? String(row[colMaintAddr]).trim() : null
    const mDate = row[colMaintDate]
    const mDesc = row[colMaintDesc] ? String(row[colMaintDesc]) : ''
    const mAmt = typeof row[colMaintAmt] === 'number' ? row[colMaintAmt] : null
    if (
      mAddr &&
      mAmt !== null &&
      !mAddr.startsWith('TOTAL') &&
      !mAddr.startsWith('Make') &&
      !mAddr.startsWith('Billing') &&
      !mAddr.match(/^\d{4}-\d{2}$/) &&
      mAddr !== 'None'
    ) {
      if (!maintenance[mAddr]) maintenance[mAddr] = []
      const entry = { date: toDateStr(mDate), desc: mDesc, amount: mAmt }
      const key = JSON.stringify(entry)
      if (!maintenance[mAddr].find(e => JSON.stringify(e) === key)) maintenance[mAddr].push(entry)
    }
  }

  let detailRowCount = 0
  for (const row of rows) {
    // Skip rows already handled by auto-detect above
    if (!portfolioCell && row[1] === 'Portfolio') {
      portfolio = row[2] ? String(row[2]).trim() : null
      continue
    }
    if (!monthCell && (row[1] === 'Month Billed:' || (typeof row[1] === 'string' && /^Month\s*Billed/i.test(row[1])))) {
      const raw = row[2]
      if (raw instanceof Date) {
        month = `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, '0')}`
      } else if (typeof raw === 'number') {
        const d = XLSX.SSF.parse_date_code(raw)
        month = `${d.y}-${String(d.m).padStart(2, '0')}`
      } else if (raw) {
        month = String(raw).trim()
      }
      continue
    }
    if (row[1] === 'Payment ID' || (paymentIdCell && rows.indexOf(row) === paymentIdCell.rowIdx)) {
      inDetails = true
      continue
    }

    if (inDetails) {
      detailRowCount++
      const pid = row[1]
      if (!pid) {
        gotoMaint(row)
      } else if (String(pid).endsWith('Total') || String(pid).startsWith('TOTAL')) {
        gotoMaint(row)
        continue
      } else {
        const addr = row[colAddr] ? String(row[colAddr]).trim() : null
        const tenant = row[colTenant] ? String(row[colTenant]) : ''
        const payee = row[colPayee] ? String(row[colPayee]) : ''
        const rent = typeof row[colRent] === 'number' ? row[colRent] : 0
        const pm = typeof row[colPM] === 'number' ? row[colPM] : 0
        if (addr && !addr.match(/^\d{4}-\d{2}$/) && addr !== 'None') {
          if (!properties[addr]) properties[addr] = { rent: 0, pm_fee: 0, tenants: [], payee: [] }
          properties[addr].rent += rent
          properties[addr].pm_fee += pm
          if (tenant && !properties[addr].tenants.includes(tenant)) properties[addr].tenants.push(tenant)
          if (payee && !properties[addr].payee.includes(payee)) properties[addr].payee.push(payee)
        }
        gotoMaint(row)
      }
    } else {
      gotoMaint(row)
    }
  }

  console.log('[parseSheet] Detail rows processed:', detailRowCount)

  const allAddrs = new Set([...Object.keys(properties), ...Object.keys(maintenance)])
  const props: PropertyData[] = []
  for (const addr of allAddrs) {
    const inf = properties[addr] || { rent: 0, pm_fee: 0, tenants: [] as string[], payee: [] as string[] }
    const mItems = maintenance[addr] || []
    const mTotal = mItems.reduce((s, i) => s + i.amount, 0)
    props.push({
      address: addr,
      tenant: (inf.tenants || []).join(', '),
      payee: (inf.payee || []).join(', '),
      rent: Math.round(inf.rent * 100) / 100,
      pm_fee: Math.round(inf.pm_fee * 100) / 100,
      maintenance: Math.round(mTotal * 100) / 100,
      maintenance_items: mItems,
      net: Math.round((inf.rent - mTotal) * 100) / 100,
      noi: Math.round((inf.rent - mTotal - inf.pm_fee) * 100) / 100,
    })
  }
  console.log('[parseSheet] RESULT → portfolio:', portfolio, '| month:', month, '| props count:', props.length)
  if (!portfolio) console.warn('[parseSheet] ⚠ Portfolio is NULL — "Portfolio" label not found in any cell')
  if (!month) console.warn('[parseSheet] ⚠ Month is NULL — "Month Billed:" label not found in any cell')
  return { portfolio, month, properties: props }
}

function tryParseSpreadsheet(buf: ArrayBuffer, fileName: string): ParsedSheet | null {
  try {
    const wb = XLSX.read(buf, { type: 'array', cellDates: true })
    console.log('[parseZip] SheetJS opened:', fileName, '| sheets:', wb.SheetNames)
    const ws = wb.Sheets[wb.SheetNames[0]]
    return parseSheet(ws)
  } catch (e) {
    console.warn('[parseZip] SheetJS could not open:', fileName, '|', e instanceof Error ? e.message : String(e))
    return null
  }
}

function handleParsedResult(parsed: ParsedSheet, fileName: string, results: Record<string, Record<string, PropertyData[]>>, skipped: string[]) {
  if (parsed.portfolio && parsed.month) {
    if (!results[parsed.portfolio]) results[parsed.portfolio] = {}
    results[parsed.portfolio][parsed.month] = parsed.properties
    console.log('[parseZip] ✓ OK:', fileName, '→', parsed.portfolio, parsed.month, '|', parsed.properties.length, 'properties')
  } else {
    const reason = !parsed.portfolio && !parsed.month ? 'no portfolio & no month found'
      : !parsed.portfolio ? 'no portfolio found' : 'no month found'
    skipped.push(`${fileName} (${reason})`)
    console.warn('[parseZip] SKIPPED:', fileName, '—', reason)
  }
}

async function tryReadEntryAsData(zf: JSZip.JSZipObject): Promise<ArrayBuffer | null> {
  try {
    const buf = await zf.async('arraybuffer')
    return buf.byteLength > 0 ? buf : null
  } catch {
    return null
  }
}

async function processBuffer(buf: ArrayBuffer, name: string, results: Record<string, Record<string, PropertyData[]>>, skipped: string[]) {
  const header = new Uint8Array(buf.slice(0, 8))
  const hex = Array.from(header.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join(' ')
  const isPK = header[0] === 0x50 && header[1] === 0x4B
  const isOLE2 = header[0] === 0xD0 && header[1] === 0xCF && header[2] === 0x11 && header[3] === 0xE0
  console.log('[parseZip] processBuffer:', name, '| size:', buf.byteLength, '| magic:', hex)

  if (isPK) {
    // PK = xlsx or nested zip — try spreadsheet first
    const parsed = tryParseSpreadsheet(buf, name)
    if (parsed && (parsed.portfolio || parsed.month)) {
      handleParsedResult(parsed, name, results, skipped)
      return
    }
    // Try as nested zip
    try {
      const innerZip = await JSZip.loadAsync(buf)
      const innerEntries = Object.values(innerZip.files)
      console.log('[parseZip] Opened PK as nested zip:', name, '|', innerEntries.length, 'entries inside')
      await processZipEntries(innerZip, results, skipped)
      return
    } catch { /* not a zip either */ }
    skipped.push(`${name} (PK file — not a valid xlsx or zip)`)
  } else if (isOLE2) {
    const parsed = tryParseSpreadsheet(buf, name)
    if (parsed) handleParsedResult(parsed, name, results, skipped)
    else skipped.push(`${name} (OLE2 file — SheetJS could not open)`)
  } else {
    // Last resort: try SheetJS
    const parsed = tryParseSpreadsheet(buf, name)
    if (parsed && (parsed.portfolio || parsed.month || parsed.properties.length > 0)) {
      handleParsedResult(parsed, name, results, skipped)
    } else {
      skipped.push(`${name} (unrecognized format, magic: ${hex})`)
    }
  }
}

async function processZipEntries(zip: JSZip, results: Record<string, Record<string, PropertyData[]>>, skipped: string[]) {
  // JSZip stores ALL entries flat with full paths (e.g. "2026.01/file.xlsx")
  // Get every non-directory entry regardless of subfolder depth
  const allEntries = Object.values(zip.files)
  const fileEntries = allEntries.filter(f => !f.dir && !f.name.includes('__MACOSX'))

  // Log every entry for debugging
  console.log('[parseZip] ZIP contains', allEntries.length, 'total entries,', fileEntries.length, 'files')
  for (const f of allEntries) {
    console.log('[parseZip]  entry:', f.name, '| dir:', f.dir)
  }

  // Categorize by extension (works with full paths like "2026.01/file.xlsx")
  const spreadsheetExts = ['.xlsx', '.xls', '.xlsm', '.xlsb']
  const known = {
    spreadsheets: fileEntries.filter(f => spreadsheetExts.some(ext => f.name.toLowerCase().endsWith(ext))),
    zips: fileEntries.filter(f => f.name.toLowerCase().endsWith('.zip')),
    csvs: fileEntries.filter(f => f.name.toLowerCase().endsWith('.csv')),
    other: fileEntries.filter(f => {
      const lower = f.name.toLowerCase()
      return !spreadsheetExts.some(ext => lower.endsWith(ext))
        && !lower.endsWith('.zip')
        && !lower.endsWith('.csv')
    }),
  }

  console.log('[parseZip] Categorized:', known.spreadsheets.length, 'spreadsheets,', known.zips.length, 'zips,', known.csvs.length, 'csvs,', known.other.length, 'other/unknown')

  // 1. Known spreadsheets (.xlsx, .xls, etc. — at any subfolder depth)
  for (const zf of known.spreadsheets) {
    const buf = await zf.async('arraybuffer')
    const parsed = tryParseSpreadsheet(buf, zf.name)
    if (parsed) handleParsedResult(parsed, zf.name, results, skipped)
    else skipped.push(`${zf.name} (SheetJS could not open)`)
  }

  // 2. CSVs
  for (const zf of known.csvs) {
    const buf = await zf.async('arraybuffer')
    const parsed = tryParseSpreadsheet(buf, zf.name)
    if (parsed) handleParsedResult(parsed, zf.name, results, skipped)
    else skipped.push(`${zf.name} (CSV parse failed)`)
  }

  // 3. Nested zips
  for (const zf of known.zips) {
    console.log('[parseZip] Extracting nested zip:', zf.name)
    try {
      const buf = await zf.async('arraybuffer')
      const innerZip = await JSZip.loadAsync(buf)
      await processZipEntries(innerZip, results, skipped)
    } catch (e) {
      skipped.push(`${zf.name} (nested zip error: ${e instanceof Error ? e.message : String(e)})`)
      console.error('[parseZip] ERROR opening nested zip:', zf.name, e)
    }
  }

  // 4. Unknown files — detect by magic bytes
  for (const zf of known.other) {
    const buf = await zf.async('arraybuffer')
    await processBuffer(buf, zf.name, results, skipped)
  }
}

interface ParseZipResult {
  data: Record<string, Record<string, PropertyData[]>>
  skipped: string[]
}

async function parseZip(file: File): Promise<ParseZipResult> {
  const zip = await JSZip.loadAsync(file)
  const results: Record<string, Record<string, PropertyData[]>> = {}
  const skipped: string[] = []
  await processZipEntries(zip, results, skipped)
  return { data: results, skipped }
}

/* ── Formatters ── */

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
const fmtFull = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
const pct = (n: number, d: number) => (d === 0 ? '—' : (n / d * 100).toFixed(1) + '%')

/* ── Aggregation ── */

function aggregatePortfolio(monthlyData: Record<string, PropertyData[]>): AggregatedPortfolio {
  const months = Object.keys(monthlyData).sort()
  const byMonth: Record<string, MonthData> = {}
  for (const m of months) {
    const props = monthlyData[m]
    byMonth[m] = {
      income: props.reduce((s, p) => s + p.rent, 0),
      expenses: props.reduce((s, p) => s + p.maintenance + p.pm_fee, 0),
      maintenance: props.reduce((s, p) => s + p.maintenance, 0),
      pm_fee: props.reduce((s, p) => s + p.pm_fee, 0),
      noi: props.reduce((s, p) => s + p.noi, 0),
      properties: props,
    }
  }
  const ytd = {
    income: months.reduce((s, m) => s + byMonth[m].income, 0),
    expenses: months.reduce((s, m) => s + byMonth[m].expenses, 0),
    noi: months.reduce((s, m) => s + byMonth[m].noi, 0),
  }
  return { byMonth, ytd, months }
}

/* ── Sub-components ── */

function KpiCard({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 24px', flex: 1, minWidth: 160 }}>
      <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: positive === false ? '#ef4444' : positive === true ? '#10b981' : '#111827', fontFamily: 'monospace' }}>{value}</div>
    </div>
  )
}

function ExpandRow({ prop }: { prop: PropertyData }) {
  const [open, setOpen] = useState(false)
  const hasDetail = prop.maintenance_items?.length > 0 || !!prop.tenant
  return (
    <>
      <tr onClick={() => hasDetail && setOpen(o => !o)} style={{ cursor: hasDetail ? 'pointer' : 'default', borderBottom: '1px solid #f3f4f6' }}>
        <td style={{ padding: '9px 12px', fontSize: 13, color: '#374151' }}>
          {hasDetail && <span style={{ color: '#9ca3af', marginRight: 6, fontSize: 10 }}>{open ? '\u25BC' : '\u25B6'}</span>}
          {prop.address}
        </td>
        <td style={{ padding: '9px 12px', fontSize: 12, color: '#6b7280' }}>{prop.tenant || '—'}</td>
        <td style={{ padding: '9px 12px', fontSize: 13, textAlign: 'right', color: prop.rent < 0 ? '#ef4444' : '#111827', fontFamily: 'monospace' }}>{fmtFull(prop.rent)}</td>
        <td style={{ padding: '9px 12px', fontSize: 13, textAlign: 'right', color: '#6b7280', fontFamily: 'monospace' }}>{fmtFull(prop.pm_fee)}</td>
        <td style={{ padding: '9px 12px', fontSize: 13, textAlign: 'right', color: prop.maintenance > 0 ? '#ef4444' : '#9ca3af', fontFamily: 'monospace' }}>{prop.maintenance > 0 ? fmtFull(prop.maintenance) : '—'}</td>
        <td style={{ padding: '9px 12px', fontSize: 13, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: prop.noi >= 0 ? '#10b981' : '#ef4444' }}>{fmtFull(prop.noi)}</td>
      </tr>
      {open && (
        <tr style={{ background: '#f9fafb' }}>
          <td colSpan={6} style={{ padding: '10px 36px 14px' }}>
            {prop.tenant && <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}><b>Tenant:</b> {prop.tenant} · <b>Source:</b> {prop.payee}</div>}
            {prop.maintenance_items?.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Date', 'Description', 'Amount'].map((h, i) => (
                      <th key={h} style={{ textAlign: i === 2 ? 'right' : 'left', fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', padding: '3px 8px', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prop.maintenance_items.map((item, i) => (
                    <tr key={i}>
                      <td style={{ padding: '3px 8px', fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>{item.date}</td>
                      <td style={{ padding: '3px 8px', fontSize: 12, color: '#374151' }}>{item.desc}</td>
                      <td style={{ padding: '3px 8px', fontSize: 12, color: '#ef4444', fontFamily: 'monospace', textAlign: 'right' }}>{fmtFull(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

function EntitySection({ name, agg, selectedMonth }: { name: string; agg: AggregatedPortfolio; selectedMonth: string }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('properties')
  const data = selectedMonth === 'YTD' ? agg.ytd : (agg.byMonth[selectedMonth] || { income: 0, expenses: 0, noi: 0 })
  const props = selectedMonth === 'YTD'
    ? Object.values(agg.byMonth).flatMap(m => m.properties).reduce<PropertyData[]>((acc, p) => {
        const ex = acc.find(x => x.address === p.address)
        if (ex) { ex.rent += p.rent; ex.pm_fee += p.pm_fee; ex.maintenance += p.maintenance; ex.noi += p.noi }
        else acc.push({ ...p, maintenance_items: [] })
        return acc
      }, [])
    : (agg.byMonth[selectedMonth]?.properties || [])

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 12, overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', padding: '13px 18px', cursor: 'pointer', background: open ? '#f9fafb' : '#fff', borderBottom: open ? '1px solid #e5e7eb' : 'none' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', flex: 1 }}>
          <span style={{ marginRight: 8, color: '#d1d5db', fontSize: 10 }}>{open ? '\u25BC' : '\u25B6'}</span>{name}
        </span>
        <div style={{ display: 'flex', gap: 48, marginRight: 16 }}>
          {([['Income', fmt(data.income), '#111827'], ['Expenses', fmt(data.expenses), '#374151'], ['NOI', fmt(data.noi), data.noi >= 0 ? '#10b981' : '#ef4444']] as const).map(([l, v, c]) => (
            <div key={l} style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{l}</div>
              <div style={{ fontSize: 13, fontFamily: 'monospace', color: c, fontWeight: l === 'NOI' ? 700 : 400 }}>{v}</div>
            </div>
          ))}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>NOI %</div>
            <div style={{ fontSize: 13, color: data.noi >= 0 ? '#10b981' : '#ef4444' }}>{pct(data.noi, data.income)}</div>
          </div>
        </div>
      </div>
      {open && (
        <div>
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#fff', padding: '0 18px' }}>
            {['properties', 'by month'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '10px 16px', fontSize: 12, fontWeight: tab === t ? 600 : 400, color: tab === t ? '#3b5bdb' : '#6b7280', borderBottom: tab === t ? '2px solid #3b5bdb' : '2px solid transparent', textTransform: 'capitalize' }}>{t}</button>
            ))}
          </div>
          {tab === 'properties' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['Address', 'Tenant', 'Rent', 'PM Fee', 'Maintenance', 'NOI'].map((h, i) => (
                      <th key={h} style={{ padding: '9px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: '#9ca3af', textAlign: i >= 2 ? 'right' : 'left', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>{props.map(p => <ExpandRow key={p.address} prop={p} />)}</tbody>
              </table>
            </div>
          )}
          {tab === 'by month' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['Month', 'Income', 'Expenses', 'PM Fees', 'Maintenance', 'NOI', 'NOI %'].map((h, i) => (
                      <th key={h} style={{ padding: '9px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: '#9ca3af', textAlign: i >= 1 ? 'right' : 'left', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agg.months.map(m => {
                    const md = agg.byMonth[m]
                    return (
                      <tr key={m} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '9px 12px', fontSize: 13, color: '#374151', fontWeight: 500 }}>{m}</td>
                        <td style={{ padding: '9px 12px', fontSize: 13, textAlign: 'right', fontFamily: 'monospace' }}>{fmtFull(md.income)}</td>
                        <td style={{ padding: '9px 12px', fontSize: 13, textAlign: 'right', fontFamily: 'monospace' }}>{fmtFull(md.expenses)}</td>
                        <td style={{ padding: '9px 12px', fontSize: 13, textAlign: 'right', fontFamily: 'monospace', color: '#6b7280' }}>{fmtFull(md.pm_fee)}</td>
                        <td style={{ padding: '9px 12px', fontSize: 13, textAlign: 'right', fontFamily: 'monospace', color: '#ef4444' }}>{fmtFull(md.maintenance)}</td>
                        <td style={{ padding: '9px 12px', fontSize: 13, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: md.noi >= 0 ? '#10b981' : '#ef4444' }}>{fmtFull(md.noi)}</td>
                        <td style={{ padding: '9px 12px', fontSize: 13, textAlign: 'right', color: md.noi >= 0 ? '#10b981' : '#ef4444' }}>{pct(md.noi, md.income)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Main component ── */

const ENTITY_ORDER = ['Gateway City Ventures', 'Missouri Urban Development', 'Provo Partners', 'ZYZZX, LLC']

export function FinancialsDashboard() {
  const [portfolioData, setPortfolioData] = useState<PortfolioData>(() => {
    try {
      const saved = localStorage.getItem('archway_financials_v2')
      return saved ? JSON.parse(saved) : {}
    } catch { return {} }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState('YTD')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      localStorage.setItem('archway_financials_v2', JSON.stringify(portfolioData))
    } catch (e) {
      console.warn('Could not save to localStorage:', e)
    }
  }, [portfolioData])

  // One-time sync: push any tenant data already in localStorage to the DB
  useEffect(() => {
    const synced = sessionStorage.getItem('archway_tenants_synced')
    if (synced || Object.keys(portfolioData).length === 0) return

    const entries: { tenantName: string; propertyAddress: string; contractRent: number }[] = []
    const seen = new Set<string>()
    for (const months of Object.values(portfolioData)) {
      const sortedMonths = Object.keys(months).sort()
      for (const m of sortedMonths) {
        for (const prop of months[m]) {
          if (prop.tenant && prop.tenant !== '—') {
            for (const name of prop.tenant.split(',')) {
              const trimmed = name.trim()
              const key = `${trimmed.toLowerCase()}|${prop.address.toLowerCase()}`
              if (trimmed && !seen.has(key)) {
                seen.add(key)
                entries.push({ tenantName: trimmed, propertyAddress: prop.address, contractRent: prop.rent })
              }
            }
          }
        }
      }
    }
    if (entries.length > 0) {
      fetch('/api/import/tenants-from-cashflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      }).then(res => {
        if (res.ok) sessionStorage.setItem('archway_tenants_synced', '1')
      }).catch(() => {})
    } else {
      sessionStorage.setItem('archway_tenants_synced', '1')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFiles = useCallback(async (files: File[]) => {
    setLoading(true)
    setError(null)
    try {
      const monthsAdded: string[] = []
      const allSkipped: string[] = []
      for (const file of files) {
        console.log('[handleFiles] Processing file:', file.name, '| size:', file.size, '| type:', file.type)
        // Use regex to find the real extension — handles filenames with multiple dots
        // e.g. "2026.01-20260306T163756Z-3-001.zip" → "zip"
        const extMatch = file.name.match(/\.(zip|xlsx)$/i)
        const ext = extMatch ? extMatch[1].toLowerCase() : file.name.split('.').pop()?.toLowerCase()
        console.log('[handleFiles] Detected extension:', ext)
        let parsed: Record<string, Record<string, PropertyData[]>> = {}
        let skipped: string[] = []
        if (ext === 'zip') {
          const result = await parseZip(file)
          parsed = result.data
          skipped = result.skipped
        } else if (ext === 'xlsx') {
          const buf = await file.arrayBuffer()
          const wb = XLSX.read(buf, { type: 'array', cellDates: true })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const r = parseSheet(ws)
          if (r.portfolio && r.month) {
            parsed[r.portfolio] = { [r.month]: r.properties }
          } else {
            skipped.push(`${file.name} (${!r.portfolio ? 'no portfolio' : 'no month'} found)`)
          }
        } else {
          // Fallback: detect file type by content (zip magic bytes: PK\x03\x04)
          const buf = await file.arrayBuffer()
          const header = new Uint8Array(buf.slice(0, 4))
          if (header[0] === 0x50 && header[1] === 0x4B) {
            console.log('[handleFiles] Detected zip by magic bytes for file:', file.name)
            const blob = new File([buf], file.name + '.zip', { type: 'application/zip' })
            const result = await parseZip(blob)
            parsed = result.data
            skipped = result.skipped
          } else {
            console.warn('[handleFiles] Unknown file type for:', file.name, '| ext:', ext)
          }
        }
        allSkipped.push(...skipped)
        const portfolioCount = Object.keys(parsed).length
        const monthCount = Object.values(parsed).reduce((s, p) => s + Object.keys(p).length, 0)
        console.log('[handleFiles] Parsed result:', portfolioCount, 'portfolios,', monthCount, 'months,', skipped.length, 'skipped')

        for (const [, months] of Object.entries(parsed)) {
          for (const [m] of Object.entries(months)) {
            if (!monthsAdded.includes(m)) monthsAdded.push(m)
          }
        }

        // Use functional updater so we always merge into the latest state
        setPortfolioData(prev => {
          const newData = { ...prev }
          for (const [pName, months] of Object.entries(parsed)) {
            if (!newData[pName]) newData[pName] = {}
            else newData[pName] = { ...newData[pName] }
            for (const [m, props] of Object.entries(months)) {
              newData[pName][m] = props as PropertyData[]
            }
          }
          return newData
        })
      }

      monthsAdded.sort()
      if (monthsAdded.length) setSelectedMonth(monthsAdded[monthsAdded.length - 1])

      // Sync tenant records to DB from parsed cashflow data
      if (monthsAdded.length > 0) {
        try {
          // Collect all tenant-address pairs from newly imported data, using most recent month's rent
          const tenantEntries: { tenantName: string; propertyAddress: string; contractRent: number }[] = []
          const tenantSeen = new Set<string>()
          // Read from the latest state via functional accessor pattern
          setPortfolioData(currentData => {
            for (const months of Object.values(currentData)) {
              // Use the latest month's data for each property (most accurate rent)
              const sortedMonths = Object.keys(months).sort()
              for (const m of sortedMonths) {
                for (const prop of months[m]) {
                  if (prop.tenant && prop.tenant !== '—') {
                    // A property may have multiple tenants comma-separated
                    for (const name of prop.tenant.split(',')) {
                      const trimmed = name.trim()
                      const key = `${trimmed.toLowerCase()}|${prop.address.toLowerCase()}`
                      if (trimmed && !tenantSeen.has(key)) {
                        tenantSeen.add(key)
                        tenantEntries.push({ tenantName: trimmed, propertyAddress: prop.address, contractRent: prop.rent })
                      }
                    }
                  }
                }
              }
            }
            return currentData // return unchanged
          })
          if (tenantEntries.length > 0) {
            const syncRes = await fetch('/api/import/tenants-from-cashflow', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ entries: tenantEntries }),
            })
            if (syncRes.ok) {
              const syncData = await syncRes.json()
              if (syncData.tenantsCreated > 0) {
                console.log(`[handleFiles] Synced ${syncData.tenantsCreated} tenants, ${syncData.leasesCreated} leases to DB`)
              }
            }
          }
        } catch (e) {
          console.warn('[handleFiles] Tenant sync failed (non-blocking):', e)
        }
      }

      // Build result message
      let msg = monthsAdded.length
        ? `Imported ${monthsAdded.join(', ')} successfully`
        : 'No data found in uploaded files'
      if (allSkipped.length > 0) {
        msg += ` — ${allSkipped.length} file(s) skipped`
        console.warn('[handleFiles] Skipped files:', allSkipped)
      }
      if (monthsAdded.length === 0 && allSkipped.length > 0) {
        setError(`Import failed: no valid data found. Skipped files:\n${allSkipped.join('\n')}`)
      }
      setToast(msg)
      setTimeout(() => setToast(null), 5000)
    } catch (e) {
      setError('Failed to parse file: ' + (e instanceof Error ? e.message : String(e)))
    }
    setLoading(false)
  }, [])

  const allMonths = [...new Set(Object.values(portfolioData).flatMap(p => Object.keys(p)))].sort()
  const aggregates: Record<string, AggregatedPortfolio> = {}
  for (const [name, months] of Object.entries(portfolioData)) aggregates[name] = aggregatePortfolio(months)

  const ytdIncome = Object.values(aggregates).reduce((s, a) => s + a.ytd.income, 0)
  const ytdExpenses = Object.values(aggregates).reduce((s, a) => s + a.ytd.expenses, 0)
  const ytdNOI = Object.values(aggregates).reduce((s, a) => s + a.ytd.noi, 0)
  const latestMonth = allMonths[allMonths.length - 1]
  const mtdNOI = latestMonth ? Object.values(aggregates).reduce((s, a) => s + (a.byMonth[latestMonth]?.noi || 0), 0) : 0

  const entityRows = ENTITY_ORDER.map(name => {
    const agg = aggregates[name]
    if (!agg) return { name, income: 0, expenses: 0, noi: 0 }
    const d = selectedMonth === 'YTD' ? agg.ytd : (agg.byMonth[selectedMonth] || { income: 0, expenses: 0, noi: 0 })
    return { name, ...d }
  })
  const tableTotal = {
    income: entityRows.reduce((s, r) => s + r.income, 0),
    expenses: entityRows.reduce((s, r) => s + r.expenses, 0),
    noi: entityRows.reduce((s, r) => s + r.noi, 0),
  }
  const hasData = Object.keys(portfolioData).length > 0

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p style={{ margin: '3px 0 0', color: '#6b7280', fontSize: 13 }}>
            Portfolio financial overview {allMonths.length > 0 ? `\u00B7 ${allMonths[0]} – ${allMonths[allMonths.length - 1]}` : `for ${new Date().getFullYear()}`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {allMonths.length > 0 && (
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ border: '1px solid #e5e7eb', borderRadius: 7, padding: '7px 12px', fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer' }}>
              <option value="YTD">YTD (All Months)</option>
              {allMonths.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
          {hasData && (
            <button
              onClick={() => {
                if (window.confirm('Clear all imported financial data?')) {
                  setPortfolioData({})
                  localStorage.removeItem('archway_financials_v2')
                  setSelectedMonth('YTD')
                }
              }}
              style={{ border: '1px solid #fecaca', borderRadius: 7, padding: '7px 14px', background: '#fff', fontSize: 13, fontWeight: 500, color: '#ef4444', cursor: 'pointer' }}
            >
              Clear All
            </button>
          )}
          <button
            onClick={() => { if (fileRef.current) { fileRef.current.value = ''; fileRef.current.click() } }}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 7, border: '1px solid #e5e7eb', borderRadius: 7, padding: '7px 14px', background: '#fff', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            {loading ? 'Importing\u2026' : 'Import'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".zip,.xlsx"
            style={{ display: 'none' }}
            onChange={e => {
              if (e.target.files?.length) handleFiles(Array.from(e.target.files))
            }}
          />
        </div>
      </div>

      {!hasData && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(Array.from(e.dataTransfer.files)) }}
          onClick={() => fileRef.current?.click()}
          style={{ border: `2px dashed ${dragOver ? '#3b5bdb' : '#d1d5db'}`, borderRadius: 12, padding: '56px 32px', textAlign: 'center', background: dragOver ? '#eef2ff' : '#fff', cursor: 'pointer', transition: 'all 0.2s', marginBottom: 24 }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" style={{ marginBottom: 12 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Drop your monthly statement ZIP here</div>
          <div style={{ fontSize: 13, color: '#9ca3af' }}>or click to browse — supports .zip (multiple portfolios) and .xlsx (single portfolio)</div>
        </div>
      )}

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 16px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
        <KpiCard label="YTD Income" value={fmt(ytdIncome)} />
        <KpiCard label="YTD Expenses" value={fmt(ytdExpenses)} positive={false} />
        <KpiCard label="YTD NOI" value={fmt(ytdNOI)} positive={ytdNOI >= 0} />
        <KpiCard label="MTD NOI" value={fmt(mtdNOI)} positive={mtdNOI >= 0} />
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{selectedMonth === 'YTD' ? 'YTD by Entity' : `${selectedMonth} by Entity`}</div>
          <Link href="/reports" style={{ color: '#3b5bdb', fontSize: 12, textDecoration: 'none' }}>Full Reports →</Link>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['Entity', 'Income', 'Expenses', 'NOI', 'NOI %'].map((h, i) => (
                <th key={h} style={{ padding: '10px 20px', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: '#9ca3af', textAlign: i === 0 ? 'left' : 'right', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entityRows.map(row => (
              <tr key={row.name} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '11px 20px', fontSize: 13, color: '#374151' }}>{row.name}</td>
                <td style={{ padding: '11px 20px', fontSize: 13, textAlign: 'right', fontFamily: 'monospace', color: '#111827' }}>{fmt(row.income)}</td>
                <td style={{ padding: '11px 20px', fontSize: 13, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(row.expenses)}</td>
                <td style={{ padding: '11px 20px', fontSize: 13, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: row.noi >= 0 ? '#10b981' : '#ef4444' }}>{fmt(row.noi)}</td>
                <td style={{ padding: '11px 20px', fontSize: 13, textAlign: 'right', color: row.noi >= 0 ? '#10b981' : '#9ca3af' }}>{pct(row.noi, row.income)}</td>
              </tr>
            ))}
            <tr style={{ background: '#f9fafb', fontWeight: 700 }}>
              <td style={{ padding: '11px 20px', fontSize: 13, color: '#111827' }}>Total</td>
              <td style={{ padding: '11px 20px', fontSize: 13, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(tableTotal.income)}</td>
              <td style={{ padding: '11px 20px', fontSize: 13, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(tableTotal.expenses)}</td>
              <td style={{ padding: '11px 20px', fontSize: 13, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: tableTotal.noi >= 0 ? '#10b981' : '#ef4444' }}>{fmt(tableTotal.noi)}</td>
              <td style={{ padding: '11px 20px', fontSize: 13, textAlign: 'right', color: tableTotal.noi >= 0 ? '#10b981' : '#9ca3af' }}>{pct(tableTotal.noi, tableTotal.income)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {hasData && (
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', marginBottom: 12 }}>
            {selectedMonth === 'YTD' ? 'All Months Detail' : `${selectedMonth} Detail`} — by Property
          </div>
          {ENTITY_ORDER.filter(n => aggregates[n]).map(name => (
            <EntitySection key={name} name={name} agg={aggregates[name]} selectedMonth={selectedMonth} />
          ))}
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#111827', color: '#fff', padding: '12px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 1000 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
