import { SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { Select } from '../../../components/ui/Select'
import type { GuestRelationship, GuestRsvpStatus, GuestSide, InvitationLifecycle, InvitationListMeta, InvitationListQuery, InvitationSort, WeddingRole } from '../types'

const relationships = [{ value: '', label: 'All relationships' }, { value: 'guest_other', label: 'Guest / Other' }, { value: 'parent', label: 'Parent' }, { value: 'family_member', label: 'Family member' }, { value: 'friend', label: 'Friend' }, { value: 'colleague', label: 'Colleague' }]
const sides = [{ value: '', label: 'All sides' }, { value: 'unspecified', label: 'Unspecified' }, { value: 'bride', label: 'Bride' }, { value: 'groom', label: 'Groom' }, { value: 'both', label: 'Both' }]
const rsvps = [{ value: '', label: 'All RSVP states' }, { value: 'pending', label: 'Pending' }, { value: 'attending', label: 'Attending' }, { value: 'declined', label: 'Declined' }]
const sorts = [{ value: 'recently_added', label: 'Recently added' }, { value: 'invitation_asc', label: 'Invitation A–Z' }, { value: 'invitation_desc', label: 'Invitation Z–A' }, { value: 'last_response_desc', label: 'Last response newest' }, { value: 'last_response_asc', label: 'Last response oldest' }]

export function InvitationsToolbar({ query, counts, roles, loading, onChange }: { query: InvitationListQuery; counts: InvitationListMeta['lifecycleCounts']; roles: WeddingRole[]; loading: boolean; onChange: (patch: Partial<InvitationListQuery>) => void }) {
  const [search, setSearch] = useState(query.q)
  const [filtersOpen, setFiltersOpen] = useState(false)
  useEffect(() => { queueMicrotask(() => setSearch(query.q)) }, [query.q])
  useEffect(() => { const timeout = window.setTimeout(() => { if (search !== query.q) onChange({ q: search, page: 1 }) }, 275); return () => window.clearTimeout(timeout) }, [onChange, query.q, search])
  const filters = [query.relationship, query.side, query.weddingRoleId, query.rsvp].filter(Boolean).length
  const chips = [
    query.relationship && { key: 'relationship', label: relationships.find((item) => item.value === query.relationship)?.label ?? query.relationship },
    query.side && { key: 'side', label: sides.find((item) => item.value === query.side)?.label ?? query.side },
    query.weddingRoleId && { key: 'weddingRoleId', label: roles.find((role) => role.id === query.weddingRoleId)?.name ?? 'Wedding role' },
    query.rsvp && { key: 'rsvp', label: rsvps.find((item) => item.value === query.rsvp)?.label ?? query.rsvp },
  ].filter(Boolean) as Array<{ key: 'relationship' | 'side' | 'weddingRoleId' | 'rsvp'; label: string }>
  return <>
    <div className="relative"><label className="sr-only" htmlFor="invitation-search">Search invitations</label><Input id="invitation-search" className="min-h-12 bg-surface pl-4 text-base! shadow-sm" value={search} placeholder="Search invitations, guests, or wedding roles…" onChange={(event) => setSearch(event.target.value)} />{loading && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-foreground-muted">Updating…</span>}</div>
    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"><SegmentedControl value={query.lifecycle} label="Invitation lifecycle" options={(['all', 'active', 'inactive'] as InvitationLifecycle[]).map((value) => ({ value, label: `${value[0].toUpperCase() + value.slice(1)} ${counts[value]}` }))} onChange={(lifecycle) => onChange({ lifecycle, page: 1 })} />
      <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => setFiltersOpen((value) => !value)} aria-expanded={filtersOpen}><SlidersHorizontal size={16} aria-hidden="true" />Filters{filters ? ` (${filters})` : ''}</Button><Select className="min-w-52 flex-1 sm:flex-none" value={query.sort} aria-label="Sort invitations" options={sorts} onChange={(sort) => onChange({ sort: sort as InvitationSort, page: 1 })} /></div></div>
    {filtersOpen && <section className="mt-3 grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Invitation filters"><Select value={query.relationship} aria-label="Relationship filter" options={relationships} onChange={(relationship) => onChange({ relationship: relationship as GuestRelationship | '', page: 1 })} /><Select value={query.side} aria-label="Side filter" options={sides} onChange={(side) => onChange({ side: side as GuestSide | '', page: 1 })} /><Select value={query.weddingRoleId} aria-label="Wedding Role filter" options={[{ value: '', label: 'All Wedding Roles' }, ...roles.map((role) => ({ value: role.id, label: `${role.name}${role.isBuiltin ? '' : ' · Custom'}` }))]} onChange={(weddingRoleId) => onChange({ weddingRoleId, page: 1 })} /><Select value={query.rsvp} aria-label="RSVP filter" options={rsvps} onChange={(rsvp) => onChange({ rsvp: rsvp as GuestRsvpStatus | '', page: 1 })} /></section>}
    {chips.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Active filters">{chips.map((chip) => <button type="button" key={chip.key} className="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface-muted px-3 text-xs" aria-label={`Remove ${chip.label} filter`} onClick={() => onChange({ [chip.key]: '', page: 1 })}>{chip.label}<X size={13} aria-hidden="true" /></button>)}{chips.length > 1 && <Button type="button" size="sm" variant="ghost" onClick={() => onChange({ relationship: '', side: '', weddingRoleId: '', rsvp: '', page: 1 })}>Clear all</Button>}</div>}
  </>
}
