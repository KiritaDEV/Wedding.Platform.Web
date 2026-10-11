import type { ResponsiveViewport, SectionComposition, SectionCompositions, WebsiteSection } from './types'
import { resolveSectionComposition } from './sectionComposition'

export type SectionCompositionScope =
  | { kind: 'shared' }
  | { kind: 'custom'; viewport: ResponsiveViewport }

export type ResolvedEditorCompositionTarget = {
  sectionId: string
  targetViewport: ResponsiveViewport
  scope: SectionCompositionScope
  composition: SectionComposition
}

export function resolveEditorCompositionTarget(section: WebsiteSection, targetViewport: ResponsiveViewport): ResolvedEditorCompositionTarget {
  const resolved = resolveSectionComposition(section, targetViewport)
  return {
    sectionId: section.id,
    targetViewport,
    scope: resolved.source === 'custom' ? { kind: 'custom', viewport: resolved.customViewport! } : { kind: 'shared' },
    composition: resolved.composition,
  }
}

/** Authored properties always target the base of the resolved Shared/custom owner. */
export function authoredPropertyViewport(): ResponsiveViewport {
  return 'desktop'
}

export function sameCompositionScope(left: SectionCompositionScope, right: SectionCompositionScope): boolean {
  return left.kind === right.kind && (left.kind === 'shared' || (right.kind === 'custom' && left.viewport === right.viewport))
}

export function replaceScopedComposition(content: Record<string, unknown>, scope: SectionCompositionScope, composition: SectionComposition): Record<string, unknown> {
  const next = structuredClone(content) as Record<string, unknown> & { compositions: SectionCompositions }
  if (scope.kind === 'shared') next.compositions.shared = composition
  else {
    next.compositions.custom ??= {}
    next.compositions.custom[scope.viewport] = composition
  }
  return next
}

export function mergeScopedComposition(authoritativeContent: Record<string, unknown>, scope: SectionCompositionScope, workingComposition: SectionComposition): Record<string, unknown> {
  return replaceScopedComposition(authoritativeContent, scope, workingComposition)
}
