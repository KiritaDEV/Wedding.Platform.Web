import { describe, expect, it } from 'vitest'
import type { SectionCapability } from '../websiteCapabilities/types'
import type { WebsiteSectionAppearance } from './types'
import { sectionAppearanceCapabilityIssues } from './schemas'

const control = (id: string) => ({ id, label: id, type: 'option', scope: 'responsive', default: 'allowed', options: [{ key: 'allowed', displayName: 'Allowed' }], viewports: { tablet: { default: 'allowed', options: [{ key: 'allowed', displayName: 'Allowed' }] }, mobile: { default: 'allowed', options: [{ key: 'allowed', displayName: 'Allowed' }] } } })
const capability = { id: 'hero', appearanceControls: ['headingAlignment', 'bodyAlignment', 'mediaPlacement', 'mediaSize', 'mediaContentGap', 'cornerStyle', 'shadowStyle'].map(control), presentations: [], contextDefaults: { typography: [], colors: [] } } as unknown as SectionCapability
const base = { headingAlignment: 'allowed', bodyAlignment: 'allowed', backgroundTreatment: 'plain', emphasis: 'standard', mediaPlacement: 'allowed' } as unknown as WebsiteSectionAppearance

describe('Section appearance capability validation', () => {
  it('accepts capability values and rejects malformed base and responsive values', () => {
    expect(sectionAppearanceCapabilityIssues(capability, base)).toEqual([])
    const malformed = { ...base, mediaPlacement: 'legacy-free-form', responsive: { mobile: { mediaSize: 'legacy-free-form' } } }
    expect(sectionAppearanceCapabilityIssues(capability, malformed)).toEqual([
      { viewport: 'desktop', field: 'mediaPlacement' },
      { viewport: 'mobile', field: 'mediaSize' },
    ])
  })
})
