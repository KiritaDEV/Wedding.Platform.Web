import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { blankContentSchema } from './schemas'
import { createScheduleElement, duplicateSectionElement, deleteGenericSectionElement, updateSectionElement } from './sectionChildFlow'
import { createCustomSectionComposition, removeCustomSectionComposition } from './compositionLifecycle'
import { replaceEditedScopedComposition } from './editorComposition'
import { optInSchedule, ownerElements, resolveSchedule, updateSharedSchedule, type SharedContentOwner } from './sharedContent'
import { ScheduleElementRenderer } from '../websiteRenderer/ScheduleElementRenderer'

const days = [{ id: 'day', date: null, title: null, visible: true, activities: [{ id: 'entry', startTime: '10:00', endTime: null, title: 'Ceremony', description: 'Welcome', location: null, mapUrl: null, imageMediaId: null, visible: true }] }]
function local(): SharedContentOwner {
  return { compositions: { shared: { childFlow: { elements: [{ ...createScheduleElement('Schedule 1'), id: 'placement', days }], order: [{ kind: 'element', id: 'placement' }] } } } }
}
function shared() { return optInSchedule(local(), 'placement') }
function content(owner: SharedContentOwner) { return { semantic: {}, ...owner } }
function schedules(owner: SharedContentOwner) { return ownerElements(owner).filter((element) => element.type === 'schedule') }

