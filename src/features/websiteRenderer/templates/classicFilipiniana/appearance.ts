import type { CSSProperties } from 'react'
import type { RsvpSectionAppearance, WebsiteDesignSettings, WebsiteSectionAppearance } from '../../../websiteEditor/types'
import { resolveSectionCustomBackground } from '../../sectionSurface'
import type { TemplateDesignLibrary } from '../../../websiteCapabilities/types'
import type { ProjectColor } from '../../../websiteColors/projectColors'

export type ResolvedSectionAppearance = {
  sectionClass: string
  sectionStyle?: CSSProperties
}

const headingAlignmentClasses = {
  left: '[&_[data-section-specialized-content]_[data-section-heading]]:text-left [&_[data-section-specialized-content]_[data-section-heading]_*]:text-left',
  center: '[&_[data-section-specialized-content]_[data-section-heading]]:text-center [&_[data-section-specialized-content]_[data-section-heading]_*]:text-center',
  right: '[&_[data-section-specialized-content]_[data-section-heading]]:text-right [&_[data-section-specialized-content]_[data-section-heading]_*]:text-right',
} as const
const bodyAlignmentClasses = {
  left: '[&_[data-section-specialized-content]_[data-section-body]]:text-left [&_[data-section-specialized-content]_[data-section-body]_*]:text-left',
  center: '[&_[data-section-specialized-content]_[data-section-body]]:text-center [&_[data-section-specialized-content]_[data-section-body]_*]:text-center',
  right: '[&_[data-section-specialized-content]_[data-section-body]]:text-right [&_[data-section-specialized-content]_[data-section-body]_*]:text-right',
} as const

export function resolveClassicFilipinianaSectionAppearance(
  sectionType: string,
  _design: WebsiteDesignSettings,
  appearance: WebsiteSectionAppearance | RsvpSectionAppearance,
  library: TemplateDesignLibrary,
  projectColors: readonly ProjectColor[],
): ResolvedSectionAppearance {
  const defaultBodyAlignment = 'center'
  const headingAlignment = 'headingAlignment' in appearance ? appearance.headingAlignment : 'inherit'
  const bodyAlignment = 'bodyAlignment' in appearance ? appearance.bodyAlignment : 'inherit'
  const backgroundTreatment = 'backgroundTreatment' in appearance ? appearance.backgroundTreatment : 'inherit'
  const sectionEmphasis = 'emphasis' in appearance ? appearance.emphasis : 'inherit'
  const heading = headingAlignment === 'inherit' ? 'center' : headingAlignment
  const body = bodyAlignment === 'inherit' ? defaultBodyAlignment : bodyAlignment
  const customBackground = resolveSectionCustomBackground(appearance, library, projectColors)
  const background = backgroundTreatment === 'inherit' || backgroundTreatment === 'custom' ? classicBackgroundDefault(sectionType) : backgroundTreatment
  const emphasis = sectionEmphasis === 'inherit' ? 'standard' : sectionEmphasis

  const backgroundResult = resolveBackground(background)
  const alignmentClass = sectionType === 'rsvp' ? '' : `${headingAlignmentClasses[heading]} ${bodyAlignmentClasses[body]}`
  const emphasisClass = sectionType === 'rsvp' ? '' : emphasis === 'featured'
    ? 'border-b-2 [&_[data-section-specialized-content]]:py-24'
    : emphasis === 'subtle' ? 'opacity-[0.92] [&_[data-section-specialized-content]]:py-14' : ''
  return {
    sectionClass: `${backgroundResult.className} ${alignmentClass} ${emphasisClass}`,
    sectionStyle: customBackground ? { ...backgroundResult.style, ...customBackground } : backgroundResult.style,
  }
}

function classicBackgroundDefault(sectionType: string): 'plain' | 'soft' {
  return sectionType === 'rsvp' ? 'soft' : 'plain'
}

function resolveBackground(background: 'plain' | 'soft' | 'accent'): { className: string; style?: CSSProperties } {
  if (background === 'plain') return { className: 'bg-[var(--cf-theme-page)]' }
  if (background === 'soft') return { className: 'bg-[color-mix(in_srgb,var(--cf-theme-surface)_58%,var(--cf-theme-page))]' }
  return {
    className: 'bg-[var(--cf-theme-accent)] [&_[data-rsvp-button]]:bg-white [&_[data-rsvp-button]]:text-[var(--cf-theme-accent)]',
    style: {
      '--cf-text': 'var(--cf-theme-accent-contrast)',
      '--cf-muted': 'rgb(255 255 255 / 82%)',
      '--cf-surface': 'rgb(0 0 0 / 12%)',
      '--cf-accent': 'var(--cf-theme-accent-contrast)',
      '--cf-secondary': 'rgb(255 255 255 / 76%)',
      '--cf-border': 'rgb(255 255 255 / 68%)',
    } as CSSProperties,
  }
}
