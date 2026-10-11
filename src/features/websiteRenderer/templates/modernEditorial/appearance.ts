import type { CSSProperties } from 'react'
import type { RsvpSectionAppearance, WebsiteSectionAppearance } from '../../../websiteEditor/types'
import { resolveSectionCustomBackground } from '../../sectionSurface'
import type { TemplateDesignLibrary } from '../../../websiteCapabilities/types'
import type { ProjectColor } from '../../../websiteColors/projectColors'

const headingAlignment = {
  left: '[&_[data-section-specialized-content]_[data-section-heading]]:text-left [&_[data-section-specialized-content]_[data-section-heading]_*]:text-left',
  center: '[&_[data-section-specialized-content]_[data-section-heading]]:text-center [&_[data-section-specialized-content]_[data-section-heading]_*]:text-center',
  right: '[&_[data-section-specialized-content]_[data-section-heading]]:text-right [&_[data-section-specialized-content]_[data-section-heading]_*]:text-right',
}
const bodyAlignment = {
  left: '[&_[data-section-specialized-content]_[data-section-body]]:text-left [&_[data-section-specialized-content]_[data-section-body]_*]:text-left',
  center: '[&_[data-section-specialized-content]_[data-section-body]]:text-center [&_[data-section-specialized-content]_[data-section-body]_*]:text-center',
  right: '[&_[data-section-specialized-content]_[data-section-body]]:text-right [&_[data-section-specialized-content]_[data-section-body]_*]:text-right',
}

export function resolveModernEditorialSectionAppearance(sectionType: string, appearance: WebsiteSectionAppearance | RsvpSectionAppearance, library: TemplateDesignLibrary, projectColors: readonly ProjectColor[]) {
  const headingAlignmentValue = 'headingAlignment' in appearance ? appearance.headingAlignment : 'inherit'
  const bodyAlignmentValue = 'bodyAlignment' in appearance ? appearance.bodyAlignment : 'inherit'
  const backgroundTreatment = 'backgroundTreatment' in appearance ? appearance.backgroundTreatment : 'inherit'
  const sectionEmphasis = 'emphasis' in appearance ? appearance.emphasis : 'inherit'
  const heading = headingAlignmentValue === 'inherit' ? 'left' : headingAlignmentValue
  const body = bodyAlignmentValue === 'inherit' ? 'left' : bodyAlignmentValue
  const customBackground = resolveSectionCustomBackground(appearance, library, projectColors)
  const background = backgroundTreatment === 'inherit' || backgroundTreatment === 'custom' ? modernBackgroundDefault(sectionType) : backgroundTreatment
  const emphasis = sectionEmphasis === 'inherit' ? 'standard' : sectionEmphasis
  const backgroundResult = resolveBackground(background)
  const alignmentClass = sectionType === 'rsvp' ? '' : `${headingAlignment[heading]} ${bodyAlignment[body]}`
  const emphasisClass = sectionType === 'rsvp' ? '' : emphasis === 'featured' ? '[&_[data-section-specialized-content]]:py-28' : emphasis === 'subtle' ? 'opacity-90 [&_[data-section-specialized-content]]:py-14' : ''

  return {
    sectionClass: `${backgroundResult.className} ${alignmentClass} ${emphasisClass}`,
    sectionStyle: customBackground ? { ...backgroundResult.style, ...customBackground } : backgroundResult.style,
  }
}

function modernBackgroundDefault(sectionType: string): 'plain' | 'soft' {
  return sectionType === 'rsvp' ? 'soft' : 'plain'
}

function resolveBackground(background: 'plain' | 'soft' | 'accent'): { className: string; style?: CSSProperties } {
  if (background === 'plain') return { className: 'bg-[var(--me-page)]' }
  if (background === 'soft') return { className: 'bg-[var(--me-surface)]' }
  return {
    className: 'bg-[var(--me-accent)] [&_[data-rsvp-button]]:border-white [&_[data-rsvp-button]]:text-white',
    style: { '--me-text': 'var(--me-accent-contrast)', '--me-muted': 'rgb(255 255 255 / 76%)', '--me-border': 'rgb(255 255 255 / 55%)' } as CSSProperties,
  }
}
