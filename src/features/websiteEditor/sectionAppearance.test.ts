import { describe, expect, it } from 'vitest'
import { mergeScopedSectionAppearance, resolveSectionAppearance } from './sectionAppearance'
import type { WebsiteSectionAppearanceEnvelope } from './types'
import { resolveBackgroundMediaForDevice } from '../websiteMedia/backgroundMedia'

const base = { headingAlignment: 'inherit' as const, bodyAlignment: 'inherit' as const, backgroundTreatment: 'inherit' as const, emphasis: 'inherit' as const }

describe('Section appearance ownership', () => {
  it('uses only an exact-target custom and never another device custom', () => {
    const envelope: WebsiteSectionAppearanceEnvelope = { shared: base, custom: { desktop: { ...base, backgroundTreatment: 'custom' }, mobile: { ...base, decorativeAppearance: { background: { texture: 'grain' } } } } }
    expect(resolveSectionAppearance(envelope, 'desktop').source).toBe('custom')
    expect(resolveSectionAppearance(envelope, 'tablet').source).toBe('shared')
    expect(resolveSectionAppearance(envelope, 'mobile').appearance.decorativeAppearance?.background?.texture).toBe('grain')
  })

  it('keeps Frame overrides inside the selected complete appearance branch', () => {
    const envelope: WebsiteSectionAppearanceEnvelope = {
      shared: { ...base, decorativeAppearance: { frame: { style: 'fine', size: 100, strength: 42, colorId: 'shared' } } },
      custom: {
        desktop: { ...base, decorativeAppearance: { frame: { style: 'fine', size: 50, strength: 10, colorId: 'desktop' } } },
        mobile: { ...base, decorativeAppearance: { frame: { style: 'ornamental', size: 200, strength: 100, colorId: 'mobile' } } },
      },
    }
    expect(resolveSectionAppearance(envelope, 'desktop').appearance.decorativeAppearance?.frame?.colorId).toBe('desktop')
    expect(resolveSectionAppearance(envelope, 'mobile').appearance.decorativeAppearance?.frame?.size).toBe(200)
    expect(resolveSectionAppearance(envelope, 'tablet').appearance.decorativeAppearance?.frame?.colorId).toBe('shared')
  })

  it('merges one dirty scope into the freshest envelope', () => {
    const fresh: WebsiteSectionAppearanceEnvelope = { shared: base, custom: { desktop: { ...base, backgroundTreatment: 'custom' }, mobile: base } }
    const next = mergeScopedSectionAppearance(fresh, { kind: 'custom', viewport: 'mobile' }, { ...base, decorativeAppearance: { background: { pattern: 'botanical' } } })
    expect(next.custom!.desktop).toEqual(fresh.custom!.desktop)
    expect(next.shared).toEqual(base)
    expect(next.custom!.mobile!.decorativeAppearance?.background?.pattern).toBe('botanical')
  })

  it('isolates the reported Mobile decorative surface change from Desktop and Tablet', () => {
    const shared = { ...base, backgroundTreatment: 'custom' as const, decorativeAppearance: { background: { customColor: '#FFFFFF', texture: 'none' as const, pattern: 'none' as const, overlay: 'none' as const } } }
    const mobile = { ...structuredClone(shared), decorativeAppearance: { background: { customColor: '#000000', texture: 'grain' as const, textureStrength: 45, pattern: 'botanical' as const, patternStrength: 70, overlay: 'soft' as const } } }
    const envelope: WebsiteSectionAppearanceEnvelope = { shared, custom: { mobile } }

    expect(resolveSectionAppearance(envelope, 'desktop').appearance).toEqual(shared)
    expect(resolveSectionAppearance(envelope, 'tablet').appearance).toEqual(shared)
    expect(resolveSectionAppearance(envelope, 'mobile').appearance).toEqual(mobile)
  })

  it('keeps all three custom appearances exact-target and keeps shared editing shared', () => {
    const envelope: WebsiteSectionAppearanceEnvelope = {
      shared: { ...base, decorativeAppearance: { background: { customColor: '#FFFFFF' } } },
      custom: {
        desktop: { ...base, decorativeAppearance: { background: { customColor: '#FF0000', pattern: 'botanical' } } },
        tablet: { ...base, decorativeAppearance: { background: { customColor: '#008000', pattern: 'geometric' } } },
        mobile: { ...base, decorativeAppearance: { background: { customColor: '#000000', pattern: 'heritage' } } },
      },
    }
    expect(resolveSectionAppearance(envelope, 'desktop').appearance.decorativeAppearance?.background?.customColor).toBe('#FF0000')
    expect(resolveSectionAppearance(envelope, 'tablet').appearance.decorativeAppearance?.background?.customColor).toBe('#008000')
    expect(resolveSectionAppearance(envelope, 'mobile').appearance.decorativeAppearance?.background?.customColor).toBe('#000000')

    const sharedOnly: WebsiteSectionAppearanceEnvelope = { shared: envelope.shared }
    const edited = mergeScopedSectionAppearance(sharedOnly, { kind: 'shared' }, { ...base, backgroundTreatment: 'accent' })
    expect(resolveSectionAppearance(edited, 'desktop').appearance.backgroundTreatment).toBe('accent')
    expect(resolveSectionAppearance(edited, 'tablet').appearance.backgroundTreatment).toBe('accent')
    expect(resolveSectionAppearance(edited, 'mobile').appearance.backgroundTreatment).toBe('accent')
  })

  it('keeps Hero background media inside the exact selected appearance owner', () => {
    const envelope: WebsiteSectionAppearanceEnvelope = {
      shared: { ...base, backgroundMedia: { assetId: '01M00000000000000000000000' } },
      custom: {
        desktop: { ...base, backgroundMedia: { assetId: '01M00000000000000000000001' } },
        tablet: { ...base, backgroundMedia: { assetId: '01M00000000000000000000002' } },
        mobile: { ...base, backgroundMedia: { assetId: '01M00000000000000000000003' } },
      },
    }
    expect(resolveSectionAppearance(envelope, 'desktop').appearance.backgroundMedia?.assetId).toBe('01M00000000000000000000001')
    expect(resolveSectionAppearance(envelope, 'tablet').appearance.backgroundMedia?.assetId).toBe('01M00000000000000000000002')
    expect(resolveSectionAppearance(envelope, 'mobile').appearance.backgroundMedia?.assetId).toBe('01M00000000000000000000003')
    expect(envelope.shared.backgroundMedia?.assetId).toBe('01M00000000000000000000000')
  })

  it('selects exactly one appearance owner with no nested device ownership', () => {
    const envelope: WebsiteSectionAppearanceEnvelope = {
      shared: { ...base, backgroundMedia: { assetId: '01M00000000000000000000000' } },
      custom: { desktop: { ...base, backgroundMedia: { assetId: '01M00000000000000000000001' } } },
    }
    const desktopOwner = resolveSectionAppearance(envelope, 'desktop').appearance
    const mobileOwner = resolveSectionAppearance(envelope, 'mobile').appearance
    expect(resolveBackgroundMediaForDevice(desktopOwner.backgroundMedia, 'desktop')?.assetId).toBe('01M00000000000000000000001')
    expect(resolveBackgroundMediaForDevice(mobileOwner.backgroundMedia, 'mobile')?.assetId).toBe('01M00000000000000000000000')
  })
})
