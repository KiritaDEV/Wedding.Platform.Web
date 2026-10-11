import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SectionDecorativeLayers } from './SectionDecorativeLayers'
import { SECTION_DECORATIVE_LAYER_ORDER } from './templateDecorativeAssets'
import type { TemplateDesignLibrary } from '../websiteCapabilities/types'

describe('Section decorative layers', () => {
  it('defines the canonical Section surface stacking contract', () => {
    expect(SECTION_DECORATIVE_LAYER_ORDER).toEqual([
      'base', 'backgroundImage', 'texture', 'pattern', 'overlay', 'content', 'frame', 'foregroundEdge',
    ])
  })

  it.each([
    ['plain', {}],
    ['texture', { background: { texture: 'paper', textureStrength: 40 } }],
    ['pattern', { background: { pattern: 'botanical', patternStrength: 60 } }],
    ['texture and pattern', { background: { texture: 'paper', textureStrength: 40, pattern: 'botanical', patternStrength: 60 } }],
    ['overlay', { background: { overlay: 'soft' } }],
    ['frame', { frame: { style: 'fine' } }],
    ['all layers', { background: { texture: 'paper', textureStrength: 40, pattern: 'botanical', patternStrength: 60, overlay: 'soft' }, frame: { style: 'fine' } }],
  ] as const)('renders Classic %s without layout or accessibility participation', (_name, appearance) => {
    const markup = renderToStaticMarkup(<SectionDecorativeLayers templateKey="classic-filipiniana-v1" viewport="desktop" appearance={appearance} />)
    expect(markup).toContain('data-section-decoration')
    expect(markup).toContain('pointer-events-none absolute inset-0 overflow-hidden')
    expect(markup).toContain('aria-hidden="true"')
    expect(markup).not.toMatch(/\b(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml)-/)
  })

  it('orders texture and pattern before overlay and frame execution', () => {
    const markup = renderToStaticMarkup(<SectionDecorativeLayers templateKey="classic-filipiniana-v1" viewport="desktop" appearance={{ background: { texture: 'paper', pattern: 'botanical', overlay: 'soft' }, frame: { style: 'fine' } }} />)
    const background = markup.indexOf('data-background-decoration')
    const overlay = markup.indexOf('z-[4]')
    const frame = markup.indexOf('z-[20]')
    expect(background).toBeGreaterThanOrEqual(0)
    expect(overlay).toBeGreaterThan(background)
    expect(frame).toBeGreaterThan(overlay)
  })

  it('omits pending Modern background assets while retaining the active fine Frame', () => {
    const markup = renderToStaticMarkup(<SectionDecorativeLayers templateKey="modern-editorial-v1" viewport="mobile" appearance={{ background: { texture: 'grain', pattern: 'geometric' }, frame: { style: 'fine' } }} />)
    expect(markup).toContain('data-section-decoration')
    expect(markup).not.toContain('modern-grain-01')
    expect(markup).not.toContain('modern-geometric-01')
    expect(markup).not.toContain('modern-corners-01')
    expect(markup).toContain('border-width:2px')
  })

  it('uses authored Website colors and safely falls back to the Theme tint', () => {
    const library = { colors: [{ id: 'template-frame', value: '#123456' }], fontFamilies: [], palettePresets: [], typographyPresets: [] } as unknown as TemplateDesignLibrary
    const authored = renderToStaticMarkup(<SectionDecorativeLayers templateKey="classic-filipiniana-v1" viewport="desktop" appearance={{ frame: { style: 'fine', colorId: 'template-frame' } }} library={library} />)
    expect(authored).toContain('border-color:#123456')
    const project = renderToStaticMarkup(<SectionDecorativeLayers templateKey="classic-filipiniana-v1" viewport="desktop" appearance={{ frame: { style: 'fine', colorId: 'project-color-01ARZ3NDEKTSV4RRFFQ69G5FAV' } }} library={library} projectColors={[{ id: 'project-color-01ARZ3NDEKTSV4RRFFQ69G5FAV', value: '#654321' }]} />)
    expect(project).toContain('border-color:#654321')
    const unresolved = renderToStaticMarkup(<SectionDecorativeLayers templateKey="classic-filipiniana-v1" viewport="desktop" appearance={{ frame: { style: 'fine', colorId: 'missing' } }} library={library} />)
    expect(unresolved).toContain('border-color:var(--cf-secondary)')
  })
})
