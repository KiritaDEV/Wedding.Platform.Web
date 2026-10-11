import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import site from '../publicEventSite/fixtures/published-public-site.json'
import { decodePublishedWebsiteSnapshot } from '../websitePublishing/snapshot'
import { normalizePublicRenderableWebsiteFromApi, sectionAppearanceSchema } from '../websiteEditor/schemas'
import { mergeScopedSectionAppearance, resolveSectionAppearance } from '../websiteEditor/sectionAppearance'
import { createCustomSectionPresentation, type ComposableContent } from '../websiteEditor/compositionLifecycle'
import type { WebsiteSection, WebsiteSectionAppearance, WebsiteSectionAppearanceEnvelope } from '../websiteEditor/types'
import { heroUsableMinimumHeight, setRootVerticalDistribution } from './rootFlowDistribution'
import { HeroSectionRenderer } from './HeroSectionRenderer'
import { SectionRootFlow } from './SectionRootFlow'

const base: WebsiteSectionAppearance = { headingAlignment: 'inherit', bodyAlignment: 'inherit', backgroundTreatment: 'inherit', emphasis: 'inherit' }
const text = (id: string, value = 'Names') => ({ id, type: 'text' as const, editorName: id, document: { type: 'doc' as const, children: [{ type: 'paragraph' as const, children: [{ text: value }] }] } })
const group = (id: string) => ({ id, type: 'compositionGroup' as const, editorName: id, children: [text(`${id}-text`)], appearance: { outerSpacing: { top: 's' as const, bottom: 'm' as const } } })
const library = { colors: [], fontFamilies: [], palettePresets: [], typographyPresets: [] } as never

