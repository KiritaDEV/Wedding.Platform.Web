import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { Dialog, DialogHeader } from '../../../components/ui/Dialog'
import type { MediaAsset } from '../types'
import { formatFileSize } from '../../../lib/formatFileSize'

export function MediaAssetViewer({ asset, onClose }: { asset: MediaAsset | null; onClose: () => void }) {
  const titleId = 'media-asset-viewer-title'

  return (
    <Dialog open={asset !== null} onClose={onClose} titleId={titleId} size="xl" className="overflow-hidden">
      {asset && <>
        <DialogHeader className="border-b border-border p-4 sm:px-5" title={asset.originalFilename} titleId={titleId} onClose={onClose} closeLabel="Close image viewer" />
        <PreviewImage key={asset.id} asset={asset} />
        <div className="flex flex-wrap gap-x-4 gap-y-1 p-4 text-sm text-foreground-muted sm:px-5">
          <span>{asset.width} × {asset.height}</span>
          <span>{formatFileSize(asset.sizeBytes)}</span>
          <span>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(asset.createdAt))}</span>
        </div>
      </>}
    </Dialog>
  )
}

function PreviewImage({ asset }: { asset: MediaAsset }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading')
  return <div className="relative grid min-h-56 place-items-center bg-black/90 sm:min-h-80">
    {status === 'loading' && <p className="absolute text-sm text-white/75">Loading preview…</p>}
    {status === 'failed' ? (
      <div className="grid place-items-center gap-2 p-8 text-center text-white/75"><ImageOff aria-hidden="true" /><p className="text-sm">Unable to load this Media preview.</p></div>
    ) : (
      <img className={`max-h-[78dvh] max-w-full object-contain ${status === 'loading' ? 'invisible' : ''}`} src={asset.variants.web.url} alt="" onLoad={() => setStatus('ready')} onError={() => setStatus('failed')} />
    )}
  </div>
}
