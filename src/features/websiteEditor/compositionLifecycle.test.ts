import { describe, expect, it } from 'vitest'
import type { BlankContent, HeroContent, WebsiteSection, WebsiteSectionAppearanceEnvelope } from './types'
import { createCustomSectionComposition, createCustomSectionPresentation, getSectionCompositionStatus, removeCustomSectionComposition, removeCustomSectionPresentation } from './compositionLifecycle'

const shared = { childFlow: { elements: [{ id: 'group', type: 'compositionGroup' as const, editorName: 'Group 1', children: [
  { id: 'media', type: 'media' as const, editorName: 'Media 1', items: [{ id: 'media-item', type: 'image' as const, mediaId: '01MEDIAASSET00000000000000', alt: 'Photo' }], appearance: { responsive: { mobile: { outerSpacing: { top: 'm' as const } } } } },
  { id: 'accordion', type: 'accordion' as const, editorName: 'Accordion 1', items: [{ id: 'accordion-item', title: 'A', content: 'B' }] },
  { id: 'schedule', type: 'schedule' as const, editorName: 'Schedule 1', items: [{ id: 'schedule-item', time: '10:00', title: 'Ceremony' }] },
  { id: 'people', type: 'people' as const, editorName: 'People 1', groups: [{ id: 'people-group', name: 'Family', people: [{ id: 'person', name: 'Neil', media: { assetId: '01MEDIAASSET00000000000000' } }] }] },
] }], order: [{ kind: 'element' as const, id: 'group' }] } }

