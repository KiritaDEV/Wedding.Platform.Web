import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { invitationQueryParameters } from './api'
import { InvitationRsvpSummary, InvitationsResults } from './components/InvitationsResults'
import type { InvitationListItem, InvitationListQuery } from './types'

const query: InvitationListQuery = { q: 'Neil', lifecycle: 'inactive', relationship: 'friend', side: 'groom', weddingRoleId: 'role', rsvp: 'pending', sort: 'invitation_asc', page: 3 }
const item = (id: string): InvitationListItem => ({
  id, customName: null, effectiveName: `Invitation ${id}`, status: id === 'two' ? 'inactive' : 'active', guestCount: 2,
  rsvp: { status: 'pending', attending: 0, declined: 0, pending: 2 }, lastResponse: null, createdAt: '2026-01-01T00:00:00Z',
  guests: [{ id: `guest-${id}`, firstName: 'Neil', lastName: id, relationship: 'friend', side: 'groom', rsvpStatus: 'pending', weddingRoles: [{ id: 'role', key: 'best_man', name: 'Best Man', isBuiltin: true }] }],
})

const renderResults = (invitation: InvitationListItem) => renderToStaticMarkup(<InvitationsResults invitations={[invitation]} expanded={new Set([invitation.id])} sort="recently_added" onToggle={vi.fn()} onSort={vi.fn()} onEdit={vi.fn()} onActivate={vi.fn()} onDeactivate={vi.fn()} onDelete={vi.fn()} onMove={vi.fn()} />)

describe('Invitations coordinator contracts', () => {
  it.each([
    ['Pending', { status: 'pending' as const, attending: 0, declined: 0, pending: 3 }, ['3🟡'], ['0 attending', '0 declined'], ['3 pending']],
    ['Partial', { status: 'partial' as const, attending: 2, declined: 1, pending: 1 }, ['2🟢', '1🔴', '1🟡'], [], ['2 attending', '1 declined', '1 pending']],
    ['Complete', { status: 'complete' as const, attending: 4, declined: 0, pending: 0 }, ['4🟢'], ['0 declined', '0 pending'], ['4 attending']],
    ['Complete', { status: 'complete' as const, attending: 2, declined: 2, pending: 0 }, ['2🟢', '2🔴'], ['0 pending'], ['2 attending', '2 declined']],
  ])('renders compact accessible %s RSVP counts', (label, rsvp, visible, absent, accessible) => {
    const invitation = { ...item('rsvp'), rsvp }
    const html = renderToStaticMarkup(<InvitationRsvpSummary invitation={invitation} />)
    expect(html).toContain(label)
    visible.forEach((value) => expect(html).toContain(value))
    absent.forEach((value) => expect(html).not.toContain(value))
    accessible.forEach((value) => expect(html).toContain(`aria-label="${value}"`))
  })

  it('serializes the complete canonical query for server-side execution', () => {
    expect(invitationQueryParameters(query).toString()).toBe('lifecycle=inactive&sort=invitation_asc&page=3&q=Neil&relationship=friend&side=groom&weddingRoleId=role&rsvp=pending')
    const defaults = invitationQueryParameters({ ...query, q: '', lifecycle: 'all', relationship: '', side: '', weddingRoleId: '', rsvp: '', sort: 'recently_added', page: 1 })
    expect(defaults.toString()).toBe('lifecycle=all&sort=recently_added&page=1')
  })

  it('renders desktop and mobile results with multiple independent expansions', () => {
    const html = renderToStaticMarkup(<InvitationsResults invitations={[item('one'), item('two')]} expanded={new Set(['one', 'two'])} sort="invitation_asc" onToggle={vi.fn()} onSort={vi.fn()} onEdit={vi.fn()} onActivate={vi.fn()} onDeactivate={vi.fn()} onDelete={vi.fn()} onMove={vi.fn()} />)
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
    expect(mobile).not.toContain('—')
  })

  it('keeps the Invitation-level mobile RSVP and Last response on separate lines', () => {
    const html = renderResults(item('header'))
    expect(html).toMatch(/<div class="mt-1"><span[^>]*>.*?<\/span><\/div><p class="mt-1 text-sm text-foreground-muted">Last response:/)
  })
})
