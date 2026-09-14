import { describe, expect, it } from 'vitest'
import { blankContentSchema } from './schemas'
import { listSectionCompositions, resolveSectionComposition, supportsSectionCompositions } from './sectionComposition'
import type { WebsiteSection } from './types'

const composition = (id?: string) => ({ childFlow: { elements: id ? [{ id, type: 'text' as const, editorName: 'Text 1', document: { type: 'doc' as const, children: [{ type: 'paragraph' as const, children: [{ text: id }] }] } }] : [], order: id ? [{ kind: 'element' as const, id }] : [] } })

describe('Section composition persistence', () => {
  it('accepts shared and complete sibling custom branches', () => {
    const content = { semantic: {}, compositions: { shared: composition('shared'), custom: { desktop: composition('desktop'), tablet: composition('tablet'), mobile: composition('mobile') } } }
    expect(blankContentSchema.parse(content)).toEqual(content)
  })

  it('enumerates shared and only present custom branches in canonical order', () => {
    const section = { type: 'blank', content: { semantic: {}, compositions: { shared: composition('shared'), custom: { mobile: composition('mobile'), desktop: composition('desktop') } } } } as WebsiteSection
    expect(listSectionCompositions(section)).toEqual([
      { scope: { kind: 'shared' }, composition: composition('shared') },
      { scope: { kind: 'custom', viewport: 'desktop' }, composition: composition('desktop') },
      { scope: { kind: 'custom', viewport: 'mobile' }, composition: composition('mobile') },
    ])
    expect(listSectionCompositions({ type: 'gallery', content: { semantic: { heading: '', items: [] } } } as WebsiteSection)).toEqual([])
  })

  it('rejects unknown devices, malformed branches, and duplicate owned identities', () => {
    expect(blankContentSchema.safeParse({ semantic: {}, compositions: { shared: composition(), custom: { watch: composition() } } }).success).toBe(false)
    expect(blankContentSchema.safeParse({ semantic: {}, compositions: { shared: composition(), custom: { mobile: {} } } }).success).toBe(false)
    expect(blankContentSchema.safeParse({ semantic: {}, compositions: { shared: composition('same'), custom: { mobile: composition('same') } } }).success).toBe(false)
  })

  it('resolves only the exact target custom branch and returns source metadata without mutation', () => {
    const customs = { desktop: composition('desktop'), tablet: composition('tablet'), mobile: composition('mobile') }
    const section = { type: 'blank', content: { semantic: {}, compositions: { shared: composition('shared'), custom: customs } } } as WebsiteSection
    const before = structuredClone(section)
    for (const viewport of ['desktop', 'tablet', 'mobile'] as const) {
      expect(resolveSectionComposition(section, viewport)).toEqual({ composition: customs[viewport], targetViewport: viewport, source: 'custom', customViewport: viewport })
    }
    expect(section).toEqual(before)
  })

  it.each([
    ['desktop', 'desktop', 'custom'], ['desktop', 'tablet', 'shared'], ['desktop', 'mobile', 'shared'],
    ['tablet', 'desktop', 'shared'], ['tablet', 'tablet', 'custom'], ['tablet', 'mobile', 'shared'],
    ['mobile', 'desktop', 'shared'], ['mobile', 'tablet', 'shared'], ['mobile', 'mobile', 'custom'],
  ] as const)('with only %s custom, target %s resolves %s', (customViewport, targetViewport, source) => {
    const section = { type: 'blank', content: { semantic: {}, compositions: { shared: composition('shared'), custom: { [customViewport]: composition(customViewport) } } } } as WebsiteSection
    const resolved = resolveSectionComposition(section, targetViewport)
    expect(resolved.source).toBe(source)
    expect(resolved.targetViewport).toBe(targetViewport)
    expect(resolved.composition).toEqual(composition(source === 'custom' ? customViewport : 'shared'))
  })

  it.each(['desktop', 'tablet', 'mobile'] as const)('resolves shared-only content for %s', (targetViewport) => {
    const section = { type: 'hero', content: { semantic: {}, compositions: { shared: composition('shared') } } } as WebsiteSection
    expect(resolveSectionComposition(section, targetViewport)).toEqual({ composition: composition('shared'), targetViewport, source: 'shared' })
  })

  it('rejects semantic-only Sections explicitly', () => {
    expect(() => resolveSectionComposition({ type: 'gallery', content: { semantic: { heading: '', items: [] } } } as WebsiteSection, 'mobile')).toThrow(/does not support compositions/)
  })

  it('centrally distinguishes composition Sections from semantic-only functional Sections', () => {
    expect(supportsSectionCompositions({ type: 'hero' })).toBe(true)
    expect(supportsSectionCompositions({ type: 'blank' })).toBe(true)
    expect(supportsSectionCompositions({ type: 'gallery' })).toBe(false)
    expect(supportsSectionCompositions({ type: 'rsvp' })).toBe(false)
  })
})
