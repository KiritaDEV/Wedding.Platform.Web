import { z } from 'zod'
import { scheduleContentSchema, type ScheduleDay } from '../websiteElements/scheduleContent'
import type { ScheduleElement, WebsiteElement } from '../websiteElements/types'
import type { SectionCompositions } from './types'
import { createSemanticId } from './createSemanticId'

export const sharedContentDefinitionSchema = z.object({
  id: z.string().min(1).max(255).regex(/^\S+$/u),
  type: z.literal('schedule'),
  content: scheduleContentSchema,
}).strict()
export const sharedContentDefinitionsSchema = z.array(sharedContentDefinitionSchema)
export type SharedContentDefinition = z.infer<typeof sharedContentDefinitionSchema>
export type SharedContentOwner = { compositions: SectionCompositions; sharedContentDefinitions?: SharedContentDefinition[] }
export type ResolvedSchedule = ScheduleElement & { days: ScheduleDay[] }

export function ownerElements(owner: SharedContentOwner): WebsiteElement[] {
  const elements: WebsiteElement[] = []
  const visit = (branch: WebsiteElement[]) => branch.forEach((element) => {
    elements.push(element)
    if (element.type === 'compositionGroup') visit(element.children)
  })
  for (const branch of [owner.compositions.shared, ...Object.values(owner.compositions.custom ?? {})]) visit(branch.childFlow.elements)
  return elements
}

export function validateSharedContent(owner: SharedContentOwner, context: z.RefinementCtx) {
  const definitions = owner.sharedContentDefinitions ?? []
  const byId = new Map(definitions.map((definition) => [definition.id, definition]))
  const fail = (message: string) => context.addIssue({ code: 'custom', path: ['sharedContentDefinitions'], message })
  if (byId.size !== definitions.length) fail('Duplicate shared content identity.')
  const used = new Set<string>()
  for (const element of ownerElements(owner)) {
    if (element.type !== 'schedule' || !element.contentId) continue
    const definition = byId.get(element.contentId)
    if (!definition || definition.type !== element.type) fail('Missing or incompatible Section-owned shared content.')
    used.add(element.contentId)
  }
  if (definitions.some(({ id }) => !used.has(id))) fail('Unreferenced definitions must be removed with the placement edit.')
}

export function resolveSchedule(element: ScheduleElement, definitions: readonly SharedContentDefinition[] = []): ResolvedSchedule {
  if (!element.contentId && element.days) return element as ResolvedSchedule
  const definition = definitions.find(({ id, type }) => id === element.contentId && type === element.type)
  if (!definition) throw new Error('Missing or incompatible shared Schedule content.')
  return { ...element, days: definition.content.days }
}

export function resolveSharedElement(element: WebsiteElement, definitions: readonly SharedContentDefinition[]): WebsiteElement {
  if (element.type === 'schedule') return resolveSchedule(element, definitions)
  if (element.type === 'compositionGroup') return { ...element, children: element.children.map((child) => resolveSharedElement(child, definitions)) } as WebsiteElement
  return element
}

export function pruneSharedContent<T extends SharedContentOwner>(owner: T): T {
  const used = new Set(ownerElements(owner).flatMap((element) => element.type === 'schedule' && element.contentId ? [element.contentId] : []))
  if (owner.sharedContentDefinitions) owner.sharedContentDefinitions = owner.sharedContentDefinitions.filter(({ id }) => used.has(id))
  return owner
}

/** Explicit opt-in/conversion: each local placement retains its own divergent content. */
export function optInSchedule(owner: SharedContentOwner, placementId: string): SharedContentOwner {
  const next = structuredClone(owner)
  const element = ownerElements(next).find(({ id }) => id === placementId)
  if (!element || element.type !== 'schedule') throw new Error('Schedule placement not found.')
  if (element.contentId) return next
  const contentId = createSemanticId('content')
  next.sharedContentDefinitions ??= []
  next.sharedContentDefinitions.push({ id: contentId, type: 'schedule', content: { days: structuredClone(element.days ?? []) } })
  element.contentId = contentId
  delete element.days
  return next
}

/** Applied only to an authored flow edit; customization uses a separate identity-only clone. */
export function reconcileSharedContent(previous: SharedContentOwner, next: SharedContentOwner): SharedContentOwner {
  const oldIds = new Set(ownerElements(previous).map(({ id }) => id))
  const copies = new Map<string, string>()
  const definitions = next.sharedContentDefinitions ?? []
  for (const element of ownerElements(next)) {
    if (element.type !== 'schedule') continue
    if (oldIds.has(element.id)) {
      if (element.contentId) delete element.days
      continue
    }
    const source = element.contentId ? definitions.find(({ id }) => id === element.contentId) : undefined
    if (element.contentId && !source) throw new Error('Missing duplicated Schedule definition.')
    const oldContentId = element.contentId
    let contentId = oldContentId ? copies.get(oldContentId) : undefined
    if (!contentId) {
      contentId = createSemanticId('content')
      if (oldContentId) copies.set(oldContentId, contentId)
      const days = structuredClone(source?.content.days ?? element.days ?? [])
      days.forEach((day) => { day.id = createSemanticId('schedule-day'); day.activities.forEach((activity) => { activity.id = createSemanticId('schedule-activity') }) })
      definitions.push({ id: contentId, type: 'schedule', content: { days } })
    }
    element.contentId = contentId
    delete element.days
  }
  if (definitions.length || next.sharedContentDefinitions) next.sharedContentDefinitions = definitions
  return pruneSharedContent(next)
}

export function updateSharedSchedule(owner: SharedContentOwner, placementId: string, days: ResolvedSchedule['days']): SharedContentOwner {
  const next = structuredClone(owner)
  const element = ownerElements(next).find(({ id }) => id === placementId)
  if (!element || element.type !== 'schedule' || !element.contentId) throw new Error('Shared Schedule placement not found.')
  const definition = next.sharedContentDefinitions?.find(({ id }) => id === element.contentId)
  if (!definition) throw new Error('Schedule definition not found.')
  definition.content.days = structuredClone(days)
  return next
}