describe('custom composition lifecycle', () => {
  it('deep copies and resets composition and Section appearance as one target presentation', () => {
    const content = { semantic: {}, compositions: { shared } } as BlankContent
    const appearance: WebsiteSectionAppearanceEnvelope = { shared: { headingAlignment: 'inherit', bodyAlignment: 'inherit', backgroundTreatment: 'custom', emphasis: 'inherit', decorativeAppearance: { background: { texture: 'grain', textureStrength: 45 } } } }
    const customized = createCustomSectionPresentation(content, appearance, 'mobile')
    customized.appearance.custom!.mobile!.decorativeAppearance!.background!.textureStrength = 70
    expect(customized.appearance.shared.decorativeAppearance!.background!.textureStrength).toBe(45)
    expect(customized.content.compositions.custom!.mobile).toBeDefined()
    const reset = removeCustomSectionPresentation(customized.content, customized.appearance, 'mobile')
    expect(reset.content.compositions.custom).toBeUndefined()
    expect(reset.appearance.custom).toBeUndefined()
  })
  it.each(['desktop', 'tablet', 'mobile'] as const)('creates %s from shared with fresh owned identities', (viewport) => {
    const content = { semantic: { marker: 'keep' }, compositions: { shared } } as unknown as BlankContent
    const next = createCustomSectionComposition(content, viewport)
    const copy = next.compositions.custom![viewport]!
    expect(copy.childFlow.elements[0].id).not.toBe('group')
    expect(copy.childFlow.order[0]).toEqual({ kind: 'element', id: copy.childFlow.elements[0].id })
    expect(JSON.stringify(copy)).toContain('01MEDIAASSET00000000000000')
    expect(JSON.stringify(copy)).not.toContain('"media-item"')
    expect(JSON.stringify(copy)).not.toContain('"accordion-item"')
    expect(JSON.stringify(copy)).not.toContain('"schedule-item"')
    expect(JSON.stringify(copy)).not.toContain('"people-group"')
    expect(JSON.stringify(copy)).not.toContain('"person"')
    expect(copy.childFlow.elements[0]).toMatchObject({ editorName: 'Group 1' })
    expect(JSON.stringify(copy)).not.toContain('responsive')
    expect(JSON.stringify(copy)).not.toContain('outerSpacing')
    expect(next.semantic).toEqual(content.semantic)
    const copiedGroup = copy.childFlow.elements[0]
    if (copiedGroup.type !== 'compositionGroup' || copiedGroup.children[0]?.type !== 'media' || copiedGroup.children[0].items[0]?.type !== 'image') throw new Error('Expected copied Group media fixture.')
    copiedGroup.children[0].items[0].alt = 'Changed only in custom'
    const sharedGroup = content.compositions.shared.childFlow.elements[0]
    if (sharedGroup.type !== 'compositionGroup' || sharedGroup.children[0]?.type !== 'media' || sharedGroup.children[0].items[0]?.type !== 'image') throw new Error('Expected shared Group media fixture.')
    expect(sharedGroup.children[0].items[0].alt).toBe('Photo')
  })

  it('canonicalizes direct and nested Text runs while creating a custom composition', () => {
    const content = { semantic: {}, compositions: { shared: { childFlow: {
      elements: [
        { id: 'direct', type: 'text', editorName: 'Text 1', document: { type: 'doc', children: [{ type: 'paragraph', children: [{ text: 'Direct', marks: { bold: true, italic: false }, editorMetadata: true }] }] } },
        { id: 'group', type: 'compositionGroup', editorName: 'Group 1', children: [
          { id: 'nested', type: 'text', editorName: 'Text 2', document: { type: 'doc', children: [{ type: 'paragraph', children: [{ text: 'Nested', marks: { underline: true, strikethrough: false }, editorMetadata: true }] }] } },
        ] },
      ],
      order: [{ kind: 'element', id: 'direct' }, { kind: 'element', id: 'group' }],
    } } } } as unknown as BlankContent

    const custom = createCustomSectionComposition(content, 'tablet').compositions.custom!.tablet!
    const direct = custom.childFlow.elements[0]
    const group = custom.childFlow.elements[1]

    expect(direct.type === 'text' ? direct.document.children[0].children : null).toEqual([{ text: 'Direct', marks: { bold: true } }])
    expect(group.type === 'compositionGroup' && group.children[0]?.type === 'text' ? group.children[0].document.children[0].children : null).toEqual([{ text: 'Nested', marks: { underline: true } }])
    expect(content.compositions.shared.childFlow.elements[0]).toHaveProperty('document.children.0.children.0.editorMetadata', true)
  })

  it('always copies shared and preserves unrelated customs', () => {
    const desktop = { childFlow: { elements: [], order: [] } }
    const content = { semantic: {}, compositions: { shared, custom: { desktop } } } as BlankContent
    const next = createCustomSectionComposition(content, 'mobile')
    expect(next.compositions.custom!.desktop).toEqual(desktop)
    expect(next.compositions.custom!.mobile!.childFlow.elements).toHaveLength(1)
    expect(() => createCustomSectionComposition(next, 'desktop')).toThrow(/already/)
  })

  it('removes only the exact target and cleans an empty custom container', () => {
    const desktop = { childFlow: { elements: [], order: [] } }
    const mobile = { childFlow: { elements: [], order: [] } }
    const content = { semantic: { keep: true }, compositions: { shared, custom: { desktop, mobile } } } as unknown as BlankContent
    const withoutDesktop = removeCustomSectionComposition(content, 'desktop')
    expect(withoutDesktop.compositions.shared).toEqual(shared)
    expect(withoutDesktop.compositions.custom).toEqual({ mobile })
    expect(withoutDesktop.semantic).toEqual(content.semantic)
    expect(removeCustomSectionComposition(withoutDesktop, 'mobile').compositions.custom).toBeUndefined()
    expect(() => removeCustomSectionComposition(content, 'tablet')).toThrow(/does not have/)
  })

  it('derives exact-target status and preserves Hero semantic media', () => {
    const content = { semantic: {}, compositions: { shared, custom: { mobile: { childFlow: { elements: [], order: [] } } } } } as HeroContent
    const section = { type: 'hero', content, appearance: { shared: { backgroundMedia: { assetId: '01MEDIAASSET00000000000000' } }, custom: { mobile: { backgroundMedia: { assetId: '01MEDIAASSET00000000000000' } } } } } as WebsiteSection
    expect(getSectionCompositionStatus(section, 'mobile')).toEqual({ source: 'custom', targetViewport: 'mobile' })
    expect(getSectionCompositionStatus(section, 'tablet')).toEqual({ source: 'shared', targetViewport: 'tablet' })
    const reset = removeCustomSectionComposition(content, 'mobile')
    expect(reset.semantic).toEqual(content.semantic)
  })
})
