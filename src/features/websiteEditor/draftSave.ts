import type { WebsiteDesignSettings, WebsiteSectionAppearance, WebsiteSectionAppearanceEnvelope } from './types'
import { ApiError } from '../../lib/api'

/** Omitted fields stay on the server; content/appearance are complete device envelopes. */
export type WebsiteDraftChanges = {
  sectionIds?: string[]
  sections?: {
    id: string
    content?: Record<string, unknown>
    appearance?: WebsiteSectionAppearance | WebsiteSectionAppearanceEnvelope
    isEnabled?: boolean
  }[]
  designSettings?: WebsiteDesignSettings
}

export function retainUnsubmittedEdit<T>(current: T, submitted: T): T | null {
  return current === submitted ? null : current
}

export function draftSaveError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) return 'Another tab or session saved newer changes. Your local edits have been kept. Reloading discards unsaved edits. Copy them before reloading.'
    const issues = Object.entries(error.validationErrors).map(([field, messages]) => `${field}: ${messages.join(' ')}`)
    return issues.length ? issues.join(' ') : error.message
  }
  return 'Unable to save the draft. Your local edits have been kept. Please try again.'
}
