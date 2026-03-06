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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseSheet(ws: XLSX.WorkSheet): ParsedSheet {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[][] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: null }).forEach((r: any[]) => {
    if (r.some((v: unknown) => v !== null)) rows.push(r)
  })

  let portfolio: string | null = null
  let month: string | null = null
  const properties: Record<string, { rent: number; pm_fee: number; tenants: Set<string>; payee: Set<string> }> = {}
  const maintenance: Record<string, MaintenanceItem[]> = {}
  let inDetails = false

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
    const mAddr = row[16] ? String(row[16]).trim() : null
    const mDate = row[18]
    const mDesc = row[19] ? String(row[19]) : ''
    const mAmt = typeof row[20] === 'number' ? row[20] : null
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

  for (const row of rows) {
    if (row[1] === 'Portfolio') { portfolio = row[2]; continue }
    if (row[1] === 'Month Billed:') { month = row[2]; continue }
    if (row[1] === 'Payment ID') { inDetails = true; continue }

    if (inDetails) {
      const pid = row[1]
      if (!pid) {
        gotoMaint(row)
      } else if (String(pid).endsWith('Total') || String(pid).startsWith('TOTAL')) {
        gotoMaint(row)
        continue
      } else {
        const addr = row[4] ? String(row[4]).trim() : null
        const tenant = row[6] ? String(row[6]) : ''
        const payee = row[5] ? String(row[5]) : ''
        const rent = typeof row[9] === 'number' ? row[9] : 0
        const pm = typeof row[10] === 'number' ? row[10] : 0
        if (addr && !addr.match(/^\d{4}-\d{2}$/) && addr !== 'None') {
          if (!properties[addr]) properties[addr] = { rent: 0, pm_fee: 0, tenants: new Set(), payee: new Set() }
          properties[addr].rent += rent
          properties[addr].pm_fee += pm
          if (tenant) properties[addr].tenants.add(tenant)
          if (payee) properties[addr].payee.add(payee)
        }
        gotoMaint(row)
      }
    } else {
      gotoMaint(row)
    }
  }

  const allAddrs = new Set([...Object.keys(properties), ...Object.keys(maintenance)])
  const props: PropertyData[] = []
  for (const addr of allAddrs) {
    const inf = properties[addr] || { rent: 0, pm_fee: 0, tenants: new Set<string>(), payee: new Set<string>() }
    const mItems = maintenance[addr] || []
    const mTotal = mItems.reduce((s, i) => s + i.amount, 0)
    props.push({
      address: addr,
      tenant: [...(inf.tenants || [])].join(', '),
      payee: [...(inf.payee || [])].join(', '),
      rent: Math.round(inf.rent * 100) / 100,
      pm_fee: Math.round(inf.pm_fee * 100) / 100,
      maintenance: Math.round(mTotal * 100) / 100,
      maintenance_items: mItems,
      net: Math.round((inf.rent - mTotal) * 100) / 100,
      noi: Math.round((inf.rent - mTotal - inf.pm_fee) * 100) / 100,
    })
  }
  return { portfolio, month, properties: props }
}

async function parseZip(file: File): Promise<Record<string, Record<string, PropertyData[]>>> {
  const zip = await JSZip.loadAsync(file)
  const results: Record<string, Record<string, PropertyData[]>> = {}
  const xlsxFiles = Object.values(zip.files).filter(f => f.name.endsWith('.xlsx') && !f.name.startsWith('__MACOSX'))
  for (const zf of xlsxFiles) {
    const buf = await zf.async('arraybuffer')
    const wb = XLSX.read(buf, { type: 'array', cellDates: true })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const parsed = parseSheet(ws)
    if (parsed.portfolio && parsed.month) {
      if (!results[parsed.portfolio]) results[parsed.portfolio] = {}
      results[parsed.portfolio][parsed.month] = parsed.properties
    }
  }
  return results
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
      const saved = localStorage.getItem('archway_financials')
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
      localStorage.setItem('archway_financials', JSON.stringify(portfolioData))
    } catch (e) {
      console.warn('Could not save to localStorage:', e)
    }
  }, [portfolioData])

  const handleFiles = useCallback(async (files: File[]) => {
    setLoading(true)
    setError(null)
    try {
      const monthsAdded: string[] = []
      for (const file of files) {
        const ext = file.name.split('.').pop()?.toLowerCase()
        let parsed: Record<string, Record<string, PropertyData[]>> = {}
        if (ext === 'zip') {
          parsed = await parseZip(file)
        } else if (ext === 'xlsx') {
          const buf = await file.arrayBuffer()
          const wb = XLSX.read(buf, { type: 'array', cellDates: true })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const r = parseSheet(ws)
          if (r.portfolio && r.month) parsed[r.portfolio] = { [r.month]: r.properties }
        }
        for (const [pName, months] of Object.entries(parsed)) {
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
      setToast(`Imported ${monthsAdded.join(', ')} successfully`)
      setTimeout(() => setToast(null), 3500)
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
              onClick={() => { if (window.confirm('Clear all imported data?')) { setPortfolioData({}); localStorage.removeItem('archway_financials'); setSelectedMonth('YTD') } }}
              style={{ display: 'flex', alignItems: 'center', gap: 7, border: '1px solid #fecaca', borderRadius: 7, padding: '7px 14px', background: '#fff', fontSize: 13, fontWeight: 500, color: '#ef4444', cursor: 'pointer' }}
            >
              Clear
            </button>
          )}
          <button onClick={() => fileRef.current?.click()} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 7, border: '1px solid #e5e7eb', borderRadius: 7, padding: '7px 14px', background: '#fff', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            {loading ? 'Importing\u2026' : 'Import'}
          </button>
          <input ref={fileRef} type="file" accept=".zip,.xlsx" style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.length) handleFiles(Array.from(e.target.files)); e.target.value = '' }} />
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
