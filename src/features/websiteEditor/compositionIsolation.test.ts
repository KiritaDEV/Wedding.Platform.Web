import { describe, expect, it } from 'vitest'
import type { BlankContent, SectionComposition } from './types'
import type { SectionCompositionScope } from './editorComposition'
import { replaceScopedComposition } from './editorComposition'
import {
  createSectionElement,
  deleteGenericSectionElement,
  duplicateSectionElement,
  insertSectionElement,
  renameSectionElement,
  reorderSectionChild,
  setSectionElementHidden,
  updateSectionTextDocument,
} from './sectionChildFlow'

const text = (id: string, value = id) => ({ id, type: 'text' as const, editorName: 'Text 1', document: { type: 'doc' as const, children: [{ type: 'paragraph' as const, children: [{ text: value }] }] } })
const composition = (prefix: string): SectionComposition => ({ childFlow: {
  elements: [text(`${prefix}-a`), text(`${prefix}-b`), text(`${prefix}-c`)],
  order: [`${prefix}-a`, `${prefix}-b`, `${prefix}-c`].map((id) => ({ kind: 'element' as const, id })),
} })
const original = (): BlankContent => ({ semantic: {}, compositions: { shared: composition('s'), custom: { desktop: composition('d'), tablet: composition('t'), mobile: composition('m') } } })
const cases: [string, SectionCompositionScope][] = [
  ['shared', { kind: 'shared' }],
  ['desktop', { kind: 'custom', viewport: 'desktop' }],
  ['tablet', { kind: 'custom', viewport: 'tablet' }],
  ['mobile', { kind: 'custom', viewport: 'mobile' }],
]

function get(content: BlankContent, scope: SectionCompositionScope) {
  return scope.kind === 'shared' ? content.compositions.shared : content.compositions.custom![scope.viewport]!
}

function expectOnlyScopeChanged(before: BlankContent, after: BlankContent, scope: SectionCompositionScope) {
  for (const [, candidate] of cases) {
    if (JSON.stringify(candidate) === JSON.stringify(scope)) expect(get(after, candidate)).not.toEqual(get(before, candidate))
    else expect(get(after, candidate)).toEqual(get(before, candidate))
  }
  expect(after.semantic).toEqual(before.semantic)
}

describe('block-tree composition isolation', () => {
  it.each(cases)('%s isolates add, naming, visibility, rename, reorder, duplicate, Text edit, and delete', (_, scope) => {
    const before = original()
    let flow = structuredClone(get(before, scope).childFlow)
    const added = createSectionElement(flow, 'text')
    expect(added.editorName).toBe('Text 2')
    flow = insertSectionElement(flow, added)
    flow = setSectionElementHidden(flow, added.id, true)
    flow = renameSectionElement(flow, added.id, 'Names')
    flow = reorderSectionChild(flow, { kind: 'element', id: added.id }, { kind: 'element', id: flow.order[0].kind === 'element' ? flow.order[0].id : '' })
    const duplicated = duplicateSectionElement(flow, added.id)!
    flow = duplicated.flow
    flow = updateSectionTextDocument(flow, added.id, { type: 'doc', children: [{ type: 'paragraph', children: [{ text: 'Neil & Hazel' }] }] })!
    flow = deleteGenericSectionElement(flow, duplicated.elementId).flow
    const after = replaceScopedComposition(before, scope, { childFlow: flow }) as BlankContent
    expectOnlyScopeChanged(before, after, scope)
    expect(flow.elements.find(({ id }) => id === added.id)).toMatchObject({ editorName: 'Names', isHidden: true })
  })

  it.each(cases)('%s can add every supported generic block using active-tree naming and capacity', (_, scope) => {
    const before = original()
    let flow = structuredClone(get(before, scope).childFlow)
    for (const type of ['text', 'date', 'media', 'compositionGroup', 'divider', 'accordion', 'schedule', 'people'] as const) {
      flow = insertSectionElement(flow, createSectionElement(flow, type))
    }
    const after = replaceScopedComposition(before, scope, { childFlow: flow }) as BlankContent
    expectOnlyScopeChanged(before, after, scope)
    expect(flow.elements.slice(-8).map(({ type }) => type)).toEqual(['text', 'date', 'media', 'compositionGroup', 'divider', 'accordion', 'schedule', 'people'])
  })

  it('preserves an explicitly empty custom composition instead of falling back to shared', () => {
    const before = original()
    const after = replaceScopedComposition(before, { kind: 'custom', viewport: 'mobile' }, { childFlow: { elements: [], order: [] } }) as BlankContent
    expect(after.compositions.custom!.mobile).toEqual({ childFlow: { elements: [], order: [] } })
    expect(after.compositions.shared).toEqual(before.compositions.shared)
  })
})
