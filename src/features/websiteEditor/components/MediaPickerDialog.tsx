import { useEffect, useState } from 'react'
import { Check, ImageOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { Dialog, DialogFooter, DialogHeader } from '../../../components/ui/Dialog'
import { Input } from '../../../components/ui/Input'
import { getMediaAssets, uploadMediaAsset } from '../../media/api'
import type { MediaAsset } from '../../media/types'
import { MediaUploadPanel } from '../../media/components/MediaUploadPanel'

type MediaPickerDialogProps = {
  open: boolean
  eventId: string
  selectedAssetId?: string
  onClose: () => void
  onSelect: (asset: MediaAsset) => void
  selectionMode?: 'single' | 'multiple'
  maxSelection?: number
  onSelectMultiple?: (assets: MediaAsset[]) => void
  onUploadComplete?: (assets: MediaAsset[]) => void
}

export function MediaPickerDialog({ open, eventId, selectedAssetId, onClose, onSelect, selectionMode = 'single', maxSelection = Number.POSITIVE_INFINITY, onSelectMultiple, onUploadComplete }: MediaPickerDialogProps) {
  const [search, setSearch] = useState('')
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [selected, setSelected] = useState<MediaAsset[]>([])
  const [capacityNotice, setCapacityNotice] = useState(false)
  const [uploadOverflow, setUploadOverflow] = useState(0)
  const multiple = selectionMode === 'multiple'

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      setLoading(true); setFailed(false)
      getMediaAssets(eventId, { search }, controller.signal).then(({ assets: result }) => setAssets(result)).catch((error) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setFailed(true)
      }).finally(() => setLoading(false))
    }, 300)
    return () => { window.clearTimeout(timeout); controller.abort() }
  }, [eventId, open, refresh, search])

  const toggle = (asset: MediaAsset) => {
    if (!multiple) {
      onSelect(asset)
      return
    }
    setSelected((current) => {
      const isSelected = current.some(({ id }) => id === asset.id)
      if (isSelected) {
        setCapacityNotice(false)
        return current.filter(({ id }) => id !== asset.id)
      }
      if (current.length >= maxSelection) {
        setCapacityNotice(true)
        return current
      }
      setCapacityNotice(false)
      return [...current, asset]
    })
  }

  const close = () => {
    setSelected([])
    setCapacityNotice(false)
    setUploadOverflow(0)
    onClose()
  }

  return <Dialog open={open} onClose={close} titleId="media-picker-title" size="xl" contained>
    <div className="flex max-h-[90dvh] min-h-0 flex-col">
      <DialogHeader className="shrink-0 border-b border-border p-4 sm:px-5" title="Choose from Media" titleId="media-picker-title" description={multiple ? 'Select images from this Event Media Library.' : 'Select an image from this Event Media Library.'} onClose={close} />
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        <Input value={search} aria-label="Search Media" placeholder="Search media..." onChange={(event) => setSearch(event.target.value)} />
        <div className="mt-3"><MediaUploadPanel compact onUpload={(file) => uploadMediaAsset(eventId, file)} onBatchComplete={({ fileCount, assets: uploaded }) => {
          if (uploaded.length > 0) setRefresh((value) => value + 1)
          if (multiple) {
            setUploadOverflow(Math.max(0, uploaded.length - maxSelection))
            if (uploaded.length > 0) onUploadComplete?.(uploaded)
          } else if (fileCount === 1 && uploaded.length === 1) onSelect(uploaded[0])
        }} /></div>
        {multiple && <p className={`mt-3 text-sm ${capacityNotice || uploadOverflow > 0 ? 'text-danger' : 'text-foreground-muted'}`} role="status">{uploadOverflow > 0 ? `Gallery reached its 24-image limit. ${uploadOverflow} ${uploadOverflow === 1 ? 'uploaded image remains' : 'uploaded images remain'} in Media.` : Number.isFinite(maxSelection) ? `Select up to ${maxSelection} ${maxSelection === 1 ? 'image' : 'images'}. Gallery can contain up to 24 images.` : 'Select one or more images.'}</p>}
        {loading ? <p className="py-10 text-center text-sm text-foreground-muted">Loading images…</p> : failed ? <p className="py-10 text-center text-sm text-danger">Unable to load Media.</p> : assets.length === 0 ? <div className="py-10 text-center"><ImageOff className="mx-auto text-foreground-muted" /><p className="mt-3 font-medium">No images yet</p><p className="mt-1 text-sm text-foreground-muted">Upload your first image here or open Media Library.</p><Link className="mt-4 inline-flex rounded-sm bg-accent px-3 py-2 text-sm font-medium text-accent-foreground" to={`/events/${eventId}/media`}>Open Media</Link></div> :
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{assets.map((asset) => {
            const isSelected = multiple ? selected.some(({ id }) => id === asset.id) : selectedAssetId === asset.id
            const selectionUnavailable = multiple && !isSelected && selected.length >= maxSelection
            return <button className={`relative overflow-hidden rounded-lg border text-left ${isSelected ? 'border-2 border-accent bg-surface-muted' : 'border-border'} ${selectionUnavailable ? 'opacity-60' : ''}`} type="button" key={asset.id} onClick={() => toggle(asset)} aria-pressed={isSelected} aria-disabled={selectionUnavailable || undefined}><img className="aspect-[4/3] w-full object-cover" src={asset.variants.thumbnail.url} alt="" />{multiple && isSelected && <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-accent text-accent-foreground shadow-sm" aria-hidden="true"><Check size={15} strokeWidth={3} /></span>}<span className="block truncate p-2 text-xs font-medium">{asset.originalFilename}</span></button>
          })}</div>}
      </div>
      {multiple && <DialogFooter className="shrink-0 border-t border-border bg-surface p-4 sm:px-5"><Button type="button" variant="secondary" onClick={close}>Cancel</Button><Button type="button" disabled={selected.length === 0 || selected.length > maxSelection} onClick={() => onSelectMultiple?.(selected)}>{selected.length === 1 ? 'Add 1 image' : `Add ${selected.length} images`}</Button></DialogFooter>}
    </div>
  </Dialog>
}
