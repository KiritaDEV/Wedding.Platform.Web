import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { InvitationsToolbar } from '../invitations/components/InvitationsToolbar'
import { FilterMultiSelect } from '../invitations/components/FilterMultiSelect'
import { invitationRsvpStatusOptions } from '../invitations/rsvpStatusOptions'
import type { InvitationListQuery } from '../invitations/types'
import { NotificationCenter } from './NotificationCenter'
import { discoveredNewNotification, NOTIFICATION_POLL_MS, summariesEqual } from './polling'
import { notificationContext, notificationLabels } from './presentation'
import type { UserNotification } from './types'

const base: UserNotification = { id: 'n1', type: 'guest_rsvp_received', event: { id: 'e1', name: 'Wedding' }, invitation: { id: 'i1', name: 'Bruce Banner' }, details: {}, occurredAt: '2026-09-24T10:00:00Z', readAt: null }
const query: InvitationListQuery = { q: '', lifecycle: 'all', relationships: [], sides: [], roleIds: [], rsvpStatuses: [], guestResponses: [], sort: 'recently_added', page: 1 }

describe('notification center contracts', () => {
  it('uses the exact catalog and safe presentation snapshots', () => {
    expect(notificationLabels).toEqual({ guest_rsvp_received: 'RSVP received', guest_rsvp_updated: 'RSVP updated', access_transfer_requested: 'Access requested' })
    expect(notificationContext(base)).toBe('Bruce Banner')
    expect(notificationContext({ ...base, type: 'access_transfer_requested', details: { browserFamily: 'Chrome', platform: 'Windows' } })).toBe('Chrome on Windows · Bruce Banner')
  })

  it('renders an accessible bell without a zero badge and uses the locked cadence', () => {
    const html = renderToStaticMarkup(<MemoryRouter><NotificationCenter /></MemoryRouter>)
    expect(html).toContain('aria-label="Notifications"')
    expect(html).not.toContain('99+')
    expect(NOTIFICATION_POLL_MS).toBe(30_000)
  })

  it('defines a modal mobile drawer while retaining the anchored desktop surface', () => {
    const source = readFileSync(new URL('./NotificationCenter.tsx', import.meta.url), 'utf8')
    expect(source).toContain("window.matchMedia('(max-width: 1023px)')")
    expect(source).toContain('dialog.showModal()')
    expect(source).toContain('w-[min(90vw,380px)]')
    expect(source).toContain('h-dvh')
    expect(source).toContain('document.body.style.overflow')
    expect(source).toContain('absolute right-0 top-11')
    expect(source).toContain('onCancel=')
  })

  it('deduplicates identical summaries while distinguishing count and latest-id changes', () => {
    const baseline = { unreadCount: 2, latestNotificationId: 'A' }
    expect(summariesEqual(baseline, { ...baseline })).toBe(true)
    expect(summariesEqual(baseline, { unreadCount: 1, latestNotificationId: 'A' })).toBe(false)
    expect(summariesEqual(baseline, { unreadCount: 2, latestNotificationId: 'B' })).toBe(false)
    expect(discoveredNewNotification(undefined, 'A')).toBe(false)
    expect(discoveredNewNotification('A', 'A')).toBe(false)
    expect(discoveredNewNotification('A', 'B')).toBe(true)
    expect(discoveredNewNotification('A', null)).toBe(false)
  })

  it('offers only canonical Invitation RSVP statuses', () => {
    expect(invitationRsvpStatusOptions).toEqual([{ value: '', label: 'All RSVP statuses' }, { value: 'pending', label: 'Pending' }, { value: 'partial', label: 'Partial' }, { value: 'complete', label: 'Complete' }])
    expect(invitationRsvpStatusOptions.map((option) => option.label)).not.toContain('Attending')
    expect(invitationRsvpStatusOptions.map((option) => option.label)).not.toContain('Declined')
  })

  it('keeps Refresh, Filters, and textual Sort in exact toolbar order', () => {
    const html = renderToStaticMarkup(<InvitationsToolbar query={query} counts={{ all: 1, active: 1, inactive: 0 }} roles={[]} loading={false} onChange={() => undefined} onRefresh={() => undefined} />)
    const refresh = html.indexOf('aria-label="Refresh invitations"')
    const filters = html.indexOf('aria-label="Filters"')
    const sort = html.indexOf('aria-label="Sort invitations"')
    expect(refresh).toBeGreaterThan(-1); expect(filters).toBeGreaterThan(refresh); expect(sort).toBeGreaterThan(filters)
    expect(html).toContain('Recently added')
  })

  it('announces and visually marks active filters', () => {
    const html = renderToStaticMarkup(<InvitationsToolbar query={{ ...query, relationships: ['friend'], rsvpStatuses: ['partial', 'complete'] }} counts={{ all: 1, active: 1, inactive: 0 }} roles={[]} loading={false} onChange={() => undefined} onRefresh={() => undefined} />)
    expect(html).toContain('aria-label="Filters, 2 active"')
    expect(html).toContain('bg-accent/10')
  })

  it('uses compact zero and multi-selection labels without a selectable All option', () => {
    const options = [{ value: 'attending', label: 'Attending' }, { value: 'declined', label: 'Declined' }]
    const empty = renderToStaticMarkup(<FilterMultiSelect allLabel="All guest responses" groupLabel="Guest Responses" options={options} values={[]} onChange={() => undefined} />)
    const selected = renderToStaticMarkup(<FilterMultiSelect allLabel="All guest responses" groupLabel="Guest Responses" options={options} values={['attending', 'declined']} onChange={() => undefined} />)
    expect(empty).toContain('All guest responses')
    expect(selected).toContain('Guest Responses · 2')
    expect(options.some((option) => option.value === '')).toBe(false)
  })
})
