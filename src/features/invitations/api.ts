import { z } from 'zod'
import { apiRequest, ensureCsrfCookie } from '../../lib/api'
import type { ApiCollection, ApiResource } from '../../lib/api'
import type { GuestRsvpStatus, Invitation, InvitationAccessAuditResult, InvitationListQuery, InvitationListResult, InvitationMutationPayload, InvitationOption, ManagementRsvpResult, PrivateInvitationLinkRotationResult, RsvpHistoryResult, TrustedAccessResetResult, WeddingRole } from './types'

const roleSchema = z.object({ id: z.string(), key: z.string().nullable(), name: z.string(), isBuiltin: z.boolean() })
const guestSchema = z.object({
  id: z.string(), firstName: z.string(), lastName: z.string().nullable(),
  relationship: z.enum(['guest_other', 'parent', 'family_member', 'friend', 'colleague']),
  side: z.enum(['unspecified', 'bride', 'groom', 'both']), status: z.enum(['active', 'inactive']),
  rsvpResponse: z.enum(['attending', 'declined']).nullable(), canPermanentlyDelete: z.boolean(), weddingRoles: z.array(roleSchema),
})
const listGuestSchema = guestSchema.extend({ rsvpStatus: z.enum(['pending', 'attending', 'declined']) })
const listItemSchema = z.object({
  id: z.string(), customName: z.string().nullable(), effectiveName: z.string(), status: z.enum(['active', 'inactive']), guestCount: z.number(), totalGuestCount: z.number(),
  rsvp: z.object({ status: z.enum(['pending', 'partial', 'complete']), attendingCount: z.number(), declinedCount: z.number(), pendingCount: z.number() }),
  lastResponse: z.string().nullable(), canPermanentlyDelete: z.boolean(), trustedAccess: z.object({ hasTrustedBrowser: z.boolean(), hasPendingAccessRequest: z.boolean() }), guests: z.array(listGuestSchema), createdAt: z.string(),
})
const listMetaSchema = z.object({
  pagination: z.object({ currentPage: z.number(), lastPage: z.number(), perPage: z.number(), total: z.number() }),
  summary: z.object({ activeInvitations: z.number(), guests: z.number(), attending: z.number(), declined: z.number(), pending: z.number() }),
  lifecycleCounts: z.object({ all: z.number(), active: z.number(), inactive: z.number() }),
})
const optionSchema = z.object({ id: z.string(), effectiveName: z.string(), status: z.enum(['active', 'inactive']), guestCount: z.number() })
const transportSchema = z.object({
  id: z.string(), customName: z.string().nullable(), displayName: z.string(),
  status: z.enum(['active', 'inactive']), canPermanentlyDelete: z.boolean(), trustedAccess: z.object({ hasTrustedBrowser: z.boolean(), hasPendingAccessRequest: z.boolean() }), privateInvitation: z.object({ path: z.string() }).optional(), guests: z.array(guestSchema),
})
const accessAuditSchema = z.object({
  data: z.array(z.object({
    id: z.string(),
    type: z.enum(['trusted_access_claimed', 'access_transfer_requested', 'access_transfer_approved', 'access_transfer_rejected', 'access_transfer_expired', 'access_transfer_invalidated', 'trusted_access_reset', 'private_link_rotated']),
    occurredAt: z.string(),
    actor: z.discriminatedUnion('type', [
      z.object({ type: z.literal('management_user'), name: z.string().nullable() }),
      z.object({ type: z.literal('private_browser'), browserFamily: z.string().nullable(), platform: z.string().nullable() }),
      z.object({ type: z.literal('system') }),
    ]),
    details: z.object({
      reason: z.enum(['invitation_inactive', 'trusted_access_reset', 'private_link_rotated']).optional(),
      requesterBrowserFamily: z.string().nullable().optional(), requesterPlatform: z.string().nullable().optional(),
    }).nullable(),
  })),
  meta: z.object({ nextCursor: z.string().nullable() }),
})
const rsvpSubmissionSchema = z.object({
  id: z.string(), createdAt: z.string(), actorType: z.enum(['management_user', 'private_invitation']), actorName: z.string().nullable(), note: z.string().nullable(),
  items: z.array(z.object({ guestId: z.string(), guestName: z.string(), response: z.enum(['attending', 'declined']).nullable() })),
})
const rsvpHistorySchema = z.object({ data: z.array(rsvpSubmissionSchema), meta: z.object({ nextCursor: z.string().nullable() }) })
const managementRsvpSchema = z.object({
  data: z.object({
    changed: z.boolean(), rsvp: listItemSchema.shape.rsvp, guests: z.array(z.object({ id: z.string(), rsvpResponse: z.enum(['attending', 'declined']).nullable() })), lastResponse: z.string().nullable(), submission: rsvpSubmissionSchema.nullable(),
  }),
})

