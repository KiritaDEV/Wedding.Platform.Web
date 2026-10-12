import { z } from 'zod'
import { apiRequest, ensureCsrfCookie } from '../../lib/api'

export const collaboratorSchema = z.object({ id: z.string(), name: z.string(), email: z.string(), role: z.enum(['owner', 'admin']) })
export type Collaborator = z.infer<typeof collaboratorSchema>
const path = (eventId: string) => `/api/events/${encodeURIComponent(eventId)}/collaborators`

export async function getCollaborators(eventId: string, signal?: AbortSignal) {
  const response = await apiRequest<{ data: unknown }>(path(eventId), { signal })
  return z.array(collaboratorSchema).parse(response.data)
}

export async function addCollaborator(eventId: string, email: string) {
  await ensureCsrfCookie()
  const response = await apiRequest<{ data: unknown }>(path(eventId), { method: 'POST', body: { email: email.trim().toLowerCase() } })
  return collaboratorSchema.parse(response.data)
}

export async function removeCollaborator(eventId: string, membershipId: string) {
  await ensureCsrfCookie()
  await apiRequest(path(eventId) + `/${encodeURIComponent(membershipId)}`, { method: 'DELETE' })
}
