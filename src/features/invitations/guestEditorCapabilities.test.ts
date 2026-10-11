import { describe, expect, it } from 'vitest'
import { guestEditorCapabilities } from './guestEditorCapabilities'
import type { GuestDraft } from './types'

function guest(id: string, status: 'active' | 'inactive', canPermanentlyDelete = true): GuestDraft {
  return {
    id, rowKey: id, firstName: id, lastName: null, relationship: 'guest_other', side: 'unspecified', status,
    weddingRoleIds: [], customWeddingRoleKeys: [], canPermanentlyDelete,
  }
}

describe('Invitation editor Guest lifecycle capabilities', () => {
  it('allows either of two active Guests to be deactivated', () => {
    const guests = [guest('Yelena', 'active'), guest('John', 'active')]
    expect(guestEditorCapabilities(guests, 0).canDeactivate).toBe(true)
    expect(guestEditorCapabilities(guests, 1).canDeactivate).toBe(true)
  })

  it('blocks the sole active Guest while allowing the inactive Guest to be reactivated', () => {
    const guests = [guest('Yelena', 'active'), guest('John', 'inactive')]
    expect(guestEditorCapabilities(guests, 0).canDeactivate).toBe(false)
    expect(guestEditorCapabilities(guests, 1).canReactivate).toBe(true)
  })

  it('keeps Deactivate independent from RSVP participation delete protection', () => {
    const guests = [guest('Yelena', 'active'), guest('John', 'active', false)]
    const john = guestEditorCapabilities(guests, 1)
    expect(john.canDeactivate).toBe(true)
    expect(john.canPermanentlyDelete).toBe(false)
    expect(john.deleteBlockedReason).toContain('RSVP participation')
  })

  it('reacts to live lifecycle changes without stale counts', () => {
    const guests = [guest('Yelena', 'active'), guest('John', 'active')]
    guests[1].status = 'inactive'
    expect(guestEditorCapabilities(guests, 0).canDeactivate).toBe(false)
    expect(guestEditorCapabilities(guests, 1).canReactivate).toBe(true)

    guests[1].status = 'active'
    expect(guestEditorCapabilities(guests, 0).canDeactivate).toBe(true)
    expect(guestEditorCapabilities(guests, 1).canDeactivate).toBe(true)
  })
})
