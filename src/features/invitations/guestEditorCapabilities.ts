import type { GuestDraft } from './types'

export type GuestEditorCapabilities = {
  canDeactivate: boolean
  canReactivate: boolean
  canPermanentlyDelete: boolean
  deleteBlockedReason?: string
}

export function guestEditorCapabilities(guests: readonly GuestDraft[], index: number): GuestEditorCapabilities {
  const guest = guests[index]
  if (!guest) return { canDeactivate: false, canReactivate: false, canPermanentlyDelete: false }

  const activeCount = guests.filter(({ status }) => status === 'active').length
  const rosterAllowsPermanentDelete = guests.length > 1 && (guest.status !== 'active' || activeCount > 1)
  const participationAllowsPermanentDelete = guest.canPermanentlyDelete !== false

  return {
    canDeactivate: guest.status === 'active' && activeCount > 1,
    canReactivate: guest.status === 'inactive',
    canPermanentlyDelete: rosterAllowsPermanentDelete && participationAllowsPermanentDelete,
    deleteBlockedReason: !participationAllowsPermanentDelete
      ? 'Guests with RSVP participation cannot be permanently deleted. Deactivate instead.'
      : !rosterAllowsPermanentDelete ? 'An Invitation must keep one active Guest' : undefined,
  }
}
