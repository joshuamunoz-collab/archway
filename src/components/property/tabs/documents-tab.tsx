'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Upload, File, Download, Trash2, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/format'
import type { PropertyDetailData, DocumentData } from '@/types/property'
import { cn } from '@/lib/utils'

const DOC_TYPES = [
  { value: 'lease',         label: 'Lease' },
  { value: 'inspection',    label: 'Inspection Report' },
  { value: 'insurance',     label: 'Insurance Doc' },
  { value: 'tax',           label: 'Tax Bill' },
  { value: 'city_notice',   label: 'City Notice' },
  { value: 'receipt',       label: 'Receipt' },
  { value: 'other',         label: 'Other' },
]

export function DocumentsTab({ data }: { data: PropertyDetailData }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState('')
  const [notes, setNotes] = useState('')
  const [filter, setFilter] = useState('')

  function formatFileSize(bytes: number | null): string {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setOpen(true)
    }
  }

  async function upload() {
    if (!file) return
    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `${data.id}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('property-documents')
        .upload(path, file, { upsert: false })
      if (uploadError) throw new Error(uploadError.message)

      const { data: urlData } = supabase.storage.from('property-documents').getPublicUrl(path)

      const res = await fetch(`/api/properties/${data.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          fileUrl: urlData.publicUrl,
          fileSize: file.size,
          docType: docType || null,
          notes: notes || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)

      toast.success('Document uploaded')
      setOpen(false)
      setFile(null)
      setDocType('')
      setNotes('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function deleteDoc(docId: string) {
    if (!confirm('Delete this document?')) return
    const res = await fetch(`/api/properties/${data.id}/documents/${docId}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Failed to delete'); return }
    toast.success('Document deleted')
    router.refresh()
  }

  const filtered = filter
    ? data.documents.filter(d => d.docType === filter)
    : data.documents

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-semibold">Documents</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-7 text-xs w-36">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All types</SelectItem>
                {DOC_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" /> Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-secondary/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {data.documents.length === 0 ? 'No documents yet. Click to upload.' : 'No documents match the filter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 rounded-md border p-3">
                  <File className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.docType && <span>{DOC_TYPES.find(t => t.value === doc.docType)?.label ?? doc.docType} · </span>}
                      {formatDate(doc.uploadedAt)}
                      {doc.fileSize && ` · ${formatFileSize(doc.fileSize)}`}
                    </p>
                    {doc.notes && <p className="text-xs text-muted-foreground mt-0.5">{doc.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" download={doc.filename}>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteDoc(doc.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload details sheet */}
      <Sheet open={open} onOpenChange={v => { if (!v) { setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' } setOpen(v) }}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Upload Document</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            {file && (
              <div className="rounded-md border p-3 bg-secondary/30">
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
            )}
            <div>
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select type…" /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Optional notes"
                className="mt-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Requires <code>property-documents</code> bucket in Supabase Storage.
            </p>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setFile(null) }}>Cancel</Button>
            <Button onClick={upload} disabled={uploading || !file}>
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