describe('Hero root vertical distribution', () => {
  it.each([
    ['omitted', undefined, '0px - 0px'],
    ['empty', {}, '0px - 0px'],
    ['none/none', { top: 'none', bottom: 'none' }, '0px - 0px'],
    ['none top', { top: 'none', bottom: 'l' }, '0px - 1.5rem'],
    ['none bottom', { top: 'xl', bottom: 'none' }, '2rem - 0px'],
    ['nonzero', { top: 'xl', bottom: 'l' }, '2rem - 1.5rem'],
  ] as const)('uses CSS lengths for %s vertical spacing', (_label, spacing, operands) => {
    expect(heroUsableMinimumHeight({ unit: 'svh', value: 100 }, spacing ?? {}))
      .toBe(`max(0px, calc(100svh - ${operands}))`)
  })

  it('defaults to the unchanged packed markup and preserves explicit packed compatibility', () => {
    const composition = { childFlow: { elements: [group('top'), group('bottom')], order: ['top', 'bottom'].map(id => ({ kind: 'element' as const, id })) } }
    const render = (appearance: WebsiteSectionAppearance) => renderToStaticMarkup(<HeroSectionRenderer section={{ id: 'hero', type: 'hero', appearance } as unknown as WebsiteSection} composition={composition} mode="public" viewport="mobile" templateKey="classic-filipiniana-v1" library={library} projectColors={[]} media={{}} eventDate={null} />)
    expect(render(base)).toBe(render({ ...base, rootVerticalDistribution: 'packed' }))
    expect(render(base)).not.toContain('justify-content:space-between')
    expect(render({ ...base, rootVerticalDistribution: 'space-between', height: { unit: 'svh', value: 100 }, innerSpacing: { top: 'xl', bottom: 'l' } })).toContain('max(0px, calc(100svh - 2rem - 1.5rem))')
  })

  it('rejects malformed values and authors Packed sparsely without losing spacing', () => {
    for (const rootVerticalDistribution of [null, 1, {}, 'evenly', 'SPACE-BETWEEN']) expect(sectionAppearanceSchema.safeParse({ ...base, rootVerticalDistribution }).success).toBe(false)
    for (const rootVerticalDistribution of ['packed', 'space-between']) expect(sectionAppearanceSchema.safeParse({ ...base, rootVerticalDistribution }).success).toBe(true)
    const spaced = { ...base, innerSpacing: { top: 'xl' as const } }
    expect(setRootVerticalDistribution(setRootVerticalDistribution(spaced, 'space-between'), 'packed')).toEqual(spaced)
    expect(heroUsableMinimumHeight(undefined, {})).toBeUndefined()
  })

  it('rejects the property on non-Hero saved and guest contracts', () => {
    for (const type of ['gallery', 'rsvp', 'blank']) {
      const input = structuredClone(site.data.website)
      const section = input.sections.find(item => item.type === type) ?? input.sections[0]
      Object.assign(section, { type, appearance: { shared: { ...base, rootVerticalDistribution: 'space-between' } } })
      expect(() => normalizePublicRenderableWebsiteFromApi(input)).toThrow()
    }
  })

  it('filters empty/hidden roots before counting, with equal editor/public distribution', () => {
    const elements = [group('top'), { ...group('hidden'), isHidden: true }, { ...group('empty'), children: [] }, text('blank', '  '), group('bottom')]
    const composition = { childFlow: { elements, order: elements.map(({ id }) => ({ kind: 'element' as const, id })) } }
    for (const mode of ['editor', 'public'] as const) {
      const html = renderToStaticMarkup(<HeroSectionRenderer section={{ id: 'hero', type: 'hero', appearance: { ...base, rootVerticalDistribution: 'space-between' } } as unknown as WebsiteSection} composition={composition} mode={mode} viewport="desktop" templateKey="classic-filipiniana-v1" library={library} projectColors={[]} media={{}} eventDate={null} />)
      expect(html).toContain('justify-content:space-between')
      for (const id of ['hidden', 'empty', 'blank']) expect(html).not.toContain(`data-section-child-element="${id}"`)
      expect(html).toContain('padding-top:0.5rem')
      expect(html).toContain('padding-bottom:1rem')
    }
    const one = renderToStaticMarkup(<SectionRootFlow distribution="space-between" packedJustification="flex-end">{[null, <div key="one">One</div>, null]}</SectionRootFlow>)
    expect(one).toContain('justify-content:flex-end')
    expect(one).not.toContain('justify-content:space-between')
    const normal = renderToStaticMarkup(<SectionRootFlow><div>Other Section</div></SectionRootFlow>)
    expect(normal).not.toContain('min-height')
    expect(normal).not.toContain('justify-content')
  })

  it('keeps copied and edited custom owners separate from Shared and sibling devices', () => {
    const content = { semantic: {}, compositions: { shared: { childFlow: { elements: [text('shared')], order: [{ kind: 'element' as const, id: 'shared' }] } } } }
    const envelope: WebsiteSectionAppearanceEnvelope = { shared: { ...base, rootVerticalDistribution: 'space-between' }, custom: { tablet: base } }
    const custom = createCustomSectionPresentation(content, envelope, 'mobile')
    expect(custom.appearance.custom?.mobile?.rootVerticalDistribution).toBe('space-between')
    const updated = mergeScopedSectionAppearance(custom.appearance, { kind: 'custom', viewport: 'mobile' }, setRootVerticalDistribution(resolveSectionAppearance(custom.appearance, 'mobile').appearance, 'packed'))
    expect(updated.shared.rootVerticalDistribution).toBe('space-between')
    expect(updated.custom?.tablet).toEqual(base)
    expect(updated.custom?.mobile?.rootVerticalDistribution).toBeUndefined()
    expect(envelope.custom?.mobile).toBeUndefined()
  })

  it('decodes old snapshots and retains Shared/custom distribution through JSON serialization', () => {
    const { media, ...website } = structuredClone(site.data.website)
    void media
    const input = { project: { id: website.id, eventId: site.data.event.id, name: 'Website' }, event: { ...site.data.event, startsAtUtc: null }, website, mediaAssetIds: [], sharedContentDefinitions: [] }
    expect(decodePublishedWebsiteSnapshot(input).website.sections[0].appearance).toEqual(website.sections[0].appearance)
    const hero = website.sections[0]
    const custom = createCustomSectionPresentation(hero.content as unknown as ComposableContent, hero.appearance as WebsiteSectionAppearanceEnvelope, 'mobile')
    Object.assign(hero, { content: custom.content, appearance: mergeScopedSectionAppearance(custom.appearance, { kind: 'custom', viewport: 'mobile' }, { ...base, rootVerticalDistribution: 'space-between' }) })
    const decoded = decodePublishedWebsiteSnapshot(JSON.stringify(input))
    const appearance = decoded.website.sections[0].appearance as WebsiteSectionAppearanceEnvelope
    expect(appearance.shared.rootVerticalDistribution).toBeUndefined()
    expect(appearance.custom?.mobile?.rootVerticalDistribution).toBe('space-between')
  })
})
