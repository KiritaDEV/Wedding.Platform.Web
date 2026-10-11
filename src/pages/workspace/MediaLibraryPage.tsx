import { useCallback, useEffect, useMemo, useState } from 'react'
import { Images } from 'lucide-react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { WorkspaceSection } from '../../features/events/workspace/WorkspaceSection'
import { deleteMediaAsset, getMediaAssets, uploadMediaAsset } from '../../features/media/api'
import { MediaAssetCard } from '../../features/media/components/MediaAssetCard'
import { MediaDeleteDialog } from '../../features/media/components/MediaDeleteDialog'
import { MediaAssetViewer } from '../../features/media/components/MediaAssetViewer'
import { MediaFiltersToolbar } from '../../features/media/components/MediaFiltersToolbar'
import { MediaUploadPanel } from '../../features/media/components/MediaUploadPanel'
import type { MediaAsset, MediaFilters, MediaPage } from '../../features/media/types'

const types = new Set(['jpeg', 'png', 'webp'])
const orientations = new Set(['landscape', 'portrait', 'square'])
const uploadedDates = new Set(['today', '7d', '30d'])

function message(error: unknown): string { return error instanceof Error ? error.message : 'Something went wrong.' }
function accepted(value: string | null, options: Set<string>): string { return value && options.has(value) ? value : '' }

export function MediaLibraryPage() {
  const { eventId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') ?? ''
  const type = accepted(searchParams.get('type'), types)
  const orientation = accepted(searchParams.get('orientation'), orientations)
  const uploaded = accepted(searchParams.get('uploaded'), uploadedDates)
  const requestedPage = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1)
  const filters: MediaFilters = useMemo(() => ({
    ...(search.trim() && { search }),
    ...(type && { type: type as MediaFilters['type'] }),
    ...(orientation && { orientation: orientation as MediaFilters['orientation'] }),
    ...(uploaded && { uploaded: uploaded as MediaFilters['uploaded'] }),
    page: requestedPage,
  }), [search, type, orientation, uploaded, requestedPage])
  const activeFilters = search.trim() !== '' || type !== '' || orientation !== '' || uploaded !== ''
  const [result, setResult] = useState<MediaPage>({ assets: [], currentPage: 1, lastPage: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null)
  const [viewing, setViewing] = useState<MediaAsset | null>(null)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getMediaAssets(eventId, filters, controller.signal).then((page) => { setResult(page); setError(null) }).catch((reason) => {
      if (!(reason instanceof DOMException && reason.name === 'AbortError')) setError(message(reason))
    }).finally(() => setLoading(false))
    return () => controller.abort()
  }, [eventId, filters, refresh])

  const updateQuery = useCallback((updates: Record<string, string>) => {
    setLoading(true)
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      Object.entries(updates).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key))
      next.delete('page')
      return next
    })
  }, [setSearchParams])

  const commitSearch = useCallback((value: string) => {
    if (value.trim() !== search.trim()) updateQuery({ q: value.trim() })
  }, [search, updateQuery])

  const clearFilters = () => { setLoading(true); setSearchParams({}) }
  const goToPage = (page: number) => {
    setLoading(true)
    setSearchParams((current) => { const next = new URLSearchParams(current); if (page > 1) next.set('page', String(page)); else next.delete('page'); return next })
  }

  return <WorkspaceSection eyebrow="Event workspace" title="Media Library" description="Upload and manage images for this Event. Your images can be reused across your Website.">
    <MediaUploadPanel onUpload={(file) => uploadMediaAsset(eventId, file)} onBatchComplete={({ assets }) => { if (assets.length > 0) { setLoading(true); setRefresh((value) => value + 1) } }} />
    <MediaFiltersToolbar key={search} initialSearch={search} type={type} orientation={orientation} uploaded={uploaded} loading={loading && result.assets.length > 0} onSearchCommit={commitSearch} onFilterChange={(key, value) => updateQuery({ [key]: value })} onClear={clearFilters} />
    {error && result.assets.length > 0 && <p className="mt-4 rounded-lg bg-danger-muted p-3 text-sm text-danger" role="alert">{error}</p>}

    {loading && result.assets.length === 0 ? <p className="mt-6 text-sm text-foreground-muted">Loading images…</p> : error && result.assets.length === 0 ? (
      <div className="mt-6"><p className="text-sm text-danger">Unable to load the Media Library.</p><Button className="mt-3" variant="secondary" onClick={() => { setLoading(true); setRefresh((value) => value + 1) }}>Try again</Button></div>
    ) : result.assets.length === 0 && activeFilters ? (
      <section className="mt-6 rounded-xl border border-dashed border-border py-12 text-center"><h2 className="font-semibold">No media found</h2><p className="mt-1 text-sm text-foreground-muted">Try changing your search or filters.</p><Button className="mt-4" variant="secondary" onClick={clearFilters}>Clear filters</Button></section>
    ) : result.assets.length === 0 ? (
      <section className="mt-6 rounded-xl border border-dashed border-border py-12 text-center"><Images className="mx-auto text-foreground-muted" aria-hidden="true" /><h2 className="mt-3 font-semibold">No images yet</h2><p className="mt-1 text-sm text-foreground-muted">Upload your first image to start building your Event Media Library.</p></section>
    ) : <>
      <div className="mt-6 columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">{result.assets.map((asset) => <div className="mb-4 break-inside-avoid" key={asset.id}><MediaAssetCard asset={asset} onView={() => setViewing(asset)} onDelete={() => setDeleteTarget(asset)} /></div>)}</div>
      {result.lastPage > 1 && <nav className="mt-6 flex items-center justify-center gap-3" aria-label="Media pages"><Button variant="secondary" disabled={result.currentPage <= 1 || loading} onClick={() => goToPage(result.currentPage - 1)}>Previous</Button><span className="text-sm text-foreground-muted">Page {result.currentPage} of {result.lastPage}</span><Button variant="secondary" disabled={result.currentPage >= result.lastPage || loading} onClick={() => goToPage(result.currentPage + 1)}>Next</Button></nav>}
    </>}
    <MediaAssetViewer asset={viewing} onClose={() => setViewing(null)} />
    <MediaDeleteDialog key={deleteTarget?.id ?? 'closed'} asset={deleteTarget} onClose={() => setDeleteTarget(null)} onDelete={async (asset) => {
      await deleteMediaAsset(eventId, asset.id)
      setDeleteTarget(null)
      setLoading(true)
      setRefresh((value) => value + 1)
    }} />
  </WorkspaceSection>
}
