import { z } from 'zod'
import { apiRequest } from '../../lib/api'
import { normalizePublicRenderableWebsiteFromApi } from '../websiteEditor/schemas'
import type { RenderableWebsite } from '../websiteEditor/types'

const eventSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  slug: z.string(),
  type: z.literal('wedding').optional(),
  eventDate: z.string().nullable().optional(),
  startTime: z.string().nullable().optional(),
  timeZone: z.string().nullable().optional(),
}).strict()

const publicEventSiteEnvelopeSchema = z.object({
  data: z.object({
    status: z.enum(['published', 'unpublished']),
    event: eventSchema,
    website: z.unknown().nullable(),
  }).strict(),
}).strict()

export type PublicEventSite = {
  status: 'published' | 'unpublished'
  event: z.infer<typeof eventSchema>
  website: RenderableWebsite | null
}

export function normalizePublicEventSiteResponse(response: unknown): PublicEventSite {
  const { data } = publicEventSiteEnvelopeSchema.parse(response)
  const website = data.website === null ? null : normalizePublicRenderableWebsiteFromApi(data.website)

  return { ...data, website }
}

export async function getPublicEventSite(slug: string, signal?: AbortSignal): Promise<PublicEventSite> {
  const response = await apiRequest<unknown>(`/api/public/events/${encodeURIComponent(slug)}/site`, { signal })
  return normalizePublicEventSiteResponse(response)
}
