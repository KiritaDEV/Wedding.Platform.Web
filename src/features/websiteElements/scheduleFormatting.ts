/** Calendar dates are formatted in UTC explicitly, never in the browser's timezone. */
export function formatScheduleDate(value: string, format?: 'long' | 'short' | 'weekday'): string {
  if (!format) return value
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return value
  const date = new Date(0)
  date.setUTCFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  date.setUTCHours(12, 0, 0, 0)
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', year: 'numeric', month: format === 'short' ? 'short' : 'long', day: 'numeric', ...(format === 'weekday' ? { weekday: 'long' } : {}) }).format(date)
}

export function formatScheduleTime(value: string | null, format: '12-hour' | '24-hour' = '12-hour'): string | null {
  if (!value || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return null
  if (format === '24-hour') return value
  const hour = Number(value.slice(0, 2))
  return `${hour % 12 || 12}:${value.slice(3)} ${hour < 12 ? 'AM' : 'PM'}`
}
