import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ScheduleElementRenderer } from './ScheduleElementRenderer'
import { scheduleElementSchema } from '../websiteElements/schemas'
import { SCHEDULE_TYPOGRAPHY_ROLES } from '../websiteElements/scheduleAppearance'
import { formatScheduleDate, formatScheduleTime } from '../websiteElements/scheduleFormatting'
import type { ScheduleElement } from '../websiteElements/types'
import type { TemplateDesignLibrary } from '../websiteCapabilities/types'
import site from '../publicEventSite/fixtures/published-public-site.json'
import { normalizePublicRenderableWebsiteFromApi } from '../websiteEditor/schemas'

const library = site.data.website.template.capabilities.designLibrary as unknown as TemplateDesignLibrary
const activity = { id: 'activity', title: 'Ceremony', startTime: '15:00', endTime: '16:00', description: 'Secret description', location: 'Secret location', mapUrl: 'https://maps.apple.com/?q=secret', imageMediaId: null, visible: true }
const element: ScheduleElement = { id: 'placement', type: 'schedule', editorName: 'Schedule', days: [{ id: 'day', date: '2026-10-24', title: null, visible: true, activities: [activity] }, { id: 'day2', date: null, title: null, visible: true, activities: [{ ...activity, id: 'second' }] }] }
const html = (appearance: ScheduleElement['appearance'], viewport: 'desktop' | 'tablet' | 'mobile' = 'desktop') => renderToStaticMarkup(<ScheduleElementRenderer element={{ ...element, appearance }} mode="public" viewport={viewport} templateKey="classic-filipiniana-v1" library={library} />)

