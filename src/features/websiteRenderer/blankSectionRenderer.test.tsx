import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { WebsiteDraft, WebsiteSection, WebsiteSectionAppearance } from '../websiteEditor/types'
import { ClassicFilipinianaRenderer } from './templates/ClassicFilipinianaRenderer'
import { ModernEditorialRenderer } from './templates/ModernEditorialRenderer'

const event = { id: 'event', name: 'Alex & Sam', eventDate: '2027-01-02', type: 'wedding' as const }

function blank(content: Record<string, unknown>, backgroundTreatment: 'inherit' | 'accent' = 'inherit'): WebsiteSection {
  return {
    id: 'blank-id', type: 'blank', displayName: 'Section', editorName: 'Private planning notes', sortOrder: 10, isEnabled: true,
    content: { semantic: {}, compositions: { shared: content } }, appearance: { shared: { headingAlignment: 'inherit', bodyAlignment: 'inherit', backgroundTreatment, emphasis: 'inherit' } },
    designDefaults: {}, resolvedDesignContext: null, appearanceOptions: null, mediaCapability: null, itemMediaCapability: null, presentationCapability: null,
  } as WebsiteSection
}

function decoratedBlank(decorativeAppearance: NonNullable<WebsiteSectionAppearance['decorativeAppearance']>): WebsiteSection {
  const section = blank({ childFlow: { elements: [], order: [] } });
  if (section.type === 'blank') section.appearance.shared.decorativeAppearance = decorativeAppearance;
  return section;
}

function draft(templateKey: 'classic-filipiniana-v1' | 'modern-editorial-v1', section: WebsiteSection): WebsiteDraft {
  return {
    schemaVersion: 5, id: 'website', eventId: 'event', name: 'Website', templateKey,
    designSettings: { colorTheme: templateKey.startsWith('classic') ? 'terracotta' : 'ink', fontSet: 'editorial', artStyle: 'clean', projectDefaults: {}, customColors: [] },
    projectDesignDefaults: null,
    template: { key: templateKey, displayName: templateKey, designOptions: { colorThemes: [], fontSets: [], artStyles: [] }, capabilities: { sections: [], elementCapabilities: [], designLibrary: { colors: [], fontFamilies: [], palettePresets: [], typographyPresets: [] } } },
    sections: [section], media: {},
  } as unknown as WebsiteDraft
}

const templates = [
  ['classic-filipiniana-v1', ClassicFilipinianaRenderer],
  ['modern-editorial-v1', ModernEditorialRenderer],
] as const

