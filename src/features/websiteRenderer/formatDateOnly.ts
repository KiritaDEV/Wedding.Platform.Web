export type DateBlockFormat = 'long' | 'medium' | 'short' | 'numeric'

export function formatDateOnly(
  value: string | null,
  options: { format?: DateBlockFormat; showWeekday?: boolean; locale?: string } = {},
): string | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day), 12)
  if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) return null
  const format = options.format ?? 'long'
  const dateOptions: Intl.DateTimeFormatOptions = format === 'numeric'
    ? { year: 'numeric', month: 'numeric', day: 'numeric' }
    : { year: 'numeric', month: format === 'short' ? 'short' : 'long', day: 'numeric' }
  if (format === 'long' && (options.showWeekday ?? true)) dateOptions.weekday = 'long'
  return new Intl.DateTimeFormat(options.locale ?? 'en-US', dateOptions).format(date)
}
