import type { EventType } from './types'

export function formatEventDate(date: string | null): string | null {
  if (!date) return null
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))
}

export function formatEventTime(time: string | null): string | null {
  if (!time) return null
  const [hours, minutes] = time.split(':').map(Number)
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return time
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, 0, 1, hours, minutes)))
}

export function formatEventType(type: EventType): string {
  return type.charAt(0).toUpperCase() + type.slice(1)
}
