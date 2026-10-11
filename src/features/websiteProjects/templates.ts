import type { WebsiteTemplateOption } from '../websiteTemplates/types'

export function websiteTemplateDisplayName(templates: WebsiteTemplateOption[], templateKey: string): string {
  return templates.find(({ key }) => key === templateKey)?.displayName ?? templateKey
}
