import type { BlankContent, HeroContent, ResponsiveViewport, SectionComposition, WebsiteSection } from './types'

export type PersistedSectionComposition = {
  scope: { kind: 'shared' } | { kind: 'custom'; viewport: ResponsiveViewport }
  composition: SectionComposition
}

export function supportsSectionCompositions(section: Pick<WebsiteSection, 'type'>): boolean {
  return section.type === 'hero' || section.type === 'blank'
}

export function listSectionCompositions(section: WebsiteSection): PersistedSectionComposition[] {
  if (!supportsSectionCompositions(section)) return []
  const compositions = (section.content as HeroContent | BlankContent).compositions
  const branches: PersistedSectionComposition[] = [{ scope: { kind: 'shared' }, composition: compositions.shared }]
  for (const viewport of ['desktop', 'tablet', 'mobile'] as const) {
    const composition = compositions.custom?.[viewport]
    if (composition) branches.push({ scope: { kind: 'custom', viewport }, composition })
  }
  return branches
}

export type ResolvedSectionComposition = {
  composition: SectionComposition
  targetViewport: ResponsiveViewport
  source: 'shared' | 'custom'
  customViewport?: ResponsiveViewport
}

export function resolveSectionComposition(section: WebsiteSection, targetViewport: ResponsiveViewport): ResolvedSectionComposition {
  if (!supportsSectionCompositions(section)) {
    throw new Error(`Section type [${section.type}] does not support compositions.`)
  }
  const compositions = (section.content as HeroContent | BlankContent).compositions
  const custom = compositions.custom?.[targetViewport]
  return custom
    ? { composition: custom, targetViewport, source: 'custom', customViewport: targetViewport }
    : { composition: compositions.shared, targetViewport, source: 'shared' }
}
