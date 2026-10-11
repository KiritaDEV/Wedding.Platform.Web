import { describe, expect, it } from 'vitest'
import { isGallerySectionRenderable } from './blankSectionRenderability'
import type { WebsiteSection } from '../websiteEditor/types'

const text = (id: string, value: string, isHidden = false) => ({ id, type: 'text' as const, editorName: 'Text 1', isHidden, document: { type: 'doc' as const, children: [{ type: 'paragraph' as const, children: [{ text: value }] }] } })
const gallery = (elements: unknown[] = [], items: unknown[] = []) => ({
  id: 'gallery', type: 'gallery', content: { semantic: { items }, compositions: { shared: { childFlow: { elements, order: [...elements.map((element) => ({ kind: 'element', id: (element as { id: string }).id })), { kind: 'specialized', key: 'content' }] } } } },
  appearance: { shared: { headingAlignment: 'inherit', bodyAlignment: 'inherit', backgroundTreatment: 'inherit', emphasis: 'inherit' } },
} as unknown as WebsiteSection)

describe('Gallery public renderability', () => {
  const renderable = (section: WebsiteSection, media = {}) => isGallerySectionRenderable(section, 'classic-filipiniana-v1', media, null)

  it('counts only visible generic content', () => {
    expect(renderable(gallery([text('hidden', 'Hidden', true)]))).toBe(false)
    expect(renderable(gallery([{ id: 'group', type: 'compositionGroup', editorName: 'Group', isHidden: true, children: [] }]))).toBe(false)
    expect(renderable(gallery([{ id: 'group', type: 'compositionGroup', editorName: 'Group', isHidden: true, children: [text('child', 'Visible child')] }]))).toBe(false)
    expect(renderable(gallery([text('visible', 'Visible')]))).toBe(true)
  })

  it('counts only resolved Gallery images', () => {
    const section = gallery([], [{ id: 'item', type: 'image', mediaId: 'asset' }])
    expect(renderable(section)).toBe(false)
    expect(renderable(section, { asset: { id: 'asset' } })).toBe(true)
  })
})
