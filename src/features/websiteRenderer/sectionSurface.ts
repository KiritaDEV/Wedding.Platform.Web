import type { CSSProperties } from 'react'
import type { RsvpSectionAppearance, WebsiteSectionAppearance } from '../websiteEditor/types'
import type { TemplateDesignLibrary } from '../websiteCapabilities/types'
import type { ProjectColor } from '../websiteColors/projectColors'
import { resolveWebsiteColor } from '../websiteColors/projectColors'

const OPAQUE_HEX = /^#[0-9A-Fa-f]{6}$/

export function normalizeOpaqueHex(value: string | undefined): string | null {
  return value && OPAQUE_HEX.test(value) ? value.toUpperCase() : null
}

/** Resolves the optional authored color for a custom Section surface. */
export function resolveSectionCustomBackground(
  appearance: WebsiteSectionAppearance | RsvpSectionAppearance,
  library: TemplateDesignLibrary,
  projectColors: readonly ProjectColor[],
): CSSProperties | null {
  if ('backgroundTreatment' in appearance && appearance.backgroundTreatment !== 'custom') return null
  const background = appearance.decorativeAppearance?.background
  const backgroundColor = resolveWebsiteColor(background?.colorId, library, projectColors)
    ?? normalizeOpaqueHex(background?.customColor)
  return backgroundColor ? { backgroundColor } : null
}