function parseInvitation(value: unknown): Invitation {
  const parsed = transportSchema.parse(value)
  return { ...parsed, effectiveName: parsed.displayName }
}

export async function getWeddingRoles(eventId: string, signal?: AbortSignal): Promise<WeddingRole[]> {
  const response = await apiRequest<ApiCollection<unknown>>(`/api/events/${encodeURIComponent(eventId)}/wedding-roles`, { signal })
  return z.array(roleSchema).parse(response.data)
}

export async function getInvitation(eventId: string, invitationId: string, signal?: AbortSignal): Promise<Invitation> {
  const response = await apiRequest<ApiResource<unknown>>(`/api/events/${encodeURIComponent(eventId)}/invitations/${encodeURIComponent(invitationId)}`, { signal })
  return parseInvitation(response.data)
}

async function mutate(eventId: string, path: string, method: 'POST' | 'PUT', payload: InvitationMutationPayload): Promise<Invitation> {
  await ensureCsrfCookie()
  const response = await apiRequest<ApiResource<unknown>>(`/api/events/${encodeURIComponent(eventId)}/invitations${path}`, { method, body: payload })
  return parseInvitation(response.data)
}

export const createInvitation = (eventId: string, payload: InvitationMutationPayload) => mutate(eventId, '', 'POST', payload)
export const updateInvitation = (eventId: string, invitationId: string, payload: InvitationMutationPayload) => mutate(eventId, `/${encodeURIComponent(invitationId)}`, 'PUT', payload)

export async function listInvitations(eventId: string, query: InvitationListQuery, signal?: AbortSignal): Promise<InvitationListResult> {
  const parameters = invitationQueryParameters(query)
  const response = await apiRequest<unknown>(`/api/events/${encodeURIComponent(eventId)}/invitations?${parameters}`, { signal })
  return z.object({ data: z.array(listItemSchema), meta: listMetaSchema }).parse(response)
}

export function invitationQueryParameters(query: InvitationListQuery): URLSearchParams {
  const parameters = new URLSearchParams({ lifecycle: query.lifecycle, sort: query.sort, page: String(query.page) })
  if (query.q) parameters.set('q', query.q)
  const append = (key: string, values: string[]) => [...values].sort().forEach((value) => parameters.append(`${key}[]`, value))
  append('relationships', query.relationships)
  append('sides', query.sides)
  append('roleIds', query.roleIds)
  append('rsvpStatuses', query.rsvpStatuses)
  append('guestResponses', query.guestResponses)
  return parameters
}

async function invitationAction(eventId: string, invitationId: string, action: 'activate' | 'deactivate'): Promise<Invitation> {
  await ensureCsrfCookie()
  const response = await apiRequest<ApiResource<unknown>>(`/api/events/${encodeURIComponent(eventId)}/invitations/${encodeURIComponent(invitationId)}/${action}`, { method: 'POST' })
  return parseInvitation(response.data)
}
export const activateInvitation = (eventId: string, invitationId: string) => invitationAction(eventId, invitationId, 'activate')
export const deactivateInvitation = (eventId: string, invitationId: string) => invitationAction(eventId, invitationId, 'deactivate')

export async function deleteInvitation(eventId: string, invitationId: string): Promise<void> {
  await ensureCsrfCookie()
  await apiRequest(`/api/events/${encodeURIComponent(eventId)}/invitations/${encodeURIComponent(invitationId)}`, { method: 'DELETE' })
}

