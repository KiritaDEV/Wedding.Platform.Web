import { describe, expect, it } from 'vitest'
import { applyFrameProperty } from './frameAppearanceAuthoring'
import type { WebsiteSectionAppearance } from './types'

const base: WebsiteSectionAppearance = { headingAlignment: 'inherit', bodyAlignment: 'inherit', backgroundTreatment: 'inherit', emphasis: 'inherit' }

describe('Frame appearance authoring', () => {
  it('updates one property without changing its siblings', () => {
    const appearance = { ...base, decorativeAppearance: { frame: { style: 'fine' as const, size: 100, strength: 42, colorId: 'accent' } } }
    expect(applyFrameProperty(appearance, 'size', 150).decorativeAppearance?.frame).toEqual({ style: 'fine', size: 150, strength: 42, colorId: 'accent' })
    expect(applyFrameProperty(appearance, 'strength', 75).decorativeAppearance?.frame).toEqual({ style: 'fine', size: 100, strength: 75, colorId: 'accent' })
    expect(applyFrameProperty(appearance, 'colorId', 'project-color').decorativeAppearance?.frame).toEqual({ style: 'fine', size: 100, strength: 42, colorId: 'project-color' })
  })

  it('resets only the selected property and prunes empty parents', () => {
    const appearance = { ...base, decorativeAppearance: { frame: { size: 100 } } }
    expect(applyFrameProperty(appearance, 'size')).toEqual(base)
    const siblings = { ...base, decorativeAppearance: { frame: { style: 'fine' as const, size: 100, strength: 42 } } }
    expect(applyFrameProperty(siblings, 'size').decorativeAppearance?.frame).toEqual({ style: 'fine', strength: 42 })
  })
})
