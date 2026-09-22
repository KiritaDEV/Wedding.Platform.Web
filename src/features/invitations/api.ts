import { z } from 'zod'
import { apiRequest, ensureCsrfCookie } from '../../lib/api'
import type { ApiCollection, ApiResource } from '../../lib/api'
import type { Invitation, InvitationListQuery, InvitationListResult, InvitationMutationPayload, InvitationOption, WeddingRole } from './types'

const roleSchema = z.object({ id: z.string(), key: z.string().nullable(), name: z.string(), isBuiltin: z.boolean() })
const guestSchema = z.object({
  id: z.string(), firstName: z.string(), lastName: z.string().nullable(),
  relationship: z.enum(['guest_other', 'parent', 'family_member', 'friend', 'colleague']),
  side: z.enum(['unspecified', 'bride', 'groom', 'both']), weddingRoles: z.array(roleSchema),
})
const listGuestSchema = guestSchema.extend({ rsvpStatus: z.enum(['pending', 'attending', 'declined']) })
const listItemSchema = z.object({
  id: z.string(), customName: z.string().nullable(), effectiveName: z.string(), status: z.enum(['active', 'inactive']), guestCount: z.number(),
  rsvp: z.object({ status: z.enum(['pending', 'partial', 'complete']), attending: z.number(), declined: z.number(), pending: z.number() }),
  lastResponse: z.string().nullable(), guests: z.array(listGuestSchema), createdAt: z.string(),
})
const listMetaSchema = z.object({
  pagination: z.object({ currentPage: z.number(), lastPage: z.number(), perPage: z.number(), total: z.number() }),
  summary: z.object({ activeInvitations: z.number(), guests: z.number(), attending: z.number(), declined: z.number(), pending: z.number() }),
  lifecycleCounts: z.object({ all: z.number(), active: z.number(), inactive: z.number() }),
})
const optionSchema = z.object({ id: z.string(), effectiveName: z.string(), status: z.enum(['active', 'inactive']), guestCount: z.number() })
const transportSchema = z.object({
  id: z.string(), customName: z.string().nullable(), displayName: z.string(),
  status: z.enum(['active', 'inactive']), guests: z.array(guestSchema),
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
  if (query.relationship) parameters.set('relationship', query.relationship)
  if (query.side) parameters.set('side', query.side)
  if (query.weddingRoleId) parameters.set('weddingRoleId', query.weddingRoleId)
  if (query.rsvp) parameters.set('rsvp', query.rsvp)
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

export async function getInvitationOptions(eventId: string, signal?: AbortSignal): Promise<InvitationOption[]> {
  const response = await apiRequest<ApiCollection<unknown>>(`/api/events/${encodeURIComponent(eventId)}/invitation-options`, { signal })
  return z.array(optionSchema).parse(response.data)
}

export async function moveGuest(eventId: string, sourceInvitationId: string, guestId: string, destinationInvitationId: string): Promise<void> {
  await ensureCsrfCookie()
  await apiRequest(`/api/events/${encodeURIComponent(eventId)}/invitations/${encodeURIComponent(sourceInvitationId)}/guests/${encodeURIComponent(guestId)}/move`, { method: 'POST', body: { destinationInvitationId } })
}
