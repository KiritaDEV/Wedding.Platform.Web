import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { scheduleContentSchema, isScheduleMapUrl, type ScheduleActivity, type ScheduleDay } from './scheduleContent'
import { scheduleElementSchema } from './schemas'
import { ScheduleElementRenderer } from '../websiteRenderer/ScheduleElementRenderer'
import { duplicateWebsiteElement, type SectionChildFlow } from '../websiteEditor/sectionChildFlow'
const activity: ScheduleActivity = { id: 'activity', title: 'Ceremony', startTime: '15:30', endTime: '16:30', description: 'Garden\nlevel', location: 'Garden', mapUrl: 'https://maps.apple.com/?q=garden', imageMediaId: null, visible: true }
const day: ScheduleDay = { id: 'day', title: null, date: null, visible: true, activities: [activity] }
const element = { id: 'schedule', type: 'schedule' as const, editorName: 'Schedule 1', days: [day] }
describe('Schedule days/activities', () => {
  it('accepts incomplete drafts, normalizes empty text, and preserves multiline/order without mutation', () => {
    const input = { days: [{ ...day, activities: [{ ...activity, title: '', description: 'A\r\nB', startTime: '', endTime: null }] }] }
    const parsed = scheduleContentSchema.parse(input)
    expect(parsed.days[0].activities[0]).toMatchObject({ title: null, description: 'A\nB', startTime: null })
    expect(input.days[0].activities[0].description).toBe('A\r\nB')
    expect(scheduleContentSchema.parse({ days: [{ ...day, activities: [] }, { ...day, id: 'day2', activities: [] }] }).days.map(({ id }) => id)).toEqual(['day', 'day2'])
  })
  it.each(['2023-02-29', '2024-04-31', '0000-01-01', '2024-13-01', '2024-2-01'])('rejects invalid date %s', (date) => expect(scheduleContentSchema.safeParse({ days: [{ ...day, date }] }).success).toBe(false))
  it('accepts leap days', () => expect(scheduleContentSchema.safeParse({ days: [{ ...day, date: '2024-02-29' }] }).success).toBe(true))
  it.each([{ startTime: '24:00' }, { startTime: null, endTime: '16:00' }, { endTime: '15:30' }, { startTime: '23:00', endTime: '01:00' }])('rejects invalid times/ranges %j', (change) => expect(scheduleContentSchema.safeParse({ days: [{ ...day, activities: [{ ...activity, ...change }] }] }).success).toBe(false))
  it.each(['http://maps.apple.com/', 'https://maps.apple.com.evil.com', 'https://user@maps.apple.com/', 'https://evil.com/?maps.apple.com', 'https://maps.apple.com:444/', 'https://maps.apple.com\\@evil.com', 'javascript:alert(1)', 'https://@maps.apple.com/', 'https://%6daps.apple.com/'])('rejects unsafe map %s', (url) => expect(isScheduleMapUrl(url)).toBe(false))
  it.each(['https://www.google.com/maps', 'https://maps.google.com/', 'https://maps.app.goo.gl/abc', 'https://www.waze.com/ul', 'https://maps.apple.com/'])('accepts map %s', (url) => expect(isScheduleMapUrl(url)).toBe(true))
  it('rejects flat content, unknown fields, duplicate identities, and total limits', () => {
    expect(scheduleElementSchema.safeParse({ ...element, items: [] }).success).toBe(false)
    expect(scheduleContentSchema.safeParse({ days: [{ ...day, extra: true }] }).success).toBe(false)
    expect(scheduleContentSchema.safeParse({ days: [day, day] }).success).toBe(false)
    expect(scheduleContentSchema.safeParse({ days: [{ ...day, activities: Array.from({ length: 101 }, (_, index) => ({ ...activity, id: `a${index}` })) }] }).success).toBe(false)
  })
  it('suppresses single-day headings, preserves descriptions, range, location and safe map link', () => {
    const html = renderToStaticMarkup(<ScheduleElementRenderer element={element} mode="public" templateKey="modern-editorial-v1" />)
    expect(html).not.toContain('<h3')
    expect(html).toContain('dateTime="15:30"')
    expect(html).toContain('3:30 PM')
    expect(html).toContain('4:30 PM')
    expect(html).toContain('Garden\nlevel')
    expect(html).toContain('noopener noreferrer')
  })
  it('filters hidden/empty/untitled content and numbers only rendered days', () => {
    const days = [{ ...day, id: 'hidden', visible: false }, { ...day, id: 'empty', activities: [] }, day, { ...day, id: 'second', activities: [{ ...activity, id: 'a2' }] }]
    const html = renderToStaticMarkup(<ScheduleElementRenderer element={{ ...element, days }} mode="public" templateKey="classic-filipiniana-v1" />)
    expect(html).toContain('Day 1'); expect(html).toContain('Day 2'); expect(html).not.toContain('Day 3')
    expect(renderToStaticMarkup(<ScheduleElementRenderer element={{ ...element, days: [{ ...day, activities: [{ ...activity, title: ' ' }] }] }} mode="public" templateKey="classic-filipiniana-v1" />)).toBe('')
  })
  it('regenerates local placement/day/activity identities on duplication', () => {
    const flow: SectionChildFlow = { elements: [element], order: [{ kind: 'element', id: element.id }] }
    const copy = duplicateWebsiteElement(flow, element)
    expect(copy.id).not.toBe(element.id)
    expect(copy.days[0].id).not.toBe(day.id)
    expect(copy.days[0].activities[0].id).not.toBe(activity.id)
    expect(copy.days[0].activities[0].description).toBe(activity.description)
  })
})
