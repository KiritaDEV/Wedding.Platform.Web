import { describe, expect, it } from 'vitest'
import type { BlankContent, WebsiteSection } from './types'
import { authoredPropertyViewport, mergeScopedComposition, replaceScopedComposition, resolveEditorCompositionTarget } from './editorComposition'
import { updateSectionTextDocument } from './sectionChildFlow'

const composition = (text: string) => ({ childFlow: { elements: [{ id: text, type: 'text' as const, editorName: 'Text 1', document: { type: 'doc' as const, children: [{ type: 'paragraph' as const, children: [{ text }] }] } }], order: [{ kind: 'element' as const, id: text }] } })
const section = { id: 'section', type: 'blank', content: { semantic: {}, compositions: { shared: composition('shared'), custom: { desktop: composition('desktop'), tablet: composition('tablet'), mobile: composition('mobile') } } } } as WebsiteSection

describe('composition-aware editor state', () => {
  it.each(['desktop', 'tablet', 'mobile'] as const)('authors base properties while rendering the %s target', () => {
    expect(authoredPropertyViewport()).toBe('desktop')
  })
  it('derives explicit shared and custom scopes from the canonical resolver', () => {
    expect(resolveEditorCompositionTarget(section, 'mobile').scope).toEqual({ kind: 'custom', viewport: 'mobile' })
    const sharedOnly = structuredClone(section)
    delete (sharedOnly.content as BlankContent).compositions.custom!.mobile
    expect(resolveEditorCompositionTarget(sharedOnly, 'mobile').scope).toEqual({ kind: 'shared' })
  })

  it('changes only the scoped composition', () => {
    const next = replaceScopedComposition(section.content as Record<string, unknown>, { kind: 'custom', viewport: 'mobile' }, composition('edited')) as BlankContent
    expect(next.compositions.shared).toEqual(composition('shared'))
    expect(next.compositions.custom!.desktop).toEqual(composition('desktop'))
    expect(next.compositions.custom!.tablet).toEqual(composition('tablet'))
    expect(next.compositions.custom!.mobile).toEqual(composition('edited'))
  })

  it('merges into the freshest authoritative envelope before save', () => {
    const fresh = structuredClone(section.content) as BlankContent
    fresh.compositions.custom!.desktop = composition('desktop-newer')
    const next = mergeScopedComposition(fresh, { kind: 'custom', viewport: 'mobile' }, composition('mobile-edited')) as BlankContent
    expect(next.compositions.custom!.desktop).toEqual(composition('desktop-newer'))
    expect(next.compositions.custom!.mobile).toEqual(composition('mobile-edited'))
  })

  it('edits the selected Mobile Text document without changing shared or sibling customs', () => {
    const mobile = (section.content as BlankContent).compositions.custom!.mobile!
    const editedFlow = updateSectionTextDocument(mobile.childFlow, 'mobile', { type: 'doc', children: [{ type: 'paragraph', children: [{ text: 'and' }] }] })!
    const next = replaceScopedComposition(section.content as Record<string, unknown>, { kind: 'custom', viewport: 'mobile' }, { childFlow: editedFlow }) as BlankContent
    expect(next.compositions.shared).toEqual(composition('shared'))
    expect(next.compositions.custom!.desktop).toEqual(composition('desktop'))
    expect(next.compositions.custom!.tablet).toEqual(composition('tablet'))
    expect((next.compositions.custom!.mobile!.childFlow.elements[0] as { document: { children: { children: { text: string }[] }[] } }).document.children[0].children[0].text).toBe('and')
  })
})
