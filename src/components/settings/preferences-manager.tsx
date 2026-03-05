'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Upload, X, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Preferences {
  defaultPmFeePct: number
  vacancyWarningDays: number
  vacancyUrgentDays: number
  vacancyCriticalDays: number
  taskEscalationHours: number
  leaseExpiryWarningDays: number
  companyName: string
  companyPhone: string
  companyEmail: string
  companyLogoUrl: string
}

export function PreferencesManager({ initial }: { initial: Preferences }) {
  const [prefs, setPrefs] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [refreshingEstimates, setRefreshingEstimates] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function update<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPrefs(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  async function handleSave() {
    // Validate thresholds are positive and in correct order
    if (prefs.defaultPmFeePct < 0 || prefs.defaultPmFeePct > 100) {
      toast.error('PM fee must be between 0 and 100'); return
    }
    if (prefs.vacancyWarningDays < 1 || prefs.vacancyUrgentDays < 1 || prefs.vacancyCriticalDays < 1) {
      toast.error('Vacancy thresholds must be at least 1 day'); return
    }
    if (prefs.vacancyWarningDays >= prefs.vacancyUrgentDays || prefs.vacancyUrgentDays >= prefs.vacancyCriticalDays) {
      toast.error('Vacancy thresholds must be in ascending order (warning < urgent < critical)'); return
    }
    if (prefs.taskEscalationHours < 1) {
      toast.error('Escalation threshold must be at least 1 hour'); return
    }
    if (prefs.leaseExpiryWarningDays < 1) {
      toast.error('Lease expiry warning must be at least 1 day'); return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/settings/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      if (!res.ok) {
        let message = 'Failed to save preferences'
        try {
          const e = await res.json()
          message = e.error || message
        } catch {
          // Response body wasn't valid JSON
        }
        throw new Error(message)
      }
      const saved = await res.json()
      setPrefs(saved)
      setHasChanges(false)
      toast.success('Preferences saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setPrefs(initial)
    setHasChanges(false)
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2 MB')
      return
    }

    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'png'
      const path = `logo-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(path, file, { upsert: true })
      if (uploadError) throw new Error(uploadError.message)

      const { data: urlData } = supabase.storage
        .from('branding')
        .getPublicUrl(path)

      update('companyLogoUrl', urlData.publicUrl)
      toast.success('Logo uploaded — click "Save Changes" to apply')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleLogoRemove() {
    update('companyLogoUrl', '')
  }

  async function handleRefreshEstimates() {
    setRefreshingEstimates(true)
    try {
      const res = await fetch('/api/properties/estimates', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to refresh estimates')
      }
      const result = await res.json()
      if (result.failed > 0) {
        toast.warning(`Updated ${result.updated} of ${result.total} properties. ${result.failed} failed.`)
      } else {
        toast.success(`Updated estimates for ${result.updated} properties`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to refresh estimates')
    } finally {
      setRefreshingEstimates(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Preferences</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            System-wide settings and thresholds
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              Discard
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Company Info */}
      <Card className="p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Company Information</h2>

        {/* Logo upload */}
        <div className="space-y-2">
          <Label className="text-xs">Company Logo</Label>
          <div className="flex items-center gap-4">
            {prefs.companyLogoUrl ? (
              <div className="relative group">
                <img
                  src={prefs.companyLogoUrl}
                  alt="Company logo"
                  className="h-12 max-w-[200px] object-contain rounded border bg-white p-1"
                />
                <button
                  type="button"
                  onClick={handleLogoRemove}
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="h-12 w-36 border-2 border-dashed rounded flex items-center justify-center gap-1.5 text-muted-foreground text-xs cursor-pointer hover:bg-secondary/30 transition-colors disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" />
                {uploading ? 'Uploading...' : 'Upload logo'}
              </button>
            )}
            {prefs.companyLogoUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Change'}
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            PNG, JPEG, SVG, or WebP. Max 2 MB. Displayed in sidebar and login page.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Company Name</Label>
            <Input
              value={prefs.companyName}
              onChange={e => update('companyName', e.target.value)}
              placeholder="Your Company LLC"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Phone</Label>
            <Input
              value={prefs.companyPhone}
              onChange={e => update('companyPhone', e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input
              type="email"
              value={prefs.companyEmail}
              onChange={e => update('companyEmail', e.target.value)}
              placeholder="info@company.com"
            />
          </div>
        </div>
      </Card>

      {/* PM Fee */}
      <Card className="p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Property Management</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Default fee percentage applied when creating new entities
          </p>
        </div>
        <div className="max-w-xs space-y-1.5">
          <Label className="text-xs">Default PM Fee (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={prefs.defaultPmFeePct}
            onChange={e => update('defaultPmFeePct', parseFloat(e.target.value) || 0)}
          />
        </div>
      </Card>

      {/* Vacancy Thresholds */}
      <Card className="p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Vacancy Insurance Thresholds</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Days vacant before each risk level triggers on dashboard alerts
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5" />
              Warning (days)
            </Label>
            <Input
              type="number"
              min={1}
              value={prefs.vacancyWarningDays}
              onChange={e => update('vacancyWarningDays', parseInt(e.target.value) || 30)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-orange-500 mr-1.5" />
              Urgent (days)
            </Label>
            <Input
              type="number"
              min={1}
              value={prefs.vacancyUrgentDays}
              onChange={e => update('vacancyUrgentDays', parseInt(e.target.value) || 45)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5" />
              Critical (days)
            </Label>
            <Input
              type="number"
              min={1}
              value={prefs.vacancyCriticalDays}
              onChange={e => update('vacancyCriticalDays', parseInt(e.target.value) || 60)}
            />
          </div>
        </div>
      </Card>

      <Separator />

      {/* Task Escalation */}
      <Card className="p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Task Escalation</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Hours before an unacknowledged PM task auto-escalates on the dashboard
          </p>
        </div>
        <div className="max-w-xs space-y-1.5">
          <Label className="text-xs">Escalation Threshold (hours)</Label>
          <Input
            type="number"
            min={1}
            value={prefs.taskEscalationHours}
            onChange={e => update('taskEscalationHours', parseInt(e.target.value) || 48)}
          />
        </div>
      </Card>

      {/* Lease Expiry Warning */}
      <Card className="p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Lease Alerts</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Days before a lease expires to show it in dashboard alerts
          </p>
        </div>
        <div className="max-w-xs space-y-1.5">
          <Label className="text-xs">Expiry Warning (days)</Label>
          <Input
            type="number"
            min={1}
            value={prefs.leaseExpiryWarningDays}
            onChange={e => update('leaseExpiryWarningDays', parseInt(e.target.value) || 60)}
          />
        </div>
      </Card>

      <Separator />

      {/* Property Valuations */}
      <Card className="p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Property Valuations</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fetch home value estimates from RentCast for all properties
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshEstimates}
            disabled={refreshingEstimates}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshingEstimates ? 'animate-spin' : ''}`} />
            {refreshingEstimates ? 'Refreshing...' : 'Refresh Estimates'}
          </Button>
          <span className="text-xs text-muted-foreground">
            Uses RentCast API — may take a few seconds for all properties
          </span>
        </div>
      </Card>
    </div>
  )
}
