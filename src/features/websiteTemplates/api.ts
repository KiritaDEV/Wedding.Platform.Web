import { z } from 'zod'
import { apiRequest } from '../../lib/api'
import type { ApiResource } from '../../lib/api'
import type { WebsiteTemplateOption } from './types'

const nonEmptyString = z.string().refine((value) => value.trim().length > 0, 'Required')
const templateSchema = z.object({
  key: nonEmptyString,
  displayName: nonEmptyString,
  description: nonEmptyString,
  styleTags: z.array(nonEmptyString),
}).strict()

export async function getWebsiteCreationTemplates(eventId: string, signal?: AbortSignal): Promise<WebsiteTemplateOption[]> {
  const response = await apiRequest<ApiResource<unknown>>(`/api/events/${encodeURIComponent(eventId)}/website-templates`, { signal })
  return z.array(templateSchema).parse(response.data)
}
