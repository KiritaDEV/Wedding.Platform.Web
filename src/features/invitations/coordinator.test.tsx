import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { invitationQueryParameters } from './api'
import { InvitationRsvpSummary, InvitationsResults } from './components/InvitationsResults'
import { hasRecoverableTrustedAccess } from './trustedAccess'
import type { InvitationListItem, InvitationListQuery } from './types'

const query: InvitationListQuery = { q: 'Neil', lifecycle: 'inactive', relationships: ['friend'], sides: ['groom'], roleIds: ['role'], rsvpStatuses: ['pending'], guestResponses: ['attending'], sort: 'invitation_asc', page: 3 }
const item = (id: string): InvitationListItem => ({
  id, customName: null, effectiveName: `Invitation ${id}`, status: id === 'two' ? 'inactive' : 'active', guestCount: 2, totalGuestCount: 2,
  rsvp: { status: 'pending', attendingCount: 0, declinedCount: 0, pendingCount: 2 }, lastResponse: null, canPermanentlyDelete: true, trustedAccess: { hasTrustedBrowser: false, hasPendingAccessRequest: false }, createdAt: '2026-01-01T00:00:00Z',
  guests: [{ id: `guest-${id}`, firstName: 'Neil', lastName: id, relationship: 'friend', side: 'groom', status: 'active', rsvpResponse: null, canPermanentlyDelete: true, rsvpStatus: 'pending', weddingRoles: [{ id: 'role', key: 'best_man', name: 'Best Man', isBuiltin: true }] }],
})

const renderResults = (invitation: InvitationListItem) => renderToStaticMarkup(<InvitationsResults invitations={[invitation]} expanded={new Set([invitation.id])} sort="recently_added" onToggle={vi.fn()} onSort={vi.fn()} onEdit={vi.fn()} onManageRsvp={vi.fn()} onAccessActivity={vi.fn()} onCopyLink={vi.fn()} onRotateLink={vi.fn()} onActivate={vi.fn()} onDeactivate={vi.fn()} onResetAccess={vi.fn()} onDelete={vi.fn()} onMove={vi.fn()} />)

