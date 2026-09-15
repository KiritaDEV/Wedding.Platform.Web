import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { ColorPreviewContext, createColorPreviewStore, scopedColorPreviewTarget } from './colorPreview'
import { SectionDecorativeLayers } from '../websiteRenderer/SectionDecorativeLayers'
import type { TemplateDesignLibrary } from '../websiteCapabilities/types'

vi.mock('react', async (original) => ({ ...await original<typeof import('react')>(), useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot() }))

const library = { colors: [{ id: 'accent', value: '#123456' }], fontFamilies: [], palettePresets: [], typographyPresets: [] } as unknown as TemplateDesignLibrary

it('previews the Frame picker color live only for the targeted editor Section', () => {
  const store = createColorPreviewStore()
  const render = (mode: 'editor' | 'public', sectionId = 'section') => renderToStaticMarkup(<ColorPreviewContext value={store}><SectionDecorativeLayers templateKey="classic-filipiniana-v1" appearance={{ frame: { style: 'fine', colorId: 'accent' } }} viewport="desktop" library={library} sectionId={sectionId} mode={mode} /></ColorPreviewContext>)
  const before = render('editor')
  const publicBefore = render('public')
  const session = store.begin(scopedColorPreviewTarget('section', 'frameColor'))
  session.update('#ABCDEF')
  expect(render('editor')).toContain('border-color:#ABCDEF')
  expect(render('editor', 'another-section')).not.toContain('#ABCDEF')
  expect(render('public')).toBe(publicBefore)
  session.clear()
  expect(render('editor')).toBe(before)
})