describe('Section-owned opt-in shared content', () => {
  it('keeps local Schedule valid and opts in without changing placement identity or entries', () => {
    expect(blankContentSchema.safeParse(content(local())).success).toBe(true)
    const next = shared()
    expect(schedules(next)[0]).toMatchObject({ id: 'placement', contentId: next.sharedContentDefinitions![0].id })
    expect(schedules(next)[0].days).toBeUndefined()
    expect(resolveSchedule(schedules(next)[0], next.sharedContentDefinitions).days).toEqual(days)
    expect(blankContentSchema.safeParse(content(next)).success).toBe(true)
    expect(schedules(local())[0].contentId).toBeUndefined()
  })
  it('creates a shared definition through the real authored flow boundary', () => {
    const empty = { semantic: {}, compositions: { shared: { childFlow: { elements: [], order: [] } } } }
    const next = replaceEditedScopedComposition(empty, { kind: 'shared' }, local().compositions.shared) as unknown as SharedContentOwner
    expect(schedules(next)[0].contentId).toBe(next.sharedContentDefinitions![0].id)
  })
  it.each(['desktop', 'tablet', 'mobile'] as const)('customizes %s with distinct placement and shared semantic identity', (viewport) => {
    const owner = shared()
    const next = createCustomSectionComposition(content(owner), viewport)
    const placements = schedules(next)
    expect(placements[0].id).not.toBe(placements[1].id)
    expect(placements[0].contentId).toBe(placements[1].contentId)
    expect(blankContentSchema.safeParse(next).success).toBe(true)
    const edited = updateSharedSchedule(next, placements[1].id, [{ ...days[0], activities: [{ ...days[0].activities[0], title: 'Edited from device' }] }])
    expect(schedules(edited).map((placement) => resolveSchedule(placement, edited.sharedContentDefinitions).days[0].activities[0].title)).toEqual(['Edited from device', 'Edited from device'])
    expect(owner.sharedContentDefinitions![0].content.days[0].activities[0].title).toBe('Ceremony')
  })
  it('keeps placement appearance, visibility, names, and ordering independent', () => {
    const owner = createCustomSectionComposition(content(shared()), 'mobile')
    const mobile = owner.compositions.custom!.mobile!
    const placement = schedules(owner)[1]
    const edited = replaceEditedScopedComposition(owner, { kind: 'custom', viewport: 'mobile' }, {
      childFlow: updateSectionElement(mobile.childFlow, { ...placement, isHidden: true, editorName: 'Mobile', appearance: { outerSpacing: { top: 'xl' } } }),
    }) as unknown as SharedContentOwner
    expect(schedules(edited)[0].isHidden).toBeUndefined()
    expect(schedules(edited)[1].isHidden).toBe(true)
    expect(edited.sharedContentDefinitions).toEqual(owner.sharedContentDefinitions)
  })
  it('duplicates Schedule independently and preserves other device references', () => {
    const owner = createCustomSectionComposition(content(shared()), 'mobile')
    const duplicate = duplicateSectionElement(owner.compositions.shared.childFlow, 'placement')!
    const next = replaceEditedScopedComposition(owner, { kind: 'shared' }, { childFlow: duplicate.flow }) as unknown as SharedContentOwner
    const placements = schedules(next)
    expect(placements[0].contentId).not.toBe(placements[1].contentId)
    expect(placements[0].contentId).toBe(placements[2].contentId)
    const edited = updateSharedSchedule(next, duplicate.elementId, [{ ...days[0], activities: [{ ...days[0].activities[0], title: 'Independent' }] }])
    expect(resolveSchedule(schedules(edited)[0], edited.sharedContentDefinitions).days[0].activities[0].title).toBe('Ceremony')
  })
  it('remaps a duplicated Group once for each distinct content identity', () => {
    const owner = shared()
    const first = schedules(owner)[0]
    const group = { id: 'group', type: 'compositionGroup' as const, editorName: 'Group 1', children: [first, { ...first, id: 'second' }] }
    owner.compositions.shared.childFlow = { elements: [group], order: [{ kind: 'element', id: 'group' }] }
    const duplicate = duplicateSectionElement(owner.compositions.shared.childFlow, 'group')!
    const next = replaceEditedScopedComposition(content(owner), { kind: 'shared' }, { childFlow: duplicate.flow }) as unknown as SharedContentOwner
    const placements = schedules(next)
    expect(placements[2].contentId).toBe(placements[3].contentId)
    expect(placements[0].contentId).not.toBe(placements[2].contentId)
    expect(next.sharedContentDefinitions).toHaveLength(2)
  })
  it('removes only orphaned definitions when deleting placements and resetting a device', () => {
    const owner = createCustomSectionComposition(content(shared()), 'mobile')
    const next = replaceEditedScopedComposition(owner, { kind: 'shared' }, { childFlow: deleteGenericSectionElement(owner.compositions.shared.childFlow, 'placement').flow }) as unknown as SharedContentOwner
    expect(next.sharedContentDefinitions).toHaveLength(1)
    expect(removeCustomSectionComposition(content(next), 'mobile').sharedContentDefinitions).toEqual([])
    expect(removeCustomSectionComposition(owner, 'mobile').sharedContentDefinitions).toHaveLength(1)
  })
  it('preserves divergent local copies during explicit opt-in', () => {
    const owner = createCustomSectionComposition(content(local()), 'mobile')
    const placements = schedules(owner)
    placements[1].days![0].activities[0].title = 'Divergent'
    const first = optInSchedule(owner, placements[0].id)
    const both = optInSchedule(first, placements[1].id)
    expect(schedules(both).map((placement) => resolveSchedule(placement, both.sharedContentDefinitions).days[0].activities[0].title)).toEqual(['Ceremony', 'Divergent'])
    expect(both.sharedContentDefinitions).toHaveLength(2)
  })
  it.each(['missing', 'duplicate', 'wrong-type', 'dangling', 'cross-section', 'orphan', 'both', 'cycle', 'unknown-field'])('rejects %s data', (kind) => {
    const owner = content(shared())
    const definition = owner.sharedContentDefinitions![0]
    const placement = schedules(owner)[0]
    const invalid = structuredClone(owner) as unknown as { sharedContentDefinitions: Record<string, unknown>[]; compositions: SharedContentOwner['compositions'] }
    if (kind === 'missing') delete invalid.sharedContentDefinitions[0].id
    if (kind === 'duplicate') invalid.sharedContentDefinitions.push({ ...invalid.sharedContentDefinitions[0] })
    if (kind === 'wrong-type') invalid.sharedContentDefinitions[0].type = 'text'
    if (kind === 'dangling' || kind === 'cross-section') schedules(invalid as unknown as SharedContentOwner)[0].contentId = 'foreign-content'
    if (kind === 'orphan') invalid.sharedContentDefinitions.push({ ...invalid.sharedContentDefinitions[0], id: 'orphan' })
    if (kind === 'both') schedules(invalid as unknown as SharedContentOwner)[0].days = days
    if (kind === 'cycle') invalid.sharedContentDefinitions[0].content = { contentId: definition.id }
    if (kind === 'unknown-field') invalid.sharedContentDefinitions[0].secret = 'unexpected'
    expect(blankContentSchema.safeParse(invalid).success).toBe(false)
    expect(placement.contentId).toBe(definition.id)
  })
  it('renders the resolved flat Schedule without a mutable lookup', () => {
    const owner = shared()
    const html = renderToStaticMarkup(<ScheduleElementRenderer element={resolveSchedule(schedules(owner)[0], owner.sharedContentDefinitions)} mode="public" templateKey="modern-editorial-v1" />)
    expect(html).toContain('Ceremony')
    expect(html).toContain('10:00 AM')
  })
})