describe('Schedule Phase 4', () => {
  it('validates role fonts and colors against the supplied guest Template and project color library', () => {
    const website = structuredClone(site.data.website)
    const section = website.sections[0]
    const content = { semantic: {}, compositions: { shared: { childFlow: { elements: [element], order: [{ kind: 'element', id: element.id }] } } } }
    Object.assign(section, { content })
    content.compositions.shared.childFlow.elements[0] = { ...element, appearance: { typography: { activityTitle: { fontFamilyId: 'inter', colorId: 'terracotta-text' } } } }
    expect(() => normalizePublicRenderableWebsiteFromApi(website)).not.toThrow()
    content.compositions.shared.childFlow.elements[0].appearance!.typography!.activityTitle!.colorId = 'unknown-color'
    expect(() => normalizePublicRenderableWebsiteFromApi(website)).toThrow(/Schedule colorId/)
    content.compositions.shared.childFlow.elements[0].appearance!.typography!.activityTitle!.colorId = 'terracotta-text'
    const text = website.template.capabilities.elementCapabilities.find(({ type }) => type === 'text')!
    const fonts = text.appearance!.typography.find(({ role }) => role === 'body')!
    fonts.allowedFontIds = fonts.allowedFontIds.filter((id) => id !== 'inter')
    expect(() => normalizePublicRenderableWebsiteFromApi(website)).toThrow(/Schedule fontFamilyId/)
  })
  it.each(SCHEDULE_TYPOGRAPHY_ROLES)('accepts and renders Text typography for %s', (role) => {
    const typography = { fontFamilyId: 'inter', fontSize: 'l' as const, fontWeight: 700 as const, italic: true, colorId: 'terracotta-text', alignment: 'center' as const, lineHeight: 'relaxed' as const, letterSpacing: 'wide' as const, underline: true, strikethrough: true, responsive: { mobile: { fontSize: 's' as const, alignment: 'end' as const } } }
    const appearance = { typography: { [role]: typography } }
    expect(scheduleElementSchema.safeParse({ ...element, appearance }).success).toBe(true)
    const markup = html(appearance)
    for (const style of ['font-size:1.5rem', 'font-weight:700', 'font-style:italic', 'line-height:1.75', 'letter-spacing:0.08em', 'text-align:center', 'text-decoration-line:underline line-through', 'color:#3b312d']) expect(markup).toContain(style)
    expect(html(appearance, 'mobile')).toContain('font-size:0.875rem')
    expect(html(appearance, 'mobile')).toContain('text-align:end')
    expect(html(appearance, 'tablet')).toContain('font-size:1.5rem')
  })
  it.each([{ fontFamilyId: 'unknown' }, { fontFamilyId: 'quicksand', italic: true }, { fontFamilyId: 'great-vibes', fontWeight: 700 }, { fontSize: 'huge' }, { fontWeight: '700' }, { italic: 1 }, { colorId: '' }, { lineHeight: 2 }, { responsive: { mobile: { fontWeight: 700 } } }, { secret: true }, { glow: 'soft' }])('rejects invalid role typography %j', (value) => {
    for (const role of SCHEDULE_TYPOGRAPHY_ROLES) expect(scheduleElementSchema.safeParse({ ...element, appearance: { typography: { [role]: value } } }).success).toBe(false)
  })
  it.each([{ typography: { unknown: {} } }, { showDescriptions: 'false' }, { showLocations: null }, { showMapLinks: 0 }, { dateFormat: 'numeric' }, { timeFormat: 'am-pm' }, { dayGap: 12 }, { contentWidth: 600 }, { contentAlignment: 'stretch' }])('rejects malformed settings %j', (appearance) => expect(scheduleElementSchema.safeParse({ ...element, appearance }).success).toBe(false))
  it('formats calendar dates consistently across extreme timezones without changing authored values', () => {
    const before = process.env.TZ
    try {
      for (const zone of ['Pacific/Kiritimati', 'America/Los_Angeles', 'UTC']) {
        process.env.TZ = zone
        expect(formatScheduleDate('2026-10-24', 'long')).toBe('October 24, 2026')
        expect(formatScheduleDate('2026-10-24', 'short')).toBe('Oct 24, 2026')
        expect(formatScheduleDate('2026-10-24', 'weekday')).toBe('Saturday, October 24, 2026')
        expect(formatScheduleDate('2024-02-29', 'weekday')).toBe('Thursday, February 29, 2024')
      }
    } finally { if (before === undefined) delete process.env.TZ; else process.env.TZ = before }
    expect(element.days![0].date).toBe('2026-10-24')
    expect(html(undefined)).toContain('2026-10-24')
  })
  it.each([['00:00', '12:00 AM'], ['12:00', '12:00 PM'], ['15:00', '3:00 PM'], ['23:59', '11:59 PM']])('formats %s without timezone conversions', (time, expected) => {
    expect(formatScheduleTime(time)).toBe(expected)
    expect(formatScheduleTime(time, '24-hour')).toBe(time)
  })
  it.each(['timeline', 'list', 'cards'] as const)('applies formatting, visibility and width in %s without emitting hidden DOM content', (layout) => {
    const markup = html({ layout, dateFormat: 'weekday', timeFormat: '24-hour', showDescriptions: false, showLocations: false, showMapLinks: false, dayGap: 'l', contentWidth: 'narrow', contentAlignment: 'center' })
    expect(markup).toContain('Saturday, October 24, 2026'); expect(markup).toContain('Day 2')
    expect(markup).toContain('dateTime="15:00"'); expect(markup).toContain('>15:00</time>'); expect(markup).toContain('>16:00</time>')
    for (const secret of ['Secret description', 'Secret location', 'https://maps.apple.com', 'View map', 'schedule-description', 'schedule-location', 'schedule-map']) expect(markup).not.toContain(secret)
    expect(markup).toContain('--schedule-day-gap:1.5rem'); expect(markup).toContain('max-width:32rem'); expect(markup).toContain('margin-inline-start:auto'); expect(markup).toContain('margin-inline-end:auto')
    expect(element.days![0].activities[0]).toEqual(activity)
    expect(html({ layout, showDescriptions: false })).toContain('Secret location')
    expect(html({ layout, showLocations: false })).toContain('Secret description')
  })
  it('preserves custom headings and single renderable Day suppression', () => {
    const markup = renderToStaticMarkup(<ScheduleElementRenderer element={{ ...element, days: [{ ...element.days![0], title: 'Our special day' }, element.days![1]], appearance: { dateFormat: 'long' } }} mode="public" templateKey="classic-filipiniana-v1" />)
    expect(markup).toContain('Our special day'); expect(markup).not.toContain('October 24')
    const single = renderToStaticMarkup(<ScheduleElementRenderer element={{ ...element, days: [element.days![0], { ...element.days![1], visible: false }] }} mode="public" templateKey="classic-filipiniana-v1" />)
    expect(single).not.toContain('<h3')
  })
})
