import { z } from 'zod'
import { apiRequest, ensureCsrfCookie } from '../../lib/api'
import type { ApiCollection, ApiResource } from '../../lib/api'
import { mediaAssetSchema } from './schemas'
import type { MediaAsset, MediaFilters, MediaPage } from './types'

type PaginatedMediaResponse = ApiCollection<unknown> & { meta: { current_page: number; last_page: number; total: number } }

export async function getMediaAssets(eventId: string, filters: MediaFilters = {}, signal?: AbortSignal): Promise<MediaPage> {
  const query = new URLSearchParams()
  if (filters.search?.trim()) query.set('search', filters.search.trim())
  if (filters.type) query.set('type', filters.type)
  if (filters.orientation) query.set('orientation', filters.orientation)
  if (filters.uploaded) query.set('uploaded', filters.uploaded)
  if (filters.page && filters.page > 1) query.set('page', String(filters.page))
  const suffix = query.size > 0 ? `?${query}` : ''
  const response = await apiRequest<PaginatedMediaResponse>(`/api/events/${encodeURIComponent(eventId)}/media${suffix}`, { signal })
  return {
    assets: z.array(mediaAssetSchema).parse(response.data) as MediaAsset[],
    currentPage: response.meta.current_page,
    lastPage: response.meta.last_page,
    total: response.meta.total,
  }
}

export async function uploadMediaAsset(eventId: string, file: File): Promise<MediaAsset> {
  await ensureCsrfCookie()
  const body = new FormData()
  body.append('file', file)
  const response = await apiRequest<ApiResource<unknown>>(`/api/events/${encodeURIComponent(eventId)}/media`, {
    method: 'POST', body,
  })
  return mediaAssetSchema.parse(response.data) as MediaAsset
}

export async function deleteMediaAsset(eventId: string, assetId: string): Promise<void> {
  await ensureCsrfCookie()
  await apiRequest(`/api/events/${encodeURIComponent(eventId)}/media/${encodeURIComponent(assetId)}`, { method: 'DELETE' })
}
