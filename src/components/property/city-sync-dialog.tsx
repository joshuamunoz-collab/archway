'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface CityData {
  ward: string | null
  neighborhood: string | null
  ownerName: string | null
  landArea: string | null
  zoning: string | null
  asrUse: string | null
}

interface PreviewData {
  current: { ward: string | null; neighborhood: string | null }
  cityRecord: CityData
  parcelNumber: string
}

interface Props {
  propertyId: string
  parcelNumber: string | null
}

export function CitySyncButton({ propertyId, parcelNumber }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleOpen() {
    if (!parcelNumber) {
      toast.error('No parcel number set for this property')
      return
    }
    setOpen(true)
    setLoading(true)
    setError(null)
    setPreview(null)

    try {
      const res = await fetch(`/api/properties/${propertyId}/sync-city`)
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to fetch city record')
        return
      }
      setPreview(await res.json())
    } catch {
      setError('Failed to connect to city records')
    } finally {
      setLoading(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch(`/api/properties/${propertyId}/sync-city`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Sync failed')
      }
      toast.success('City record data synced successfully')
      setOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs h-7"
        onClick={handleOpen}
        disabled={!parcelNumber}
      >
        <RefreshCw className="h-3.5 w-3.5" /> Sync City Records
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Sync from City Records</DialogTitle>
          </DialogHeader>

          {loading && (
            <div className="py-8 text-center">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Fetching city record...</p>
            </div>
          )}

          {error && (
            <div className="py-6 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {preview && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Parcel: <span className="font-mono">{preview.parcelNumber}</span>
              </p>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-xs font-medium text-muted-foreground">Field</th>
                    <th className="text-left py-2 text-xs font-medium text-muted-foreground">Current</th>
                    <th className="text-left py-2 text-xs font-medium text-muted-foreground">City Record</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <CompareRow label="Ward" current={preview.current.ward} incoming={preview.cityRecord.ward} />
                  <CompareRow label="Neighborhood" current={preview.current.neighborhood} incoming={preview.cityRecord.neighborhood} />
                  <CompareRow label="Owner" current={null} incoming={preview.cityRecord.ownerName} infoOnly />
                  <CompareRow label="Land Area" current={null} incoming={preview.cityRecord.landArea ? `${Number(preview.cityRecord.landArea).toLocaleString()} sq ft` : null} infoOnly />
                  <CompareRow label="Zoning" current={null} incoming={preview.cityRecord.zoning} infoOnly />
                  <CompareRow label="Use Code" current={null} incoming={preview.cityRecord.asrUse} infoOnly />
                </tbody>
              </table>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            {preview && (
              <Button onClick={handleSync} disabled={syncing}>
                {syncing ? 'Syncing...' : 'Apply Changes'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function CompareRow({
  label,
  current,
  incoming,
  infoOnly,
}: {
  label: string
  current: string | null
  incoming: string | null
  infoOnly?: boolean
}) {
  const changed = !infoOnly && incoming && current !== incoming
  return (
    <tr>
      <td className="py-2 text-xs font-medium text-muted-foreground">{label}</td>
      <td className="py-2 text-sm">{infoOnly ? '—' : (current ?? '—')}</td>
      <td className={`py-2 text-sm ${changed ? 'text-emerald-600 font-medium' : ''}`}>
        {incoming ?? '—'}
        {changed && <span className="text-xs ml-1">(new)</span>}
      </td>
    </tr>
  )
}
