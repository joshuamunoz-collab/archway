'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, MapPin, Building2, DollarSign, ChevronDown } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/shared/status-badge'
import { OverviewTab } from './tabs/overview-tab'
import { Section8Tab } from './tabs/section8-tab'
import { FinancialsTab } from './tabs/financials-tab'
import { InsuranceTab } from './tabs/insurance-tab'
import { TaxesTab } from './tabs/taxes-tab'
import { CityTab } from './tabs/city-tab'
import { DocumentsTab } from './tabs/documents-tab'
import { PhotosTab } from './tabs/photos-tab'
import { ActivityTab } from './tabs/activity-tab'
import type { PropertyDetailData } from '@/types/property'
import { cn } from '@/lib/utils'

const STATUSES = [
  { value: 'occupied',           label: 'Occupied' },
  { value: 'vacant',             label: 'Vacant' },
  { value: 'rehab',              label: 'In Rehab' },
  { value: 'pending_inspection', label: 'Pending Inspection' },
  { value: 'pending_packet',     label: 'Pending Packet' },
]

const TABS = [
  { value: 'overview',    label: 'Overview' },
  { value: 'section8',   label: 'Section 8' },
  { value: 'financials', label: 'Financials' },
  { value: 'insurance',  label: 'Insurance' },
  { value: 'taxes',      label: 'Taxes' },
  { value: 'compliance', label: 'City/Compliance' },
  { value: 'documents',  label: 'Documents' },
  { value: 'photos',     label: 'Photos' },
  { value: 'activity',   label: 'Activity' },
]

export function PropertyDetail({ data }: { data: PropertyDetailData }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get('tab') ?? 'overview'
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [changingStatus, setChangingStatus] = useState(false)

  const fullAddress = [data.addressLine1, data.addressLine2].filter(Boolean).join(', ')
  const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(`${fullAddress}, ${data.city}, ${data.state} ${data.zip}`)}`

  function handleTabChange(tab: string) {
    setActiveTab(tab)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tab)
    router.replace(url.pathname + url.search, { scroll: false })
  }

  async function handleStatusChange(newStatus: string) {
    if (newStatus === data.status) return
    setChangingStatus(true)
    try {
      const res = await fetch(`/api/properties/${data.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(`Status changed to ${newStatus.replace('_', ' ')}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setChangingStatus(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-border sticky top-0 z-10">
        <div className="px-6 py-4">
          {/* Back nav */}
          <Link href="/properties" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
            <ArrowLeft className="h-3.5 w-3.5" /> All Properties
          </Link>

          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold text-foreground">{data.addressLine1}</h1>
                {data.addressLine2 && (
                  <span className="text-muted-foreground text-sm">{data.addressLine2}</span>
                )}
                <StatusBadge status={data.status} />
                {data.isSection8 && (
                  <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-medium text-blue-700">
                    Section 8
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {data.entity.name} · {data.city}, {data.state} {data.zip}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7">
                  <MapPin className="h-3.5 w-3.5" /> Google Maps
                </Button>
              </a>
              <a href="https://www.stlouis-mo.gov/data/address-search/index.cfm" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7">
                  <Building2 className="h-3.5 w-3.5" /> Property Lookup
                </Button>
              </a>
              {data.parcelNumber && (
                <a href="https://property.stlouis-mo.gov/" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7">
                    <DollarSign className="h-3.5 w-3.5" /> Tax Lookup
                  </Button>
                </a>
              )}

              {/* Status changer */}
              <Select
                value={data.status}
                onValueChange={handleStatusChange}
                disabled={changingStatus}
              >
                <SelectTrigger className="h-7 text-xs w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6">
          <div className="flex gap-0 overflow-x-auto no-scrollbar">
            {TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  activeTab === tab.value
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="p-6 lg:p-8">
        {activeTab === 'overview'    && <OverviewTab data={data} />}
        {activeTab === 'section8'   && <Section8Tab data={data} />}
        {activeTab === 'financials' && <FinancialsTab data={data} />}
        {activeTab === 'insurance'  && <InsuranceTab data={data} />}
        {activeTab === 'taxes'      && <TaxesTab data={data} />}
        {activeTab === 'compliance' && <CityTab data={data} />}
        {activeTab === 'documents'  && <DocumentsTab data={data} />}
        {activeTab === 'photos'     && <PhotosTab data={data} />}
        {activeTab === 'activity'   && <ActivityTab data={data} />}
      </div>
    </div>
  )
}
