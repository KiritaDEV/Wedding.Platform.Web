import { describe, expect, it } from 'vitest'
import type { SectionCapability } from '../websiteCapabilities/types'
import type { WebsiteSectionAppearance } from './types'
import { canonicalizeResponsiveAppearance, resolveSectionAppearanceForViewport } from './responsiveAppearance'

const option = (id: string, base: string, tablet: string, mobile: string) => ({
  id, label: id, type: 'option', scope: 'responsive', default: base,
  options: [{ key: base, displayName: base }, { key: 'authored', displayName: 'Authored' }, { key: 'override', displayName: 'Override' }, { key: 'comfortable', displayName: 'Comfortable' }],
  viewports: {
    tablet: { default: tablet, options: [{ key: tablet, displayName: tablet }, { key: 'authored', displayName: 'Authored' }, { key: 'override', displayName: 'Override' }, { key: 'comfortable', displayName: 'Comfortable' }] },
    mobile: { default: mobile, options: [{ key: mobile, displayName: mobile }, { key: 'authored', displayName: 'Authored' }, { key: 'override', displayName: 'Override' }, { key: 'comfortable', displayName: 'Comfortable' }] },
  },
})

const spacing = {
  id: 'mediaSpacing', label: 'mediaSpacing', type: 'spacing', scope: 'responsive',
  default: { top: 'small', right: 'small', bottom: 'small', left: 'small' },
  options: ['none', 'small', 'medium', 'large'].map((key) => ({ key, displayName: key })),
  viewports: {
    tablet: { default: { top: 'medium', right: 'medium', bottom: 'medium', left: 'medium' }, options: ['none', 'small', 'medium', 'large'].map((key) => ({ key, displayName: key })) },
    mobile: { default: { top: 'none', right: 'none', bottom: 'none', left: 'none' }, options: ['none', 'small', 'medium', 'large'].map((key) => ({ key, displayName: key })) },
  },
}

const capability = {
  id: 'hero', appearanceControls: [
    option('headingAlignment', 'left', 'center', 'right'),
    option('bodyAlignment', 'left', 'center', 'right'),
    option('mediaPlacement', 'left', 'top', 'bottom'),
    option('mediaSize', 'balanced', 'compact', 'feature'),
    option('mediaContentGap', 'comfortable', 'tight', 'spacious'),
    spacing,
  ], presentations: [], contextDefaults: { typography: [], colors: [] },
} as unknown as SectionCapability

const base: WebsiteSectionAppearance = {
  headingAlignment: 'left', bodyAlignment: 'left', backgroundTreatment: 'plain', emphasis: 'standard',
  mediaPlacement: 'authored', mediaSize: 'authored', mediaContentGap: 'comfortable',
  mediaSpacing: { top: 'large', right: 'large', bottom: 'large', left: 'large' },
}

describe('responsive Section appearance', () => {
  it('uses Desktop base and inherits that base independently into Tablet and Mobile', () => {
    const appearance = { ...base, responsive: { tablet: { mediaPlacement: 'override' }, mobile: { mediaSize: 'override' } } }
    expect(resolveSectionAppearanceForViewport(appearance, 'desktop', capability)).toMatchObject({ mediaPlacement: 'authored', mediaSize: 'authored' })
    expect(resolveSectionAppearanceForViewport(appearance, 'tablet', capability)).toMatchObject({ mediaPlacement: 'override', mediaSize: 'authored', mediaContentGap: 'comfortable', mediaSpacing: base.mediaSpacing })
    expect(resolveSectionAppearanceForViewport(appearance, 'mobile', capability)).toMatchObject({ mediaPlacement: 'authored', mediaSize: 'override', mediaContentGap: 'comfortable', mediaSpacing: base.mediaSpacing })
  })

  it('uses viewport template defaults only when a base property is absent', () => {
    const withoutMedia = { ...base }
    delete withoutMedia.mediaPlacement
    expect(resolveSectionAppearanceForViewport(withoutMedia, 'tablet', capability).mediaPlacement).toBe('top')
    expect(resolveSectionAppearanceForViewport(base, 'tablet', capability).mediaPlacement).toBe('authored')
  })

  it('canonicalizes a reset-equivalent override away so inherited base is revealed', () => {
    const result = canonicalizeResponsiveAppearance({ ...base, responsive: { tablet: { mediaPlacement: 'authored' }, mobile: { mediaPlacement: 'override' } } }, capability)
    expect(result.responsive?.tablet).toBeUndefined()
    expect(resolveSectionAppearanceForViewport(result, 'tablet', capability).mediaPlacement).toBe('authored')
    expect(result.responsive?.mobile?.mediaPlacement).toBe('override')
  })
})