describe('Invitations coordinator contracts', () => {
  it.each([
    ['Pending', { status: 'pending' as const, attendingCount: 0, declinedCount: 0, pendingCount: 3 }, ['3🟡'], ['0 attending', '0 declined'], ['3 pending']],
    ['Partial', { status: 'partial' as const, attendingCount: 2, declinedCount: 1, pendingCount: 1 }, ['2🟢', '1🔴', '1🟡'], [], ['2 attending', '1 declined', '1 pending']],
    ['Complete', { status: 'complete' as const, attendingCount: 4, declinedCount: 0, pendingCount: 0 }, ['4🟢'], ['0 declined', '0 pending'], ['4 attending']],
    ['Complete', { status: 'complete' as const, attendingCount: 2, declinedCount: 2, pendingCount: 0 }, ['2🟢', '2🔴'], ['0 pending'], ['2 attending', '2 declined']],
  ])('renders compact accessible %s RSVP counts', (label, rsvp, visible, absent, accessible) => {
    const invitation = { ...item('rsvp'), rsvp }
    const html = renderToStaticMarkup(<InvitationRsvpSummary invitation={invitation} />)
    expect(html).toContain(label)
    visible.forEach((value) => expect(html).toContain(value))
    absent.forEach((value) => expect(html).not.toContain(value))
    accessible.forEach((value) => expect(html).toContain(`aria-label="${value}"`))
  })

  it('serializes the complete canonical query for server-side execution', () => {
    expect(invitationQueryParameters(query).toString()).toBe('lifecycle=inactive&sort=invitation_asc&page=3&q=Neil&relationships%5B%5D=friend&sides%5B%5D=groom&roleIds%5B%5D=role&rsvpStatuses%5B%5D=pending&guestResponses%5B%5D=attending')
    const defaults = invitationQueryParameters({ ...query, q: '', lifecycle: 'all', relationships: [], sides: [], roleIds: [], rsvpStatuses: [], guestResponses: [], sort: 'recently_added', page: 1 })
    expect(defaults.toString()).toBe('lifecycle=all&sort=recently_added&page=1')
  })

  it('renders desktop and mobile results with multiple independent expansions', () => {
    const html = renderToStaticMarkup(<InvitationsResults invitations={[item('one'), item('two')]} expanded={new Set(['one', 'two'])} sort="invitation_asc" onToggle={vi.fn()} onSort={vi.fn()} onEdit={vi.fn()} onManageRsvp={vi.fn()} onAccessActivity={vi.fn()} onCopyLink={vi.fn()} onRotateLink={vi.fn()} onActivate={vi.fn()} onDeactivate={vi.fn()} onResetAccess={vi.fn()} onDelete={vi.fn()} onMove={vi.fn()} />)
    expect(html).toContain('Invitation')
    expect(html).toContain('RSVP')
    expect(html).toContain('Last response')
    expect(html).toContain('Actions')
    expect(html.match(/aria-expanded="true"/g)?.length).toBeGreaterThanOrEqual(4)
    expect(html).toContain('Neil one')
    expect(html).toContain('Best Man')
    expect(html).toContain('Pending')
    expect(html).toContain('aria-label="Actions for Neil one"')
    expect(html).not.toContain('Delete Guest')
    expect(html).not.toContain('Deactivate Guest')
    expect(html).toContain('Inactive')
    expect(html.match(/0 attending/g)).toBeNull()
    expect(html.match(/2🟡/g)).toHaveLength(4)
    expect(html.match(/aria-label="2 pending"/g)).toHaveLength(4)
  })

  it('shows total retained Guests in the heading while RSVP remains active-only', () => {
    const invitation: InvitationListItem = {
      ...item('Avengers'),
      effectiveName: 'Avengers',
      guestCount: 3,
      totalGuestCount: 4,
      rsvp: { status: 'partial', attendingCount: 0, declinedCount: 1, pendingCount: 2 },
      guests: [
        ...item('Avengers').guests,
        { ...item('Steve').guests[0], id: 'steve', firstName: 'Steve', lastName: 'Rogers' },
        { ...item('John').guests[0], id: 'john', firstName: 'John', lastName: 'Walker' },
        { ...item('James').guests[0], id: 'james', firstName: 'James', lastName: 'Barnes', status: 'inactive' },
      ],
    }
    const html = renderResults(invitation)

    expect(html.match(/Avengers \(4\)/g)).toHaveLength(2)
    expect(html).toContain('Partial')
    expect(html).toContain('aria-label="1 declined"')
    expect(html).toContain('aria-label="2 pending"')
    expect(html).not.toContain('aria-label="3 pending"')
  })

  it('renders the compact mobile Guest hierarchy and preserves the desktop Guest table', () => {
    const invitation = item('mobile')
    invitation.guests = [{ ...invitation.guests[0], firstName: 'John', lastName: null, relationship: 'guest_other', side: 'unspecified' }]
    const html = renderResults(invitation)

    expect(html).toContain('data-mobile-guest-row="true"')
    const mobileRow = html.slice(html.indexOf('data-mobile-guest-row'), html.indexOf('data-desktop-guest-table'))
    expect(mobileRow.indexOf('John')).toBeLessThan(mobileRow.indexOf('Pending'))
    expect(mobileRow.indexOf('Pending')).toBeLessThan(mobileRow.indexOf('aria-label="Guest actions for John"'))
    expect(html).toContain('Guest / Other')
    expect(html).toContain('Unspecified')
    expect(html).toContain('data-mobile-guest-roles="true"')
    expect(html).toContain('Best Man')
    expect(html).toContain('data-desktop-guest-table="true"')
    expect(html).toContain('<span>Guest</span><span>Relationship</span><span>Side</span><span>Wedding roles</span><span>RSVP</span><span>Actions</span>')
    expect(mobileRow).toContain('aria-haspopup="menu"')
    expect(html).not.toContain('Deactivate Guest')
  })

  it('wraps multiple mobile role chips and omits the mobile role line for a Guest without roles', () => {
    const invitation = item('roles')
    invitation.guests = [
      { ...invitation.guests[0], id: 'with-roles', weddingRoles: [
        { id: 'bridesmaid', key: 'bridesmaid', name: 'Bridesmaid', isBuiltin: true },
        { id: 'cord', key: 'cord_sponsor', name: 'Cord Sponsor', isBuiltin: true },
      ] },
      { ...invitation.guests[0], id: 'without-roles', firstName: 'NoRole', weddingRoles: [] },
    ]
    const html = renderResults(invitation)
    const mobile = html.slice(html.indexOf('data-mobile-guest-list'), html.indexOf('data-desktop-guest-table'))

    expect(mobile).toContain('class="mt-2 flex flex-wrap gap-1"')
    expect(mobile).toContain('Bridesmaid')
    expect(mobile).toContain('Cord Sponsor')
    expect(mobile.match(/data-mobile-guest-roles="true"/g)).toHaveLength(1)
    expect(mobile).not.toContain('>-<')
  })

  it('keeps the Invitation-level mobile RSVP and Last response on separate lines', () => {
    const html = renderResults(item('header'))
    expect(html).toMatch(/<div class="mt-1"><span[^>]*>.*?<\/span><\/div><p class="mt-1 text-sm text-foreground-muted">Last response:/)
  })

  it('offers trusted-access reset only for a current browser or active request', () => {
    expect(hasRecoverableTrustedAccess({ ...item('trusted'), trustedAccess: { hasTrustedBrowser: true, hasPendingAccessRequest: false } })).toBe(true)
    expect(hasRecoverableTrustedAccess({ ...item('pending'), trustedAccess: { hasTrustedBrowser: false, hasPendingAccessRequest: true } })).toBe(true)
    expect(hasRecoverableTrustedAccess(item('unclaimed'))).toBe(false)
  })

  it('offers Invitation-level Manage RSVP and explains why it is disabled when inactive', () => {
    const source = readFileSync(new URL('./components/InvitationsResults.tsx', import.meta.url), 'utf8')
    expect(source).toContain('Manage RSVP')
    expect(source).toContain('Reactivate this invitation to manage RSVP.')
    expect(source).toContain("invitation.status === 'inactive'")
  })
})
