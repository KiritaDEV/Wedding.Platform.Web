import type { ResponsiveViewport, SectionComposition, SectionCompositions, WebsiteSection, WebsiteSectionAppearanceEnvelope } from './types'
import { canonicalizeSectionChildFlowText, regenerateSectionCompositionIdentities } from './sectionChildFlow'
import { resolveSectionComposition } from './sectionComposition'
import { assertPairedSectionPresentation } from './sectionAppearance'

export type ComposableContent = Record<string, unknown> & { compositions: SectionCompositions }

export function getSectionCompositionStatus(section: WebsiteSection, targetViewport: ResponsiveViewport) {
  assertPairedSectionPresentation(section)
  const resolved = resolveSectionComposition(section, targetViewport)
  return { source: resolved.source, targetViewport }
}

export function createCustomSectionComposition(content: ComposableContent, targetViewport: ResponsiveViewport): ComposableContent {
  if (content.compositions.custom?.[targetViewport]) throw new Error(`${targetViewport} already has a custom composition.`)
  const next = structuredClone(content)
  next.compositions.custom ??= {}
  const custom = stripResponsiveState(regenerateSectionCompositionIdentities(next.compositions.shared))
  custom.childFlow = canonicalizeSectionChildFlowText(custom.childFlow)
  next.compositions.custom[targetViewport] = custom
  return next
}

export function createCustomSectionPresentation(content: ComposableContent, appearance: WebsiteSectionAppearanceEnvelope, targetViewport: ResponsiveViewport) {
  const nextContent = createCustomSectionComposition(content, targetViewport)
  if (appearance.custom?.[targetViewport]) throw new Error(`${targetViewport} already has a custom appearance.`)
  const nextAppearance = structuredClone(appearance)
  nextAppearance.custom = { ...nextAppearance.custom, [targetViewport]: stripResponsiveState(structuredClone(nextAppearance.shared)) }
  return { content: nextContent, appearance: nextAppearance }
}

export function removeCustomSectionComposition(content: ComposableContent, targetViewport: ResponsiveViewport): ComposableContent {
  if (!content.compositions.custom?.[targetViewport]) throw new Error(`${targetViewport} does not have a custom composition.`)
  const next = structuredClone(content)
  delete next.compositions.custom?.[targetViewport]
  if (next.compositions.custom && Object.keys(next.compositions.custom).length === 0) delete next.compositions.custom
  return next
}

export function removeCustomSectionPresentation(content: ComposableContent, appearance: WebsiteSectionAppearanceEnvelope, targetViewport: ResponsiveViewport) {
  const nextContent = removeCustomSectionComposition(content, targetViewport)
  if (!appearance.custom?.[targetViewport]) throw new Error(`${targetViewport} does not have a custom appearance.`)
  const nextAppearance = structuredClone(appearance)
  delete nextAppearance.custom![targetViewport]
  if (Object.keys(nextAppearance.custom!).length === 0) delete nextAppearance.custom
  return { content: nextContent, appearance: nextAppearance }
}

export type { SectionComposition }
export { supportsSectionCompositions } from './sectionComposition'

function stripResponsiveState<T>(value: T): T {
  if (Array.isArray(value)) {
    value.forEach(stripResponsiveState)
    return value
  }
  if (!value || typeof value !== 'object') return value
  const record = value as Record<string, unknown>
  delete record.responsive
  Object.values(record).forEach(stripResponsiveState)
  return value
}
