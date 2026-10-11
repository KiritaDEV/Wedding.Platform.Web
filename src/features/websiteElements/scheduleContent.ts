import { z } from 'zod'

export const SCHEDULE_MAP_HOSTS = ['google.com', 'www.google.com', 'maps.google.com', 'maps.app.goo.gl', 'waze.com', 'www.waze.com', 'maps.apple.com'] as const

export function isScheduleMapUrl(value: string): boolean {
  if (!/^https:\/\//.test(value) || /[\s\\]/u.test(value) || /[@%]/.test(value.slice(8).split(/[/?#]/)[0])) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && !url.port
      && SCHEDULE_MAP_HOSTS.some((host) => url.hostname === host)
  } catch { return false }
}

const identity = z.string().min(1).refine((value) => Array.from(value).length <= 255).regex(/^\S+$/u)
const nullableText = (max: number) => z.string().refine((value) => Array.from(value).length <= max)
  .nullable().transform((value) => value === '' ? null : value)
const time = nullableText(5).refine((value) => value === null || /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value), 'Use HH:mm.')
const date = nullableText(10).refine((value) => {
  if (value === null) return true
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  if (year < 1 || month < 1 || month > 12) return false
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  return day >= 1 && day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
}, 'Use a valid YYYY-MM-DD calendar date.')

export const scheduleActivitySchema = z.object({
  id: identity, title: nullableText(255), startTime: time, endTime: time,
  description: nullableText(5000).transform((value) => value?.replace(/\r\n?/g, '\n') ?? null),
  location: nullableText(255),
  mapUrl: nullableText(2048).refine((value) => value === null || isScheduleMapUrl(value), 'Use an HTTPS Google Maps, Waze, or Apple Maps URL.'),
  imageMediaId: z.string().regex(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i).or(z.literal('')).nullable().transform((value) => value === '' ? null : value), visible: z.boolean(),
}).strict().superRefine((activity, context) => {
  if (activity.endTime !== null && (activity.startTime === null || activity.endTime <= activity.startTime)) {
    context.addIssue({ code: 'custom', path: ['endTime'], message: 'End time requires an earlier start time on the same day.' })
  }
})

export const scheduleDaySchema = z.object({ id: identity, date, title: nullableText(255), visible: z.boolean(), activities: z.array(scheduleActivitySchema).max(100) }).strict()
export const scheduleContentSchema = z.object({ days: z.array(scheduleDaySchema).max(20) }).strict().superRefine(({ days }, context) => {
  const ids = new Set<string>()
  let count = 0
  days.forEach((day, index) => {
    for (const [id, path] of [[day.id, ['days', index, 'id']], ...day.activities.map((activity, activityIndex) => [activity.id, ['days', index, 'activities', activityIndex, 'id']] as const)] as const) {
      if (ids.has(id)) context.addIssue({ code: 'custom', path: [...path], message: 'Day and Activity IDs must be unique within Schedule content.' })
      ids.add(id)
    }
    count += day.activities.length
  })
  if (count > 100) context.addIssue({ code: 'custom', path: ['days'], message: 'Schedule supports at most 100 Activities.' })
})

export type ScheduleActivity = z.infer<typeof scheduleActivitySchema>
export type ScheduleDay = z.infer<typeof scheduleDaySchema>
export type ScheduleContent = z.infer<typeof scheduleContentSchema>

/** Author order is preserved. The input is never mutated. */
export function visibleScheduleDays(days: readonly ScheduleDay[]): ScheduleDay[] {
  return days.filter((day) => day.visible).map((day) => ({ ...day, activities: day.activities.filter((activity) => activity.visible && !!activity.title?.trim()) })).filter((day) => day.activities.length > 0)
}