describe.each(templates)('%s Blank Section', (templateKey, Renderer) => {
  it('renders the exact target composition without cross-device fallback', () => {
    const textComposition = (id: string, text: string) => ({ childFlow: { elements: [{ id, type: 'text' as const, editorName: 'Text 1', document: { type: 'doc' as const, children: [{ type: 'paragraph' as const, children: [{ text }] }] } }], order: [{ kind: 'element' as const, id }] } })
    const section = blank(textComposition('shared', 'Shared'))
    section.content = { semantic: {}, compositions: { shared: textComposition('shared', 'Shared'), custom: { desktop: textComposition('desktop', 'Desktop'), mobile: textComposition('mobile', 'Mobile') } } }
    const render = (targetViewport: 'desktop' | 'tablet' | 'mobile') => renderToStaticMarkup(<Renderer event={event} website={draft(templateKey, section)} mode="public" targetViewport={targetViewport} />)
    expect(render('desktop')).toContain('Desktop')
    expect(render('desktop')).not.toContain('Shared')
    expect(render('tablet')).toContain('Shared')
    expect(render('tablet')).not.toContain('Desktop')
    expect(render('mobile')).toContain('Mobile')
    expect(render('mobile')).not.toContain('Shared')
  })

  it('uses the resolved composition for target-specific renderability', () => {
    const empty = { childFlow: { elements: [], order: [] } }
    const mobile = { childFlow: { elements: [{ id: 'mobile', type: 'text' as const, editorName: 'Text 1', document: { type: 'doc' as const, children: [{ type: 'paragraph' as const, children: [{ text: 'Mobile only' }] }] } }], order: [{ kind: 'element' as const, id: 'mobile' }] } }
    const section = blank(empty)
    section.content = { semantic: {}, compositions: { shared: empty, custom: { mobile } } }
    expect(renderToStaticMarkup(<Renderer event={event} website={draft(templateKey, section)} mode="public" targetViewport="desktop" />)).not.toContain('data-preview-section="blank-id"')
    expect(renderToStaticMarkup(<Renderer event={event} website={draft(templateKey, section)} mode="public" targetViewport="tablet" />)).not.toContain('data-preview-section="blank-id"')
    expect(renderToStaticMarkup(<Renderer event={event} website={draft(templateKey, section)} mode="public" targetViewport="mobile" />)).toContain('Mobile only')
  })
  it('shows a selectable editor-only empty boundary and omits a default empty public Section', () => {
    const section = blank({ childFlow: { elements: [], order: [] } })
    const editor = renderToStaticMarkup(<Renderer event={event} website={draft(templateKey, section)} mode="editor" selectedSectionId={section.id} />)
    const published = renderToStaticMarkup(<Renderer event={event} website={draft(templateKey, section)} mode="public" />)
    expect(editor).toContain('data-preview-section="blank-id"')
    expect(editor).toContain('data-empty-blank-section')
    expect(editor).toContain('Empty Section')
    expect(published).not.toContain('data-preview-section="blank-id"')
    expect(published).not.toContain('Empty Section')
    expect(published).not.toContain('Private planning notes')
  })

  it('retains an intentional empty surface and renders generic children in authoritative root order', () => {
    const emptySurface = renderToStaticMarkup(<Renderer event={event} website={draft(templateKey, blank({ childFlow: { elements: [], order: [] } }, 'accent'))} mode="public" />)
    expect(emptySurface).toContain('data-section-surface')
    const elements = [
      { id: 'second', type: 'text', editorName: 'Text 2', document: { type: 'doc' as const, children: [{ type: 'paragraph' as const, children: [{ text: 'Second'  }] }] }},
      { id: 'first', type: 'text', editorName: 'Text 1', document: { type: 'doc' as const, children: [{ type: 'paragraph' as const, children: [{ text: 'First'  }] }] }},
      { id: 'group', type: 'compositionGroup', editorName: 'Group 1', children: [{ id: 'nested', type: 'text', editorName: 'Text 1', document: { type: 'doc' as const, children: [{ type: 'paragraph' as const, children: [{ text: 'Nested' }] }] } }] },
    ]
    const content = { childFlow: { elements, order: [{ kind: 'element', id: 'first' }, { kind: 'element', id: 'group' }, { kind: 'element', id: 'second' }] } }
    const html = renderToStaticMarkup(<Renderer event={event} website={draft(templateKey, blank(content))} mode="public" />)
    expect(html).toContain('data-section-content-inset')
    expect(html).toContain('data-section-root-flow')
    expect(html.indexOf('First')).toBeLessThan(html.indexOf('Nested'))
    expect(html.indexOf('Nested')).toBeLessThan(html.indexOf('Second'))
    expect(html).not.toContain('data-section-specialized-content="true"')
    expect(html).not.toContain('Private planning notes')
  })

  it.each([
    ['custom color', { background: { customColor: '#123456' } }],
    ['texture', { background: { texture: 'paper' as const, textureStrength: 40 } }],
    ['pattern', { background: { pattern: 'botanical' as const, patternStrength: 60 } }],
    ['overlay', { background: { overlay: 'soft' as const } }],
    ['frame', { frame: { style: 'fine' as const } }],
  ])('publishes an empty Blank with authored %s through shared layout-neutral layers', (_, decorativeAppearance) => {
    const html = renderToStaticMarkup(<Renderer event={event} website={draft(templateKey, decoratedBlank(decorativeAppearance))} mode="public" />)
    expect(html).toContain('data-preview-section="blank-id"')
    expect(html).toContain('data-section-decoration')
    expect(html).toContain('pointer-events-none absolute inset-0 overflow-hidden')
    expect(html).toContain('aria-hidden="true"')
    expect(html.indexOf('data-section-decoration')).toBeLessThan(html.indexOf('data-section-content-inset'))
  })

  it('still omits an empty Blank whose authored decorative choices resolve to none', () => {
    const section = decoratedBlank({ background: { texture: 'none', pattern: 'none', overlay: 'none' }, frame: { style: 'none' } })
    expect(renderToStaticMarkup(<Renderer event={event} website={draft(templateKey, section)} mode="public" />)).not.toContain('data-preview-section="blank-id"')
  })

  it('publishes only flows with a renderable descendant', () => {
    const cases = [
      [{ id: 'hidden', type: 'text', editorName: 'Text 1', document: { type: 'doc' as const, children: [{ type: 'paragraph' as const, children: [{ text: 'Hidden' }] }] }, isHidden: true }],
      [{ id: 'media', type: 'media', editorName: 'Media 1', items: [] }],
      [{ id: 'media', type: 'media', editorName: 'Media 1', items: [{ id: 'item', type: 'image', mediaId: 'missing', alt: '' }] }],
      [{ id: 'group', type: 'compositionGroup', editorName: 'Group 1', children: [] }],
    ]
    for (const elements of cases) {
      const content = { childFlow: { elements, order: elements.map(({ id }) => ({ kind: 'element', id })) } }
      const html = renderToStaticMarkup(<Renderer event={event} website={draft(templateKey, blank(content))} mode="public" />)
      expect(html).not.toContain('data-preview-section="blank-id"')
    }
    const content = { childFlow: { elements: [{ id: 'group', type: 'compositionGroup', editorName: 'Group 1', children: [{ id: 'text', type: 'text', editorName: 'Text 1', document: { type: 'doc' as const, children: [{ type: 'paragraph' as const, children: [{ text: 'Visible'  }] }] }}] }], order: [{ kind: 'element', id: 'group' }] } }
    const html = renderToStaticMarkup(<Renderer event={event} website={draft(templateKey, blank(content))} mode="public" />)
    expect(html).toContain('Visible')
  })

  it('renders Date blocks from Event data at root, Group, and nested Group placements', () => {
    const elements = [
      { id: 'root-date', type: 'date', editorName: 'Ceremony date' },
      { id: 'outer', type: 'compositionGroup', editorName: 'Date group', children: [
        { id: 'group-date', type: 'date', editorName: 'Reception date' },
        { id: 'inner', type: 'compositionGroup', editorName: 'Nested dates', children: [
          { id: 'nested-date', type: 'date', editorName: 'Private nested name' },
        ] },
      ] },
    ]
    const content = { childFlow: { elements, order: [{ kind: 'element', id: 'root-date' }, { kind: 'element', id: 'outer' }] } }
    const html = renderToStaticMarkup(<Renderer event={event} website={draft(templateKey, blank(content))} mode="public" />)
    expect(html).toContain('<time')
    expect(html.match(/<time[^>]*dateTime="2027-01-02"/g)).toHaveLength(3)
    expect(html.match(/Saturday, January 2, 2027/g)).toHaveLength(3)
    expect(html).not.toContain('Ceremony date')
    expect(html).not.toContain('Reception date')
    expect(html).not.toContain('Private nested name')
    const updated = renderToStaticMarkup(<Renderer event={{ ...event, eventDate: '2028-02-03' }} website={draft(templateKey, blank(content))} mode="public" />)
    expect(updated).toContain('Thursday, February 3, 2028')
    expect(updated).toContain('dateTime="2028-02-03"')
    expect(content.childFlow.elements).toEqual(elements)
  })

  it('omits missing Date blocks publicly and shows the editor diagnostic', () => {
    const content = { childFlow: { elements: [{ id: 'date', type: 'date', editorName: 'Date 1' }], order: [{ kind: 'element', id: 'date' }] } }
    const noDateEvent = { ...event, eventDate: null }
    const published = renderToStaticMarkup(<Renderer event={noDateEvent} website={draft(templateKey, blank(content))} mode="public" />)
    const editor = renderToStaticMarkup(<Renderer event={noDateEvent} website={draft(templateKey, blank(content))} mode="editor" />)
    expect(published).not.toContain('data-preview-section="blank-id"')
    expect(published).not.toContain('<time')
    expect(editor).toContain('Add a wedding date in Event settings to display this block.')
    expect(editor).toContain('data-date-block-missing')
  })
})
