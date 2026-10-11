import { presentationCapability, sectionContextDefaultsCapability } from '../websiteCapabilities/lookup'
import type { SectionCapability } from '../websiteCapabilities/types'
import type { SectionDesignDefaults, WebsiteSectionAppearance } from './types'

export type SectionDesignDefaultKey = keyof SectionDesignDefaults

export type SectionDesignDefaultControl = {
  key: SectionDesignDefaultKey
  label: string
  kind: 'font' | 'color'
  allowedIds: string[]
}

export function sectionDesignDefaultControls(
  capability: SectionCapability,
  appearance: WebsiteSectionAppearance,
): SectionDesignDefaultControl[] {
  const presentation = presentationCapability(capability, appearance.presentation)
  const context = sectionContextDefaultsCapability(capability, presentation)

  return [
    ...context.typography.map((control) => ({
      key: control.role === 'heading' ? 'headingFontId' as const : 'bodyFontId' as const,
      label: control.role === 'heading' ? 'Heading Font' : 'Body Font',
      kind: 'font' as const,
      allowedIds: control.allowedFontIds,
    })),
    ...context.colors.map((control) => ({
      key: `${control.role}Id` as Extract<SectionDesignDefaultKey, `${string}ColorId`>,
      label: control.role === 'headingColor' ? 'Heading Color' : control.role === 'bodyColor' ? 'Body Color' : 'Accent Color',
      kind: 'color' as const,
      allowedIds: control.allowedColorIds,
    })),
  ]
}

export function setSectionDesignDefault(
  current: SectionDesignDefaults,
  key: SectionDesignDefaultKey,
  value: string,
): SectionDesignDefaults {
  return { ...current, [key]: value }
}

export function resetSectionDesignDefault(
  current: SectionDesignDefaults,
  key: SectionDesignDefaultKey,
): SectionDesignDefaults {
  const next = { ...current }
  delete next[key]
  return next
}
