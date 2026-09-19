import type { ResponsiveViewport, WebsiteSection, WebsiteSectionAppearance, WebsiteSectionAppearanceEnvelope } from './types'

export type SectionAppearanceScope = { kind: 'shared' } | { kind: 'custom'; viewport: ResponsiveViewport }

export function resolveSectionAppearance(envelope: WebsiteSectionAppearanceEnvelope, viewport: ResponsiveViewport) {
  const custom = envelope.custom?.[viewport]
  return custom
    ? { appearance: custom, scope: { kind: 'custom', viewport } as SectionAppearanceScope, source: 'custom' as const, targetViewport: viewport }
    : { appearance: envelope.shared, scope: { kind: 'shared' } as SectionAppearanceScope, source: 'shared' as const, targetViewport: viewport }
}

export function resolveOwnedSectionAppearance(appearance: WebsiteSectionAppearance | WebsiteSectionAppearanceEnvelope, viewport: ResponsiveViewport): WebsiteSectionAppearance {
  return 'shared' in appearance ? resolveSectionAppearance(appearance, viewport).appearance : appearance
}

export function replaceScopedSectionAppearance(envelope: WebsiteSectionAppearanceEnvelope, scope: SectionAppearanceScope, appearance: WebsiteSectionAppearance): WebsiteSectionAppearanceEnvelope {
  const next = structuredClone(envelope)
  if (scope.kind === 'shared') next.shared = appearance
  else next.custom = { ...next.custom, [scope.viewport]: appearance }
  return next
}

export function mergeScopedSectionAppearance(fresh: WebsiteSectionAppearanceEnvelope, scope: SectionAppearanceScope, appearance: WebsiteSectionAppearance) {
  return replaceScopedSectionAppearance(fresh, scope, appearance)
}

export function assertPairedSectionPresentation(section: Pick<WebsiteSection, 'type' | 'content' | 'appearance'>) {
  if (section.type !== 'hero' && section.type !== 'gallery' && section.type !== 'blank') return
  const content = section.content as import('./types').HeroContent | import('./types').GalleryContent | import('./types').BlankContent
  const appearance = section.appearance as WebsiteSectionAppearanceEnvelope
  for (const viewport of ['desktop', 'tablet', 'mobile'] as const) {
    if (Boolean(content.compositions.custom?.[viewport]) !== Boolean(appearance.custom?.[viewport])) throw new Error(`Section presentation has mismatched ${viewport} custom ownership.`)
  }
}
