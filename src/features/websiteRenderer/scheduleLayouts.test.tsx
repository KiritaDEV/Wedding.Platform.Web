import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ScheduleElementRenderer } from './ScheduleElementRenderer'
import { ScheduleLayoutEditor } from '../websiteEditor/components/ScheduleLayoutEditor'
import { scheduleElementSchema } from '../websiteElements/schemas'
import { scheduleLayoutAppearanceSchema } from '../websiteElements/scheduleAppearance'
import type { ScheduleElement } from '../websiteElements/types'
import type { TemplateDesignLibrary } from '../websiteCapabilities/types'
import type { BlankContent } from '../websiteEditor/types'
import type { RenderableWebsite, WebsiteSection } from '../websiteEditor/types'
import { WebsiteRenderer } from './WebsiteRenderer'
import site from '../publicEventSite/fixtures/published-public-site.json'
import { optInSchedule, ownerElements, resolveSchedule, type SharedContentOwner } from '../websiteEditor/sharedContent'
import { createCustomSectionComposition, removeCustomSectionComposition } from '../websiteEditor/compositionLifecycle'
import { duplicateSectionElement, updateSectionElement } from '../websiteEditor/sectionChildFlow'
import { replaceEditedScopedComposition } from '../websiteEditor/editorComposition'
const activity = { id: 'activity', title: 'Ceremony', startTime: '15:30', endTime: '16:30', description: 'First line\nSecond line', location: 'Garden', mapUrl: 'https://maps.apple.com/?q=garden', imageMediaId: null, visible: true }
const days = [{ id: 'day', date: null, title: null, visible: true, activities: [activity, { ...activity, id: 'activity2', title: 'Reception' }] }]
const element: ScheduleElement = { id: 'placement', editorName: 'Schedule', type: 'schedule', days }
const library = site.data.website.template.capabilities.designLibrary as unknown as TemplateDesignLibrary
const html = (appearance: ScheduleElement['appearance']) => renderToStaticMarkup(<ScheduleElementRenderer element={{ ...element, appearance }} mode="public" templateKey="classic-filipiniana-v1" />)
describe('Schedule placement layouts', () => {
  it('defaults to List without writing defaults or content', () => {
    expect(html(undefined)).toContain('data-schedule-layout="list"')
    expect(html(undefined)).toContain('data-schedule-time-position="left"')
    expect(scheduleElementSchema.parse(element).appearance).toBeUndefined()
    expect(scheduleElementSchema.parse({ ...element, appearance: { timeline: {} } }).appearance).toBeUndefined()
    expect(element.days).toEqual(days)
  })
  it.each(['dot', 'number', 'minimal'] as const)('renders Timeline marker %s in both arrangements', (marker) => {
    for (const arrangement of ['left', 'alternating'] as const) {
      const markup = html({ layout: 'timeline', timeline: { marker, arrangement, lineWidth: 2 } })
      expect(markup).toContain(`data-schedule-arrangement="${arrangement}"`)
      expect(markup).toContain(`data-schedule-marker="${marker}"`)
      expect(markup).toContain('aria-hidden="true"')
      expect(markup.indexOf('Ceremony')).toBeLessThan(markup.indexOf('Reception'))
      if (marker === 'number') expect(markup).toContain('>2</span>')
    }
  })
  it.each(['left', 'above'] as const)('renders List time %s and adjustable separation/spacing', (timePosition) => {
    const markup = html({ layout: 'list', rowSpacing: 'l', list: { timePosition, separation: 'none' } })
    expect(markup).toContain(`data-schedule-time-position="${timePosition}"`)
    expect(markup).toContain('--schedule-row-spacing:1.5rem')
    expect(markup).toContain('data-schedule-separation="none"')
  })
  it.each(['single', 'grid'] as const)('renders Cards %s with sparse surface settings', (columns) => {
    const markup = html({ layout: 'cards', cards: { columns, gap: 's', padding: 'l', borderWidth: 0, radius: 'l', alignment: 'center' } })
    expect(markup).toContain(`data-schedule-columns="${columns}"`)
    expect(markup).toContain('--schedule-card-gap:0.5rem')
    expect(markup).toContain('--schedule-card-border-width:0px')
    expect(markup).toContain('--schedule-card-alignment:center')
  })
  it.each(['timeline', 'list', 'cards'] as const)('preserves filtering, heading rules, multiline descriptions and links in %s', (layout) => {
    const visible = { ...days[0], id: 'day2', activities: [{ ...activity, id: 'second' }] }
    const filtered = { ...days[0], id: 'hidden', visible: false }
    const markup = renderToStaticMarkup(<ScheduleElementRenderer element={{ ...element, appearance: { layout }, days: [filtered, { ...days[0], activities: [...days[0].activities, { ...activity, id: 'untitled', title: ' ' }] }, visible] }} mode="public" templateKey="classic-filipiniana-v1" />)
    expect(markup).toContain('Day 1'); expect(markup).toContain('Day 2'); expect(markup).not.toContain('Day 3')
    expect(markup).toContain('First line\nSecond line'); expect(markup).toContain('noopener noreferrer')
    expect(markup).toContain('3:30 PM'); expect(markup).toContain('4:30 PM')
    expect(html({ layout })).not.toContain('<h3')
  })
  it.each([{ layout: 'bad' }, { timeline: { marker: 'image' } }, { timeline: { lineWidth: '1' } }, { cards: { columns: 'three' } }, { cards: { borderWidth: -1 } }, { cards: { padding: 'huge' } }, { cards: { secret: true } }, { list: { timePosition: 'right' } }, { layout: null }])('rejects malformed appearance %j', (appearance) => expect(scheduleLayoutAppearanceSchema.safeParse(appearance).success).toBe(false))
  it.each(['timeline', 'list', 'cards'] as const)('shows only relevant inspector controls for %s', (layout) => {
    const markup = renderToStaticMarkup(<ScheduleLayoutEditor element={{ ...element, appearance: { layout } }} library={library} projectColors={[]} onAddColor={async () => { throw new Error('unused') }} onChange={() => {}} />)
    expect(markup).toContain('Schedule Layout')
    expect(markup.includes('Schedule Arrangement')).toBe(layout === 'timeline')
    expect(markup.includes('Schedule Time position')).toBe(layout === 'list')
    expect(markup.includes('Schedule Card padding')).toBe(layout === 'cards')
  })
  it('keeps content shared and placement appearance independent during customization, reset and duplication', () => {
    const owner = optInSchedule({ compositions: { shared: { childFlow: { elements: [{ ...element, appearance: { layout: 'timeline' } }], order: [{ kind: 'element', id: element.id }] } } } }, element.id)
    const customized = createCustomSectionComposition({ semantic: {}, ...owner }, 'mobile') as unknown as SharedContentOwner
    const mobile = ownerElements(customized).find((value) => value.type === 'schedule' && value.id !== element.id)!
    const next = replaceEditedScopedComposition({ semantic: {}, ...customized } as BlankContent, { kind: 'custom', viewport: 'mobile' }, { childFlow: updateSectionElement(customized.compositions.custom!.mobile!.childFlow, { ...mobile, appearance: { layout: 'cards' } } as ScheduleElement) }) as unknown as SharedContentOwner
    expect(next.sharedContentDefinitions).toEqual(owner.sharedContentDefinitions)
    const schedules = ownerElements(next).filter((value) => value.type === 'schedule')
    expect(schedules.map(({ appearance }) => appearance?.layout)).toEqual(['timeline', 'cards'])
    expect(schedules.map((value) => resolveSchedule(value, next.sharedContentDefinitions).days)).toEqual([days, days])
    expect(removeCustomSectionComposition({ semantic: {}, ...next }, 'mobile')).toEqual({ semantic: {}, ...owner })
    const duplicate = duplicateSectionElement(next.compositions.shared.childFlow, element.id)!
    const copied = replaceEditedScopedComposition({ semantic: {}, ...next }, { kind: 'shared' }, { childFlow: duplicate.flow }) as unknown as SharedContentOwner
    const copy = ownerElements(copied).find(({ id }) => id === duplicate.elementId)!
    if (copy.type !== 'schedule') throw new Error('Expected copied Schedule')
    copy.appearance = { layout: 'list' }
    expect((ownerElements(copied)[0] as ScheduleElement).appearance).toMatchObject({ layout: 'timeline' })
  })
  it.each(['timeline', 'list', 'cards'] as const)('renders %s through actual Hero, Blank and nested Group paths in all previews and audiences', (layout) => {
    for (const mode of ['editor', 'public'] as const) for (const viewport of ['desktop', 'tablet', 'mobile'] as const) {
      const website = structuredClone(site.data.website) as unknown as RenderableWebsite
      const hero = website.sections[0]
      const owner = optInSchedule({ compositions: { shared: { childFlow: { elements: [{ ...element, appearance: { layout, timeFormat: '24-hour', showDescriptions: false, contentWidth: 'narrow', typography: { activityTitle: { fontSize: 'l', fontWeight: 400 } } } }], order: [{ kind: 'element', id: element.id }] } } } }, element.id)
      const placement = owner.compositions.shared.childFlow.elements[0] as ScheduleElement
      owner.compositions.shared.childFlow.elements = [{ id: 'group', editorName: 'Group', type: 'compositionGroup', children: [{ id: 'nested', editorName: 'Nested Group', type: 'compositionGroup', children: [placement] }] }]
      owner.compositions.shared.childFlow.order = [{ kind: 'element', id: 'group' }]
      hero.content = { semantic: {}, ...owner }
      const blank = { ...structuredClone(hero), id: 'blank-test', type: 'blank', sortOrder: 1 } as WebsiteSection
      website.sections = [hero, blank]
      for (const audience of ['public-site', 'private-site'] as const) {
        const markup = renderToStaticMarkup(<WebsiteRenderer website={website} event={{ ...site.data.event, type: 'wedding' }} mode={mode} targetViewport={viewport} audience={audience} />)
        expect(markup.match(new RegExp(`data-schedule-layout="${layout}"`, 'g'))).toHaveLength(2)
        expect(markup).toContain('font-size:1.5rem')
        expect(markup).toContain('font-weight:400')
        expect(markup).toContain('max-width:32rem')
        expect(markup).toContain('>15:30</time>')
        expect(markup).not.toContain('First line')
      }
    }
  })
})
