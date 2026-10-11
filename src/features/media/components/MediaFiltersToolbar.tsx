import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Button } from '../../../components/ui/Button'

export function MediaFiltersToolbar({ initialSearch, type, orientation, uploaded, loading, onSearchCommit, onFilterChange, onClear }: {
  initialSearch: string
  type: string
  orientation: string
  uploaded: string
  loading: boolean
  onSearchCommit: (value: string) => void
  onFilterChange: (key: 'type' | 'orientation' | 'uploaded', value: string) => void
  onClear: () => void
}) {
  const [search, setSearch] = useState(initialSearch)
  useEffect(() => {
    const timeout = window.setTimeout(() => onSearchCommit(search), 300)
    return () => window.clearTimeout(timeout)
  }, [search, onSearchCommit])
  const active = search.trim() !== '' || type !== '' || orientation !== '' || uploaded !== ''
  return <section className="mt-5 rounded-xl border border-border bg-surface p-3" aria-label="Media filters">
    <div className="grid gap-2 md:grid-cols-[minmax(14rem,1fr)_10rem_11rem_10rem_auto]">
      <Input value={search} placeholder="Search media..." aria-label="Search media" onChange={(event) => setSearch(event.target.value)} />
      <Select value={type} aria-label="File type" options={[{ value: '', label: 'All types' }, { value: 'jpeg', label: 'JPEG' }, { value: 'png', label: 'PNG' }, { value: 'webp', label: 'WebP' }]} onChange={(value) => onFilterChange('type', value)} />
      <Select value={orientation} aria-label="Orientation" options={[{ value: '', label: 'All orientations' }, { value: 'landscape', label: 'Landscape' }, { value: 'portrait', label: 'Portrait' }, { value: 'square', label: 'Square' }]} onChange={(value) => onFilterChange('orientation', value)} />
      <Select value={uploaded} aria-label="Uploaded date" options={[{ value: '', label: 'All dates' }, { value: 'today', label: 'Today' }, { value: '7d', label: 'Last 7 days' }, { value: '30d', label: 'Last 30 days' }]} onChange={(value) => onFilterChange('uploaded', value)} />
      {active && <Button variant="ghost" onClick={() => { setSearch(''); onClear() }}>Clear filters</Button>}
    </div>
    {loading && <p className="mt-2 text-xs text-foreground-muted">Updating results…</p>}
  </section>
}
import { useEffect, useState } from 'react'
