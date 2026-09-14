import { describe, expect, it } from 'vitest'
import { normalizeWebsiteDraftFromApi, validateSectionContent } from './schemas'
import { genericTextSectionChildFlowSchema, textSectionChildFlowSchema } from './sectionChildFlow'

const appearance = { headingAlignment: 'inherit', bodyAlignment: 'inherit', backgroundTreatment: 'inherit', emphasis: 'inherit' }
const blank = (id: string, editorName: string) => ({
  id, type: 'blank', displayName: 'Section', editorName, sortOrder: 10, isEnabled: true,
  content: { semantic: {}, compositions: { shared: { childFlow: { elements: [], order: [] } } } }, appearance, designDefaults: {}, resolvedDesignContext: null,
  appearanceOptions: null, mediaCapability: null, itemMediaCapability: null, presentationCapability: null,
})
const draft = (sections: unknown[]) => ({
  schemaVersion: 5, id: 'website', eventId: 'event', name: 'Website', templateKey: 'classic-filipiniana-v1',
  designSettings: { colorTheme: 'terracotta', fontSet: 'editorial', artStyle: 'minimal', projectDefaults: {}, customColors: [] },
  projectDesignDefaults: null, template: null, sections, media: {},
})

describe('repeatable Blank Section hydration', () => {
  it('accepts repeated instances with stable IDs and persisted editor names', () => {
    const result = normalizeWebsiteDraftFromApi(draft([blank('one', 'Section 1'), blank('two', 'Travel notes')]))
    expect(result.sections.map(({ id }) => id)).toEqual(['one', 'two'])
    expect(result.sections.map(({ editorName }) => editorName)).toEqual(['Section 1', 'Travel notes'])
  })

  it('strictly rejects missing or malformed editor metadata and content shapes', () => {
    const missingName = { ...blank('one', 'Section 1') } as Record<string, unknown>
    delete missingName.editorName
    expect(() => normalizeWebsiteDraftFromApi(draft([missingName]))).toThrow()
    expect(() => normalizeWebsiteDraftFromApi(draft([{ ...blank('one', 'Section 1'), editorName: 1 }]))).toThrow()
    expect(() => normalizeWebsiteDraftFromApi(draft([{ ...blank('one', 'Section 1'), lifecycle: 'multiple' }]))).toThrow()
    expect(() => normalizeWebsiteDraftFromApi(draft([{ ...blank('one', 'Section 1'), content: { semantic: {}, compositions: { shared: { childFlow: [] } } } }]))).toThrow()
  })

  it('keeps generic-only and specialized flow contracts distinct', () => {
    const element = { id: 'text', type: 'text', editorName: 'Text 1', document: { type: 'doc' as const, children: [{ type: 'paragraph' as const, children: [{ text: 'Hello'  }] }] }}
    expect(genericTextSectionChildFlowSchema.safeParse({ elements: [element], order: [{ kind: 'element', id: 'text' }] }).success).toBe(true)
    expect(genericTextSectionChildFlowSchema.safeParse({ elements: [], order: [{ kind: 'specialized', key: 'content' }] }).success).toBe(false)
    expect(textSectionChildFlowSchema.safeParse({ elements: [], order: [{ kind: 'specialized', key: 'content' }] }).success).toBe(true)
    expect(textSectionChildFlowSchema.safeParse({ elements: [], order: [] }).success).toBe(false)
  })

  it('does not recognize removed Dress Code content as a canonical Section contract', () => {
    expect(validateSectionContent('dressCode', { heading: 'Attire', description: 'Formal' }).success).toBe(false)
  })

  it('does not recognize Date as a Section content contract', () => {
    expect(validateSectionContent('date', { heading: 'When', description: 'At noon' }).success).toBe(false)
  })

  it('rejects Story as a Section type during content validation and API hydration', () => {
    expect(validateSectionContent('story', { heading: 'Our Story', body: 'Once upon a time' }).success).toBe(false)
    expect(() => normalizeWebsiteDraftFromApi(draft([{ ...blank('story', 'Story'), type: 'story', content: { heading: 'Our Story', body: 'Once upon a time' } }]))).toThrow()
  })

  it('rejects People as a Section type while leaving the People element contract available', () => {
    const content = { heading: 'Wedding Party', groups: [] }
    expect(validateSectionContent('people', content).success).toBe(false)
    expect(() => normalizeWebsiteDraftFromApi(draft([{ ...blank('people', 'Wedding Party'), type: 'people', content }]))).toThrow()
  })

  it('rejects FAQ as a Section type during content validation and API hydration', () => {
    expect(validateSectionContent('faq', { heading: 'Questions', items: [] }).success).toBe(false)
    expect(() => normalizeWebsiteDraftFromApi(draft([{ ...blank('faq', 'FAQ'), type: 'faq', content: { heading: 'Questions', items: [] } }]))).toThrow()
  })

  it('rejects Schedule as a Section type during content validation and API hydration', () => {
    expect(validateSectionContent('schedule', { heading: 'Schedule', items: [] }).success).toBe(false)
    expect(() => normalizeWebsiteDraftFromApi(draft([{ ...blank('schedule', 'Schedule'), type: 'schedule', content: { heading: 'Schedule', items: [] } }]))).toThrow()
  })

  it('rejects Venue as a Section type during content validation and API hydration', () => {
    expect(validateSectionContent('venue', { heading: 'Venue', name: 'Garden Pavilion', address: 'Main Street', description: '' }).success).toBe(false)
    expect(() => normalizeWebsiteDraftFromApi(draft([{ ...blank('venue', 'Venue'), type: 'venue', content: { heading: 'Venue', name: 'Garden Pavilion', address: 'Main Street', description: '' } }]))).toThrow()
  })
})
