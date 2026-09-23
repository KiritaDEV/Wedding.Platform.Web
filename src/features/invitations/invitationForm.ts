import { z } from 'zod'
import type { UseFormSetValue } from 'react-hook-form'
import type { DraftWeddingRole, GuestDraft, Invitation, InvitationFormDraft, InvitationMutationPayload } from './types'

let draftIdSequence = 0

export function createInvitationDraftId(prefix: string): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return `${prefix}-${globalThis.crypto.randomUUID()}`
  draftIdSequence += 1
  return `${prefix}-${Date.now().toString(36)}-${draftIdSequence.toString(36)}-${Math.random().toString(36).slice(2)}`
}

export function normalizeInvitationIdentity(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase()
}

export function guestFullName(guest: Pick<GuestDraft, 'firstName' | 'lastName'>): string {
  return [guest.firstName.trim().replace(/\s+/gu, ' '), guest.lastName?.trim().replace(/\s+/gu, ' ')]
    .filter(Boolean).join(' ')
}

export function effectiveInvitationName(customName: string, guests: Array<Pick<GuestDraft, 'firstName' | 'lastName' | 'status'>>): string {
  const custom = customName.trim().replace(/\s+/gu, ' ')
  if (custom) return custom
  const names = guests.filter((guest) => guest.status === 'active').map(guestFullName).filter(Boolean)
  if (names.length === 0) return 'Add a Guest name to preview the Invitation name'
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} & ${names[1]}`
  const remainder = names.length - 2
  return `${names[0]}, ${names[1]} + ${remainder} ${remainder === 1 ? 'guest' : 'guests'}`
}

export function newGuestDraft(rowKey: string = createInvitationDraftId('guest')): GuestDraft {
  return { rowKey, firstName: '', lastName: null, relationship: 'guest_other', side: 'unspecified', status: 'active', weddingRoleIds: [], customWeddingRoleKeys: [] }
}

export function setGuestRoleSelection(
  setValue: UseFormSetValue<InvitationFormDraft>,
  index: number,
  weddingRoleIds: string[],
  customWeddingRoleKeys: string[],
): void {
  setValue(`guests.${index}.weddingRoleIds`, weddingRoleIds, { shouldDirty: true, shouldValidate: true })
  setValue(`guests.${index}.customWeddingRoleKeys`, customWeddingRoleKeys, { shouldDirty: true, shouldValidate: true })
}

export function hydrateInvitationDraft(invitation: Invitation): InvitationFormDraft {
  return {
    customName: invitation.customName ?? '',
    guests: invitation.guests.map((guest) => ({
      rowKey: guest.id, id: guest.id, firstName: guest.firstName, lastName: guest.lastName,
      relationship: guest.relationship, side: guest.side,
      status: guest.status,
      canPermanentlyDelete: guest.canPermanentlyDelete,
      weddingRoleIds: guest.weddingRoles.map((role) => role.id), customWeddingRoleKeys: [],
    })),
  }
}

const guestSchema = z.object({
  rowKey: z.string(), id: z.string().optional(),
  firstName: z.string().trim().min(1, 'First name is required.'),
  lastName: z.string().nullable(),
  relationship: z.enum(['guest_other', 'parent', 'family_member', 'friend', 'colleague']),
  side: z.enum(['unspecified', 'bride', 'groom', 'both']),
  status: z.enum(['active', 'inactive']),
  weddingRoleIds: z.array(z.string()), customWeddingRoleKeys: z.array(z.string()),
})

export const invitationFormSchema = z.object({
  customName: z.string(), guests: z.array(guestSchema).min(1),
}).superRefine((value, context) => {
  if (!value.guests.some((guest) => guest.status === 'active')) context.addIssue({ code: 'custom', path: ['guests'], message: 'An Invitation must keep at least one active Guest.' })
  const identities = new Map<string, number>()
  value.guests.forEach((guest, index) => {
    const identity = `${normalizeInvitationIdentity(guest.firstName)}\u0000${normalizeInvitationIdentity(guest.lastName ?? '')}`
    const previous = identities.get(identity)
    if (previous !== undefined && normalizeInvitationIdentity(guest.firstName)) {
      context.addIssue({ code: 'custom', path: ['guests', index, 'firstName'], message: 'This Guest duplicates another Guest in this Invitation.' })
      context.addIssue({ code: 'custom', path: ['guests', previous, 'firstName'], message: 'This Guest duplicates another Guest in this Invitation.' })
    } else identities.set(identity, index)
  })
})

export function buildInvitationPayload(draft: InvitationFormDraft, draftRoles: DraftWeddingRole[], deletedGuestIds: string[] = []): InvitationMutationPayload {
  const referenced = new Set(draft.guests.flatMap((guest) => guest.customWeddingRoleKeys))
  return {
    customName: draft.customName.trim() || null,
    customRoles: draftRoles.filter((role) => referenced.has(role.clientKey)),
    ...(deletedGuestIds.length ? { deletedGuestIds } : {}),
    guests: draft.guests.map((guest) => ({
      ...(guest.id ? { id: guest.id } : {}), firstName: guest.firstName.trim().replace(/\s+/gu, ' '),
      lastName: guest.lastName?.trim().replace(/\s+/gu, ' ') || null,
      relationship: guest.relationship, side: guest.side,
      status: guest.status,
      weddingRoleIds: guest.weddingRoleIds, customWeddingRoleKeys: guest.customWeddingRoleKeys,
    })),
  }
}
