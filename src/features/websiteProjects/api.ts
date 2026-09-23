import { apiRequest, ensureCsrfCookie } from '../../lib/api'
import type { ApiCollection, ApiResource } from '../../lib/api'
import { normalizeWebsiteDraftFromApi } from '../websiteEditor/schemas'
import type { WebsiteDraft } from '../websiteEditor/types'
import { parseWebsiteProjectList } from './schemas'
import type { CreateWebsiteProjectInput, WebsiteProjectSummary } from './types'

export async function listWebsiteProjects(eventId: string, signal?: AbortSignal): Promise<WebsiteProjectSummary[]> {
  const response = await apiRequest<ApiCollection<unknown>>(`/api/events/${encodeURIComponent(eventId)}/websites`, { signal })
  return parseWebsiteProjectList(response.data)
}

export async function createWebsiteProject(eventId: string, input: CreateWebsiteProjectInput): Promise<WebsiteDraft> {
  await ensureCsrfCookie()
  const response = await apiRequest<ApiResource<unknown>>(`/api/events/${encodeURIComponent(eventId)}/websites`, {
    method: 'POST',
    body: { name: input.name.trim(), templateKey: input.templateKey },
  })
  return normalizeWebsiteDraftFromApi(response.data)
}

export async function publishWebsiteProject(eventId: string, projectId: string): Promise<WebsiteProjectSummary> {
  await ensureCsrfCookie()
  const response = await apiRequest<ApiResource<unknown>>(`/api/events/${encodeURIComponent(eventId)}/websites/${encodeURIComponent(projectId)}/publish`, { method: 'POST' })
  return parseWebsiteProjectList([response.data])[0]
}

export async function unpublishWebsite(eventId: string): Promise<void> {
  await ensureCsrfCookie()
  await apiRequest(`/api/events/${encodeURIComponent(eventId)}/published-website`, { method: 'DELETE' })
}

export const websiteProjectListKey = (eventId: string) => ['website-projects', eventId] as const
export const websiteDraftKey = (eventId: string, projectId: string) => ['website-draft', eventId, projectId] as const
