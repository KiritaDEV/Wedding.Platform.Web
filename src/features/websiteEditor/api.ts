import { apiRequest, ensureCsrfCookie } from '../../lib/api'
import type { ApiResource } from '../../lib/api'
import { normalizeWebsiteDraftFromApi } from './schemas'
import type { SectionDesignDefaults, WebsiteDesignSettings, WebsiteDraft, WebsiteSectionAppearance, WebsiteSectionAppearanceEnvelope } from './types'
import { canonicalizeSectionChildFlowText, type SectionChildFlow } from './sectionChildFlow'

function projectPath(eventId: string, projectId: string): string {
  return `/api/events/${encodeURIComponent(eventId)}/websites/${encodeURIComponent(projectId)}`
}

async function mutation(eventId: string, projectId: string, path: string, body: unknown): Promise<WebsiteDraft> {
  await ensureCsrfCookie()
  const response = await apiRequest<ApiResource<unknown>>(`${projectPath(eventId, projectId)}${path}`, {
    method: 'PUT', body,
  })
  return normalizeWebsiteDraftFromApi(response.data)
}

export async function getWebsiteDraft(eventId: string, projectId: string, signal?: AbortSignal): Promise<WebsiteDraft> {
  const response = await apiRequest<ApiResource<unknown>>(projectPath(eventId, projectId), { signal })
  return normalizeWebsiteDraftFromApi(response.data)
}

export function updateWebsiteDesignSettings(eventId: string, projectId: string, designSettings: WebsiteDesignSettings) {
  const { customColors: _customColors, ...authorableDesignSettings } = designSettings
  void _customColors
  return mutation(eventId, projectId, '/design', { designSettings: authorableDesignSettings })
}

export function addWebsiteProjectColor(eventId: string, projectId: string, value: string) {
  return ensureCsrfCookie().then(async () => {
    const response = await apiRequest<ApiResource<unknown>>(`${projectPath(eventId, projectId)}/colors`, {
      method: 'POST', body: { value },
    })
    return normalizeWebsiteDraftFromApi(response.data)
  })
}

export function updateWebsiteSectionContent(eventId: string, projectId: string, sectionId: string, content: Record<string, unknown>) {
  const canonicalContent = canonicalizeWebsiteSectionContentForApi(content)
  return mutation(eventId, projectId, `/sections/${encodeURIComponent(sectionId)}`, { content: canonicalContent })
}

export function canonicalizeWebsiteSectionContentForApi(content: Record<string, unknown>): Record<string, unknown> {
  const canonicalContent = structuredClone(content)
  removeAuthoredResponsiveState(canonicalContent)
  const compositions = canonicalContent.compositions as { shared?: { childFlow?: SectionChildFlow }; custom?: Record<string, { childFlow?: SectionChildFlow }> } | undefined
  if (compositions?.shared?.childFlow) compositions.shared.childFlow = canonicalizeSectionChildFlowText(compositions.shared.childFlow)
  Object.values(compositions?.custom ?? {}).forEach((composition) => { if (composition.childFlow) composition.childFlow = canonicalizeSectionChildFlowText(composition.childFlow) })
  return canonicalContent
}

function removeAuthoredResponsiveState(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(removeAuthoredResponsiveState)
    return
  }
  if (!value || typeof value !== 'object') return
  const record = value as Record<string, unknown>
  delete record.responsive
  Object.values(record).forEach(removeAuthoredResponsiveState)
}

export function updateWebsiteSectionAppearance(eventId: string, projectId: string, sectionId: string, appearance: WebsiteSectionAppearance | WebsiteSectionAppearanceEnvelope) {
  const canonicalAppearance = structuredClone(appearance)
  removeAuthoredResponsiveState(canonicalAppearance)
  return mutation(eventId, projectId, `/sections/${encodeURIComponent(sectionId)}/appearance`, { appearance: canonicalAppearance })
}

export function updateWebsiteSectionPresentation(eventId: string, projectId: string, sectionId: string, content: Record<string, unknown>, appearance: WebsiteSectionAppearanceEnvelope) {
  const canonicalAppearance = structuredClone(appearance)
  removeAuthoredResponsiveState(canonicalAppearance)
  return mutation(eventId, projectId, `/sections/${encodeURIComponent(sectionId)}/presentation`, { content: canonicalizeWebsiteSectionContentForApi(content), appearance: canonicalAppearance })
}

export function updateWebsiteSectionDesignDefaults(eventId: string, projectId: string, sectionId: string, designDefaults: SectionDesignDefaults) {
  return mutation(eventId, projectId, `/sections/${encodeURIComponent(sectionId)}/design-defaults`, { designDefaults })
}

export function setWebsiteSectionEnabled(eventId: string, projectId: string, sectionId: string, isEnabled: boolean) {
  return mutation(eventId, projectId, `/sections/${encodeURIComponent(sectionId)}/enabled`, { isEnabled })
}

export function reorderWebsiteSections(eventId: string, projectId: string, sectionIds: string[]) {
  return mutation(eventId, projectId, '/sections/order', { sectionIds })
}

export function createWebsiteSection(eventId: string, projectId: string, type: 'blank') {
  return ensureCsrfCookie().then(async () => {
    const response = await apiRequest<ApiResource<unknown>>(`${projectPath(eventId, projectId)}/sections`, { method: 'POST', body: { type } })
    return normalizeWebsiteDraftFromApi(response.data)
  })
}

export function deleteWebsiteSection(eventId: string, projectId: string, sectionId: string) {
  return ensureCsrfCookie().then(async () => {
    const response = await apiRequest<ApiResource<unknown>>(`${projectPath(eventId, projectId)}/sections/${encodeURIComponent(sectionId)}`, { method: 'DELETE' })
    return normalizeWebsiteDraftFromApi(response.data)
  })
}

export function duplicateWebsiteSection(eventId: string, projectId: string, sectionId: string) {
  return ensureCsrfCookie().then(async () => {
    const response = await apiRequest<ApiResource<unknown>>(`${projectPath(eventId, projectId)}/sections/${encodeURIComponent(sectionId)}/duplicate`, { method: 'POST' })
    return normalizeWebsiteDraftFromApi(response.data)
  })
}

export function renameWebsiteSection(eventId: string, projectId: string, sectionId: string, editorName: string) {
  return mutation(eventId, projectId, `/sections/${encodeURIComponent(sectionId)}/editor-name`, { editorName })
}
