import type { WebsiteSectionAppearance } from './types'

export function applyFrameProperty(appearance: WebsiteSectionAppearance, field: 'size' | 'strength' | 'colorId', value?: number | string): WebsiteSectionAppearance {
  const next = structuredClone(appearance)
  const decorativeAppearance = { ...next.decorativeAppearance }
  const frame = { ...(decorativeAppearance.frame ?? {}) }
  if (value === undefined) delete frame[field]
  else if (field === 'size') frame.size = Math.min(200, Math.max(50, Math.round(Number(value) / 5) * 5))
  else if (field === 'strength') frame.strength = Math.min(100, Math.max(0, Math.round(Number(value) / 5) * 5))
  else frame.colorId = String(value)
  if (Object.keys(frame).length) decorativeAppearance.frame = frame
  else delete decorativeAppearance.frame
  if (Object.keys(decorativeAppearance).length) next.decorativeAppearance = decorativeAppearance
  else delete next.decorativeAppearance
  return next
}
