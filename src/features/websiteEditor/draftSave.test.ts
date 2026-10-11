import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api'
import { saveWebsiteDraft, updateWebsiteSectionContent } from './api'
import { draftSaveError, retainUnsubmittedEdit } from './draftSave'
import { normalizeWebsiteDraftFromApi } from './schemas'

const mocks = vi.hoisted(() => ({ request: vi.fn(), csrf: vi.fn() }))
vi.mock('../../lib/api', async (original) => ({ ...await original<typeof import('../../lib/api')>(), apiRequest: mocks.request, ensureCsrfCookie: mocks.csrf }))
const revision = '00000000000000000000000000'
const draft = { draftRevision: revision, schemaVersion: 5, id: 'project', eventId: 'event', name: 'Draft', templateKey: 'classic-filipiniana-v1', designSettings: { colorTheme: 'terracotta', fontSet: 'editorial', artStyle: 'clean', projectDefaults: {}, customColors: [] }, projectDesignDefaults: null, template: null, sections: [], media: {} }

beforeEach(() => { vi.clearAllMocks(); mocks.csrf.mockResolvedValue(undefined); mocks.request.mockResolvedValue({ data: draft }) })

describe('atomic draft API', () => {
  it('submits one PATCH with the loaded token, canonical device branches and omitted fields retained', async () => {
    const content = { semantic: { runtimeAppearance: { status: { responsive: { mobile: { fontSize: 'l' } } } } }, compositions: { shared: { childFlow: { elements: [], order: [] } }, custom: { mobile: { childFlow: { elements: [], order: [] } } } } }
    const changes = { sections: [{ id: 'section', content, isEnabled: false }], sectionIds: ['section'] }
    expect(await saveWebsiteDraft('event', 'project', revision, changes)).toEqual(draft)
    expect(mocks.request).toHaveBeenCalledExactlyOnceWith('/api/events/event/websites/project/draft', { method: 'PATCH', body: changes, headers: { 'X-Website-Draft-Revision': revision } })
    expect(changes.sections[0].content).toEqual(content)
    expect(mocks.csrf).toHaveBeenCalledTimes(1)
  })

  it('keeps project colors out of aggregate design writes and does not mutate caller state', async () => {
    const designSettings = { ...draft.designSettings, customColors: [{ id: 'project-color', value: '#123456' }] }
    await saveWebsiteDraft('event', 'project', revision, { designSettings })
    expect(mocks.request.mock.calls[0][1].body.designSettings).not.toHaveProperty('customColors')
    expect(designSettings.customColors).toHaveLength(1)
  })

  it('carries the same concurrency contract on immediate content mutations', async () => {
    await updateWebsiteSectionContent('event', 'project', revision, 'section', { semantic: {}, compositions: {} })
    expect(mocks.request.mock.calls[0][1].headers).toEqual({ 'X-Website-Draft-Revision': revision })
  })

  it.each([409, 422])('does not retry, reload or adopt another revision after %s', async (status) => {
    const error = new ApiError(status, 'Save rejected', {}, undefined, { currentDraftRevision: '01M00000000000000000000000' })
    mocks.request.mockRejectedValue(error)
    const changes = { sections: [{ id: 'section', isEnabled: false }] }
    await expect(saveWebsiteDraft('event', 'project', revision, changes)).rejects.toBe(error)
    expect(mocks.request).toHaveBeenCalledTimes(1)
    expect(changes).toEqual({ sections: [{ id: 'section', isEnabled: false }] })
  })

  it('requires a server token and rejects malformed tokens instead of inventing a fallback', () => {
    const { draftRevision, ...missing } = draft
    void draftRevision
    expect(() => normalizeWebsiteDraftFromApi(missing)).toThrow()
    expect(() => normalizeWebsiteDraftFromApi({ ...draft, draftRevision: 'today' })).toThrow()
  })
})

describe('save acknowledgement and errors', () => {
  it('clears exactly submitted input but retains subsequent edits, even when they look equal', () => {
    const submitted = { text: 'one' }
    const later = { text: 'two' }
    expect(retainUnsubmittedEdit(submitted, submitted)).toBeNull()
    expect(retainUnsubmittedEdit(later, submitted)).toBe(later)
    const equalLater = { text: 'one' }
    expect(retainUnsubmittedEdit(equalLater, submitted)).toBe(equalLater)
  })

  it('explains stale-state recovery and reports server validation paths', () => {
    expect(draftSaveError(new ApiError(409, 'Conflict'))).toContain('Reloading discards unsaved edits')
    expect(draftSaveError(new ApiError(422, 'Invalid', { 'sections.0.content': ['Select valid media.'] }))).toBe('sections.0.content: Select valid media.')
    expect(draftSaveError(new Error('offline'))).toContain('local edits have been kept')
  })
})
