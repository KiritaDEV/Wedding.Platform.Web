import type { WebsiteRendererProps } from './types'

export function sectionsForAudience<T extends { type: string }>(sections: T[], audience: WebsiteRendererProps['audience']): T[] {
  return audience === 'public-site' ? sections.filter(({ type }) => type !== 'rsvp') : sections
}
