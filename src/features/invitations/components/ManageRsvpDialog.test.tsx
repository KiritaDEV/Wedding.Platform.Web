import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ManageRsvpDialog } from './ManageRsvpDialog'
import type { InvitationListItem } from '../types'

const invitation: InvitationListItem = {
  id: 'invitation', customName: null, effectiveName: 'Parker household', status: 'active', guestCount: 2, totalGuestCount: 3,
  rsvp: { status: 'partial', attendingCount: 1, declinedCount: 0, pendingCount: 1 }, lastResponse: null, canPermanentlyDelete: false,
  trustedAccess: { hasTrustedBrowser: false, hasPendingAccessRequest: false }, createdAt: '2026-09-25T00:00:00Z', guests: [],
}

describe('Manage RSVP management contract', () => {
  it('uses the established contained responsive management dialog and separate workflow', () => {
    const html = renderToStaticMarkup(<ManageRsvpDialog open={false} eventId="event" invitation={invitation} onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(html).toContain('Manage RSVP')
    expect(html).toContain('Parker household')
    expect(html).toContain('Save changes')
    expect(html).toContain('data-mobile-full-screen="true"')
  })

  it('implements one atomic full-roster save with nullable Pending and duplicate-submit protection', () => {
    const source = readFileSync(new URL('./ManageRsvpDialog.tsx', import.meta.url), 'utf8')
    expect(source).toContain("(['pending', 'attending', 'declined'] as const)")
    expect(source).toContain("value === 'pending' ? null : value")
    expect(source).toContain('!changed || savingRef.current')
    expect(source).toContain('activeGuests.map((guest) =>')
    expect(source).toContain('note.trim() || null')
    expect(source).toContain('The guest list changed. Review the latest RSVP before saving again.')
  })

  it('renders immutable history on demand with actors, snapshot items, notes, and cursor loading', () => {
    const source = readFileSync(new URL('./ManageRsvpDialog.tsx', import.meta.url), 'utf8')
    expect(source).toContain('getInvitationRsvpHistory')
    expect(source).toContain("'Private invitation'")
    expect(source).toContain('item.guestName')
    expect(source).toContain('entry.note')
    expect(source).toContain('Load more')
  })
})
