import type {
  ResponsiveViewport,
  WebsiteSectionAppearance,
  WebsiteSectionResponsiveAppearance,
} from './types'
import { controlsForViewport, presentationCapability } from '../websiteCapabilities/lookup'
import type { AppearanceControlCapability, SectionCapability } from '../websiteCapabilities/types'

const responsiveSettings = ['mediaPlacement', 'mediaSize', 'mediaContentGap', 'headingAlignment', 'bodyAlignment', 'mediaSpacing'] as const

export function responsiveTemplateDefaults(
  section: SectionCapability,
  presentationId: string | undefined,
  viewport: Exclude<ResponsiveViewport, 'desktop'>,
): WebsiteSectionResponsiveAppearance {
  const presentation = presentationCapability(section, presentationId)
  const controls = controlsForViewport(section, presentation, viewport)
  const defaults: WebsiteSectionResponsiveAppearance = {}
  for (const setting of responsiveSettings) {
    const control = controls.find((item) => item.id === setting)
    if (control && control.type !== 'number') {
      Object.assign(defaults, { [setting]: control.default })
    }
  }
  return defaults
}

export function resolveSectionAppearanceForViewport(
  appearance: WebsiteSectionAppearance,
  viewport: ResponsiveViewport,
  section: SectionCapability,
): WebsiteSectionAppearance {
  const { responsive, ...base } = appearance

  if (viewport === 'desktop') return base

  const defaults = responsiveTemplateDefaults(section, appearance.presentation, viewport)
  const inherited = { ...base } as WebsiteSectionAppearance
  for (const setting of responsiveSettings) {
    if (inherited[setting] === undefined && defaults[setting] !== undefined) {
      Object.assign(inherited, { [setting]: defaults[setting] })
    }
  }
  return { ...inherited, ...(responsive?.[viewport] ?? {}) } as WebsiteSectionAppearance
}

export function canonicalizeResponsiveAppearance(
  appearance: WebsiteSectionAppearance,
  section: SectionCapability,
): WebsiteSectionAppearance {
  const responsive = { ...appearance.responsive }
  for (const viewport of ['tablet', 'mobile'] as const) {
    const defaults = responsiveTemplateDefaults(section, appearance.presentation, viewport)
    const presentation = presentationCapability(section, appearance.presentation)
    const controls = controlsForViewport(section, presentation, viewport)
    const override = { ...responsive[viewport] }
    for (const setting of responsiveSettings) {
      if (override[setting] === undefined) continue
      const inheritedValue = appearance[setting] ?? defaults[setting]
      if (!responsiveValueIsSupported(setting, override[setting], controls) || valuesEqual(override[setting], inheritedValue)) delete override[setting]
    }
    if (Object.keys(override).length > 0) responsive[viewport] = override
    else delete responsive[viewport]
  }
  return pruneResponsiveAppearance({ ...appearance, responsive })
}

function responsiveValueIsSupported(
  setting: keyof WebsiteSectionResponsiveAppearance,
  value: WebsiteSectionResponsiveAppearance[keyof WebsiteSectionResponsiveAppearance],
  controls: AppearanceControlCapability[],
): boolean {
  const control = controls.find((item) => item.id === setting)
  if (!control || control.type === 'number') return false
  if (control.type === 'spacing') return Boolean(value && typeof value === 'object' && Object.values(value).every((side) => control.options.some((option) => option.key === side)))
  return typeof value === 'string' && control.options.some((option) => option.key === value)
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function pruneResponsiveAppearance(appearance: WebsiteSectionAppearance): WebsiteSectionAppearance {
  const responsive = Object.fromEntries(
    Object.entries(appearance.responsive ?? {}).filter(([, override]) => override && Object.keys(override).length > 0),
  ) as WebsiteSectionAppearance['responsive']
  const next = { ...appearance }
  if (responsive && Object.keys(responsive).length > 0) next.responsive = responsive
  else delete next.responsive
  return next
}

export function appearanceEquals(left: WebsiteSectionAppearance, right: WebsiteSectionAppearance): boolean {
  return stableStringify(pruneResponsiveAppearance(left)) === stableStringify(pruneResponsiveAppearance(right))
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`
  }
  return JSON.stringify(value)
}
