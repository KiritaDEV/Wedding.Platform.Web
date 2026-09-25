import type { PrivateInvitationRuntime } from './api'

export type RsvpChoice = 'attending' | 'declined'
export type RsvpDraft = Record<string, RsvpChoice | null>
export type RsvpGuest = NonNullable<PrivateInvitationRuntime['rsvp']>['guests'][number]

export function completeRsvpDraft(guests: RsvpGuest[], draft: RsvpDraft): boolean {
  return guests.every((guest) => draft[guest.id] === 'attending' || draft[guest.id] === 'declined')
}

export function changedRsvpDraft(guests: RsvpGuest[], draft: RsvpDraft): boolean {
  return guests.some((guest) => draft[guest.id] !== guest.response)
}

export function rsvpSubmissionPayload(guests: RsvpGuest[], draft: RsvpDraft): Array<{ guestId: string; response: RsvpChoice }> {
  return guests.map((guest) => ({ guestId: guest.id, response: draft[guest.id] as RsvpChoice }))
}

export function rsvpConfirmationMessage(confirmation: 'received' | 'updated'): string {
  return confirmation === 'received' ? 'RSVP received' : 'RSVP updated'
}
