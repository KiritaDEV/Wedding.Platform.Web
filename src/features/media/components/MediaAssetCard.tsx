import { useState } from 'react'
import { ImageOff, Trash2 } from 'lucide-react'
import { IconButton } from '../../../components/ui/IconButton'
import type { MediaAsset } from '../types'
import { formatFileSize } from '../../../lib/formatFileSize'
import { MediaUsageIndicator } from './MediaUsageIndicator'

export function MediaAssetCard({ asset, onDelete, onView }: { asset: MediaAsset; onDelete: () => void; onView: () => void }) {
  const [failed, setFailed] = useState(false)
  return (
    <article className="overflow-hidden rounded-xl border border-border bg-surface">
      <button className="grid w-full cursor-zoom-in place-items-center bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent" style={{ aspectRatio: `${asset.variants.thumbnail.width} / ${asset.variants.thumbnail.height}` }} type="button" onClick={onView} aria-label={`View ${asset.originalFilename}`}>
        {failed || !asset.variants.thumbnail ? <ImageOff className="text-foreground-muted" aria-label="Thumbnail unavailable" /> : (
          <img className="h-full w-full object-cover" src={asset.variants.thumbnail.url} alt="" onError={() => setFailed(true)} />
        )}
      </button>
      <div className="flex items-start gap-2 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={asset.originalFilename}>{asset.originalFilename}</p>
          <p className="mt-0.5 text-xs text-foreground-muted">{asset.width} × {asset.height} · {formatFileSize(asset.sizeBytes)}</p>
          <MediaUsageIndicator usage={asset.usage} />
        </div>
        <IconButton variant="danger" size="sm" aria-label={`Delete ${asset.originalFilename}`} onClick={onDelete}>
          <Trash2 aria-hidden="true" size={15} />
        </IconButton>
      </div>
    </article>
  )
}
