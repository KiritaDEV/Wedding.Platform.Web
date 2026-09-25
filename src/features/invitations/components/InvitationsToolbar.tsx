import { RefreshCw, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { Select } from '../../../components/ui/Select'
import { invitationRsvpStatusOptions } from '../rsvpStatusOptions'
import type { InvitationLifecycle, InvitationListMeta, InvitationListQuery, InvitationSort, WeddingRole } from '../types'
import { FilterMultiSelect } from './FilterMultiSelect'

const relationships = [{ value: 'guest_other', label: 'Guest / Other' }, { value: 'parent', label: 'Parent' }, { value: 'family_member', label: 'Family member' }, { value: 'friend', label: 'Friend' }, { value: 'colleague', label: 'Colleague' }]
const sides = [{ value: 'unspecified', label: 'Unspecified' }, { value: 'bride', label: 'Bride' }, { value: 'groom', label: 'Groom' }, { value: 'both', label: 'Both' }]
const guestResponses = [{ value: 'pending', label: 'Pending' }, { value: 'attending', label: 'Attending' }, { value: 'declined', label: 'Declined' }]
const sorts = [{ value: 'recently_added', label: 'Recently added' }, { value: 'invitation_asc', label: 'Invitation A–Z' }, { value: 'invitation_desc', label: 'Invitation Z–A' }, { value: 'last_response_desc', label: 'Last response newest' }, { value: 'last_response_asc', label: 'Last response oldest' }]

export function InvitationsToolbar({ query, counts, roles, loading, onChange, onRefresh }: { query: InvitationListQuery; counts: InvitationListMeta['lifecycleCounts']; roles: WeddingRole[]; loading: boolean; onChange: (patch: Partial<InvitationListQuery>) => void; onRefresh: () => void }) {
  const [search, setSearch] = useState(query.q)
  const [filtersOpen, setFiltersOpen] = useState(false)
  useEffect(() => { queueMicrotask(() => setSearch(query.q)) }, [query.q])
  useEffect(() => { const timeout = window.setTimeout(() => { if (search !== query.q) onChange({ q: search, page: 1 }) }, 275); return () => window.clearTimeout(timeout) }, [onChange, query.q, search])
  const filters = [query.relationships, query.sides, query.roleIds, query.rsvpStatuses, query.guestResponses].filter((values) => values.length > 0).length
  const chips = [
    query.relationships.length > 0 && { key: 'relationships', label: `Relationships · ${query.relationships.length}` },
    query.sides.length > 0 && { key: 'sides', label: `Sides · ${query.sides.length}` },
    query.roleIds.length > 0 && { key: 'roleIds', label: `Wedding Roles · ${query.roleIds.length}` },
    query.rsvpStatuses.length > 0 && { key: 'rsvpStatuses', label: `RSVP Statuses · ${query.rsvpStatuses.length}` },
    query.guestResponses.length > 0 && { key: 'guestResponses', label: `Guest Responses · ${query.guestResponses.length}` },
  ].filter(Boolean) as Array<{ key: 'relationships' | 'sides' | 'roleIds' | 'rsvpStatuses' | 'guestResponses'; label: string }>
  return <>
    <div className="relative"><label className="sr-only" htmlFor="invitation-search">Search invitations</label><Input id="invitation-search" className="min-h-12 bg-surface pl-4 text-base! shadow-sm" value={search} placeholder="Search invitations, guests, or wedding roles…" onChange={(event) => setSearch(event.target.value)} />{loading && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-foreground-muted">Updating…</span>}</div>
    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"><SegmentedControl value={query.lifecycle} label="Invitation lifecycle" options={(['all', 'active', 'inactive'] as InvitationLifecycle[]).map((value) => ({ value, label: `${value[0].toUpperCase() + value.slice(1)} ${counts[value]}` }))} onChange={(lifecycle) => onChange({ lifecycle, page: 1 })} />
      <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" className="size-10 p-0" disabled={loading} title="Refresh invitations" aria-label="Refresh invitations" onClick={onRefresh}><RefreshCw className={loading ? 'animate-spin' : ''} size={17} aria-hidden="true" /></Button><Button type="button" variant="secondary" className={`relative size-10 p-0 ${filters ? 'border-accent bg-accent/10 text-accent' : ''}`} title="Filters" aria-label={filters ? `Filters, ${filters} active` : 'Filters'} onClick={() => setFiltersOpen((value) => !value)} aria-expanded={filtersOpen}><SlidersHorizontal size={17} aria-hidden="true" />{filters > 0 && <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-accent text-[9px] text-accent-foreground" aria-hidden="true">{filters}</span>}</Button><Select className="min-w-52 flex-1 sm:flex-none" value={query.sort} aria-label="Sort invitations" options={sorts} onChange={(sort) => onChange({ sort: sort as InvitationSort, page: 1 })} /></div></div>
    {filtersOpen && <section className="mt-3 grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" aria-label="Invitation filters">
      <FilterMultiSelect allLabel="All relationships" groupLabel="Relationships" options={relationships} values={query.relationships} onChange={(relationships) => onChange({ relationships: relationships as InvitationListQuery['relationships'], page: 1 })} />
      <FilterMultiSelect allLabel="All sides" groupLabel="Sides" options={sides} values={query.sides} onChange={(sides) => onChange({ sides: sides as InvitationListQuery['sides'], page: 1 })} />
      <FilterMultiSelect allLabel="All wedding roles" groupLabel="Wedding Roles" options={roles.map((role) => ({ value: role.id, label: `${role.name}${role.isBuiltin ? '' : ' · Custom'}` }))} values={query.roleIds} onChange={(roleIds) => onChange({ roleIds, page: 1 })} />
      <FilterMultiSelect allLabel="All RSVP statuses" groupLabel="RSVP Statuses" options={invitationRsvpStatusOptions.filter((option) => option.value !== '')} values={query.rsvpStatuses} onChange={(rsvpStatuses) => onChange({ rsvpStatuses: rsvpStatuses as InvitationListQuery['rsvpStatuses'], page: 1 })} />
      <FilterMultiSelect allLabel="All guest responses" groupLabel="Guest Responses" options={guestResponses} values={query.guestResponses} onChange={(guestResponses) => onChange({ guestResponses: guestResponses as InvitationListQuery['guestResponses'], page: 1 })} />
    </section>}
    {chips.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Active filters">{chips.map((chip) => <button type="button" key={chip.key} className="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface-muted px-3 text-xs" aria-label={`Remove ${chip.label} filter`} onClick={() => onChange({ [chip.key]: [], page: 1 })}>{chip.label}<X size={13} aria-hidden="true" /></button>)}<Button type="button" size="sm" variant="ghost" onClick={() => onChange({ relationships: [], sides: [], roleIds: [], rsvpStatuses: [], guestResponses: [], page: 1 })}>Clear all</Button></div>}
  </>
}
