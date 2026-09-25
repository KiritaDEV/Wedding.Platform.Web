import { z } from 'zod'
import { ApiError, apiRequest, ensureCsrfCookie } from '../../lib/api'
import { normalizePublicRenderableWebsiteFromApi } from '../websiteEditor/schemas'
import type { RenderableWebsite } from '../websiteEditor/types'

const eventSchema = z.object({
  id: z.string().optional(), name: z.string(), slug: z.string(), type: z.literal('wedding').optional(),
  eventDate: z.string().nullable().optional(), startTime: z.string().nullable().optional(), timeZone: z.string().nullable().optional(),
}).strict()

const guestSchema = z.object({
  id: z.string(), name: z.string(), response: z.enum(['attending', 'declined']).nullable(),
}).strict()

const rsvpSchema = z.object({
  status: z.enum(['pending', 'partial', 'complete']),
  attendingCount: z.number().int().nonnegative(), declinedCount: z.number().int().nonnegative(), pendingCount: z.number().int().nonnegative(),
  lastUpdated: z.string().nullable(),
  availability: z.enum(['open', 'event_closed', 'deadline_passed', 'invitation_inactive']),
  guests: z.array(guestSchema),
}).strict()

const privateInvitationSchema = z.object({
  linkStatus: z.enum(['current', 'historical']),
  invitationStatus: z.enum(['active', 'inactive']),
  trustState: z.enum(['unclaimed', 'trusted', 'claimed_elsewhere']),
  canOpen: z.boolean(),
  currentPath: z.string().optional(),
  handoffOnly: z.boolean().optional(),
  accessState: z.enum(['can_request', 'transfer_pending', 'request_pending']).nullable().optional(),
  accessRequest: z.object({
    browserFamily: z.string().nullable().optional(), platform: z.string().nullable().optional(),
    requestedAt: z.string(), expiresAt: z.string(),
  }).strict().nullable().optional(),
  rsvp: rsvpSchema.nullable(),
}).strict()

const envelopeSchema = z.object({ data: z.object({
  status: z.enum(['published', 'unpublished']), event: eventSchema, website: z.unknown().nullable(), privateInvitation: privateInvitationSchema,
}).strict() }).strict()

const submissionEnvelopeSchema = z.object({ data: z.object({
  changed: z.boolean(),
  confirmation: z.enum(['received', 'updated']).nullable(),
  rsvp: rsvpSchema,
}).strict() }).strict()

export type PrivateInvitationRuntime = z.infer<typeof privateInvitationSchema>
export type PrivateEventSite = {
  status: 'published' | 'unpublished'
  event: z.infer<typeof eventSchema>
  website: RenderableWebsite | null
  privateInvitation: PrivateInvitationRuntime
}

export type PrivateSiteLoadError = 'unavailable' | 'load'
export type PrivateRsvpSubmission = z.infer<typeof submissionEnvelopeSchema>['data']

export function privateSiteLoadError(reason: unknown): PrivateSiteLoadError {
  return reason instanceof ApiError && reason.status === 404 ? 'unavailable' : 'load'
}

export function normalizePrivateEventSiteResponse(response: unknown): PrivateEventSite {
  const { data } = envelopeSchema.parse(response)
  return { ...data, website: data.website === null ? null : normalizePublicRenderableWebsiteFromApi(data.website) }
}

export async function getPrivateEventSite(token: string, signal?: AbortSignal, handoffOnly = false): Promise<PrivateEventSite> {
  await ensureCsrfCookie(signal)
  const response = await apiRequest<unknown>('/api/private-invitations/site', { method: 'POST', body: { token, ...(handoffOnly ? { handoffOnly: true } : {}) }, signal })
  return normalizePrivateEventSiteResponse(response)
}

export async function requestPrivateInvitationAccess(token: string): Promise<void> {
  await ensureCsrfCookie()
  await apiRequest('/api/private-invitations/access-requests', { method: 'POST', body: { token } })
}

export async function resolvePrivateInvitationAccess(token: string, decision: 'approve' | 'reject'): Promise<void> {
  await ensureCsrfCookie()
  await apiRequest(`/api/private-invitations/access-requests/${decision}`, { method: 'POST', body: { token } })
}

export async function openPrivateInvitation(token: string): Promise<void> {
  await ensureCsrfCookie()
  await apiRequest('/api/private-invitations/open', { method: 'POST', body: { token } })
}

export async function submitPrivateInvitationRsvp(token: string, responses: Array<{ guestId: string; response: 'attending' | 'declined' }>): Promise<PrivateRsvpSubmission> {
  await ensureCsrfCookie()
  const response = await apiRequest<unknown>('/api/private-invitations/rsvp', { method: 'POST', body: { token, responses } })
  return submissionEnvelopeSchema.parse(response).data
}