export async function resetInvitationTrustedAccess(eventId: string, invitationId: string): Promise<TrustedAccessResetResult> {
  await ensureCsrfCookie()
  const response = await apiRequest<ApiResource<unknown>>(`/api/events/${encodeURIComponent(eventId)}/invitations/${encodeURIComponent(invitationId)}/trusted-access`, { method: 'DELETE' })
  return z.object({ changed: z.boolean(), trustState: z.literal('unclaimed'), hasPendingAccessRequest: z.literal(false) }).parse(response.data)
}

export async function getInvitationPrivatePath(eventId: string, invitationId: string): Promise<string> {
  const invitation = await getInvitation(eventId, invitationId)
  if (!invitation.privateInvitation) throw new Error('The private invitation link is unavailable.')
  return invitation.privateInvitation.path
}

export async function getInvitationAccessAudit(eventId: string, invitationId: string, cursor?: string, signal?: AbortSignal): Promise<InvitationAccessAuditResult> {
  const parameters = new URLSearchParams()
  if (cursor) parameters.set('cursor', cursor)
  const suffix = parameters.size ? `?${parameters}` : ''
  const response = await apiRequest<unknown>(`/api/events/${encodeURIComponent(eventId)}/invitations/${encodeURIComponent(invitationId)}/access-audit${suffix}`, { signal })
  return accessAuditSchema.parse(response)
}

export async function getInvitationRsvpHistory(eventId: string, invitationId: string, cursor?: string, signal?: AbortSignal): Promise<RsvpHistoryResult> {
  const parameters = new URLSearchParams()
  if (cursor) parameters.set('cursor', cursor)
  const suffix = parameters.size ? `?${parameters}` : ''
  const response = await apiRequest<unknown>(`/api/events/${encodeURIComponent(eventId)}/invitations/${encodeURIComponent(invitationId)}/rsvp-history${suffix}`, { signal })
  return rsvpHistorySchema.parse(response)
}

export async function updateInvitationRsvp(eventId: string, invitationId: string, responses: { guestId: string; response: Exclude<GuestRsvpStatus, 'pending'> | null }[], note: string | null): Promise<ManagementRsvpResult> {
  await ensureCsrfCookie()
  const response = await apiRequest<unknown>(`/api/events/${encodeURIComponent(eventId)}/invitations/${encodeURIComponent(invitationId)}/rsvp`, { method: 'PUT', body: { responses, note } })
  return parseManagementRsvpResponse(response)
}

export function parseManagementRsvpResponse(value: unknown): ManagementRsvpResult {
  return managementRsvpSchema.parse(value).data
}

export async function rotateInvitationPrivateLink(eventId: string, invitationId: string): Promise<PrivateInvitationLinkRotationResult> {
  await ensureCsrfCookie()
  const response = await apiRequest<ApiResource<unknown>>(`/api/events/${encodeURIComponent(eventId)}/invitations/${encodeURIComponent(invitationId)}/private-link/rotate`, { method: 'POST' })
  return z.object({
    privateInvitation: z.object({ path: z.string() }),
    trustedAccess: z.object({ hasTrustedBrowser: z.boolean(), hasPendingAccessRequest: z.boolean() }),
  }).parse(response.data)
}

export async function getInvitationOptions(eventId: string, signal?: AbortSignal): Promise<InvitationOption[]> {
  const response = await apiRequest<ApiCollection<unknown>>(`/api/events/${encodeURIComponent(eventId)}/invitation-options`, { signal })
  return z.array(optionSchema).parse(response.data)
}

export async function moveGuest(eventId: string, sourceInvitationId: string, guestId: string, destinationInvitationId: string): Promise<void> {
  await ensureCsrfCookie()
  await apiRequest(`/api/events/${encodeURIComponent(eventId)}/invitations/${encodeURIComponent(sourceInvitationId)}/guests/${encodeURIComponent(guestId)}/move`, { method: 'POST', body: { destinationInvitationId } })
}
