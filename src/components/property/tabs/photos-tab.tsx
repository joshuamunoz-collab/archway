'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Upload, Trash2, ImageIcon } from 'lucide-react'
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
import type { PropertyDetailData, PhotoData } from '@/types/property'

const PHOTO_CATEGORIES = [
  { value: 'exterior',      label: 'Exterior' },
  { value: 'interior',      label: 'Interior' },
  { value: 'damage',        label: 'Damage' },
  { value: 'rehab_before',  label: 'Rehab — Before' },
  { value: 'rehab_during',  label: 'Rehab — During' },
  { value: 'rehab_after',   label: 'Rehab — After' },
  { value: 'insurance',     label: 'Insurance' },
]

export function PhotosTab({ data }: { data: PropertyDetailData }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [category, setCategory] = useState('')
  const [caption, setCaption] = useState('')
  const [takenAt, setTakenAt] = useState('')
  const [activeCategory, setActiveCategory] = useState('')
  const [lightbox, setLightbox] = useState<PhotoData | null>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length > 0) {
      setFiles(selected)
      setOpen(true)
    }
  }

  async function upload() {
    if (files.length === 0) return
    setUploading(true)
    const supabase = createClient()
    let successCount = 0

    for (const file of files) {
      try {
        const path = `${data.id}/${Date.now()}-${file.name}`
        const { error: uploadError } = await supabase.storage
          .from('property-photos')
          .upload(path, file, { upsert: false })
        if (uploadError) throw new Error(uploadError.message)

        const { data: urlData } = supabase.storage.from('property-photos').getPublicUrl(path)

        const res = await fetch(`/api/properties/${data.id}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileUrl: urlData.publicUrl,
            category: category || null,
            caption: caption || null,
            takenAt: takenAt || null,
          }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        successCount++
      } catch (err) {
        toast.error(`Failed: ${file.name}`)
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} photo${successCount > 1 ? 's' : ''} uploaded`)
      router.refresh()
    }
    setOpen(false)
    setFiles([])
    setCategory('')
    setCaption('')
    setTakenAt('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    setUploading(false)
  }

  async function deletePhoto(photoId: string) {
    if (!confirm('Delete this photo?')) return
    const res = await fetch(`/api/properties/${data.id}/photos/${photoId}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Failed to delete'); return }
    toast.success('Photo deleted')
    router.refresh()
  }

  const filtered = activeCategory
    ? data.photos.filter(p => p.category === activeCategory)
    : data.photos

  const categories = PHOTO_CATEGORIES.filter(c =>
    data.photos.some(p => p.category === c.value)
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-semibold">Photos</CardTitle>
          <div className="flex items-center gap-2">
            {categories.length > 0 && (
              <Select value={activeCategory} onValueChange={setActiveCategory}>
                <SelectTrigger className="h-7 text-xs w-36">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
              accept="image/*"
              multiple
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
              <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {data.photos.length === 0 ? 'No photos yet. Click to upload.' : 'No photos in this category.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map(photo => (
                <div key={photo.id} className="group relative rounded-lg overflow-hidden border aspect-square bg-secondary">
                  <img
                    src={photo.fileUrl}
                    alt={photo.caption ?? 'Property photo'}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setLightbox(photo)}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                    <div className="w-full p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                      <div className="flex items-center justify-between">
                        {photo.caption && (
                          <p className="text-white text-xs truncate">{photo.caption}</p>
                        )}
                        <button
                          className="ml-auto p-1 text-white hover:text-red-300 transition-colors"
                          onClick={e => { e.stopPropagation(); deletePhoto(photo.id) }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {photo.category && (
                        <p className="text-white/70 text-xs">
                          {PHOTO_CATEGORIES.find(c => c.value === photo.category)?.label ?? photo.category}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Sheet */}
      <Sheet open={open} onOpenChange={v => { if (!v) { setFiles([]); if (fileInputRef.current) fileInputRef.current.value = '' } setOpen(v) }}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Upload {files.length > 1 ? `${files.length} Photos` : 'Photo'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select category…" /></SelectTrigger>
                <SelectContent>
                  {PHOTO_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {files.length === 1 && (
              <div>
                <Label>Caption</Label>
                <Input
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder="Optional caption"
                  className="mt-1"
                />
              </div>
            )}
            <div>
              <Label>Date Taken</Label>
              <Input
                type="date"
                value={takenAt}
                onChange={e => setTakenAt(e.target.value)}
                className="mt-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Requires <code>property-photos</code> bucket in Supabase Storage.
            </p>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setFiles([]) }}>Cancel</Button>
            <Button onClick={upload} disabled={uploading}>
              {uploading ? 'Uploading…' : `Upload ${files.length > 1 ? `${files.length} photos` : 'Photo'}`}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox.fileUrl}
            alt={lightbox.caption ?? ''}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white text-2xl font-bold"
            onClick={() => setLightbox(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
