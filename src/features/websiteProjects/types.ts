import type { WebsiteDesignSettings } from '../websiteEditor/types'

export type WebsiteProjectSummary = {
  id: string
  eventId: string
  name: string
  templateKey: string
  designSettings: WebsiteDesignSettings
  isPublished: boolean
}

export type CreateWebsiteProjectInput = {
  name: string
  templateKey: string
}
