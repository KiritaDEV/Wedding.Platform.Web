import { z } from 'zod'
import { sharedContentDefinitionSchema } from '../websiteEditor/sharedContent'
import { snapshotWebsiteSchema } from '../websiteEditor/schemas'

const identity = z.string().ulid()
const nonEmpty = z.string().min(1).refine((value) => value.trim().length > 0, 'Required')

const snapshotSchema = z.object({
  project: z.object({ id: identity, eventId: identity, name: nonEmpty.max(100) }).strict(),
  event: z.object({
    id: identity,
    name: nonEmpty,
    slug: nonEmpty,
    type: z.literal('wedding'),
    eventDate: z.iso.date().nullable(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
    timeZone: nonEmpty.refine((zone) => {
      try { new Intl.DateTimeFormat('en', { timeZone: zone }); return true } catch { return false }
    }, 'Invalid time zone'),
    startsAtUtc: z.iso.datetime().nullable(),
  }).strict(),
  website: snapshotWebsiteSchema,
  mediaAssetIds: z.array(identity),
  sharedContentDefinitions: z.array(sharedContentDefinitionSchema.extend({ sectionId: identity })),
}).strict().superRefine((snapshot, context) => {
  const fail = (message: string) => context.addIssue({ code: 'custom', message })
  if (snapshot.project.id !== snapshot.website.id || snapshot.project.eventId !== snapshot.event.id) fail('Snapshot identity mismatch')
  if (snapshot.website.templateKey !== snapshot.website.template?.key) fail('Snapshot Template mismatch')
  const sections = snapshot.website.sections
  if (snapshot.sharedContentDefinitions.some(({ sectionId }) => !sections.some(({ id }) => id === sectionId))) fail('Unknown shared content owner')
  if (new Set(sections.map(({ id }) => id)).size !== sections.length) fail('Duplicate Section identity')
  const references = new Set<string>()
  // These keys are the canonical authored media references, including nested Groups.
  // Divider appearance.assetId refers to a built-in catalog and is deliberately excluded.
  const visit = (value: unknown, parentKey?: string): void => {
    if (Array.isArray(value)) { value.forEach((item) => visit(item, parentKey)); return }
    if (!value || typeof value !== 'object') return
    for (const [key, child] of Object.entries(value)) {
      if (typeof child === 'string' && (key === 'mediaId' || key === 'imageMediaId' || (key === 'assetId' && (parentKey === 'media' || parentKey === 'backgroundMedia')))) references.add(child)
      visit(child, key)
    }
  }
  sections.forEach((section, index) => {
    if (!identity.safeParse(section.id).success || !Number.isInteger(section.sortOrder)) fail('Invalid Section identity or order')
    const previous = sections[index - 1]
    if (previous && (previous.sortOrder > section.sortOrder || (previous.sortOrder === section.sortOrder && previous.id > section.id))) fail('Sections must be in stable draft order')
    if (section.type !== 'rsvp') {
      if (!('shared' in section.appearance)) fail('Composition Sections require an appearance envelope')
      else {
        for (const device of Object.keys(section.content.compositions.custom ?? {})) {
          if (!(device in (section.appearance.custom ?? {}))) fail('Custom composition requires paired appearance')
        }
      }
    }
    visit(section.content)
    visit(section.appearance)
  })
  const expected = [...references].sort()
  if (JSON.stringify(expected) !== JSON.stringify(snapshot.mediaAssetIds)) fail('Media identities must exactly match sorted unique authored references')
})

export type PublishedWebsiteSnapshot = z.infer<typeof snapshotSchema>

/** Strict storage-boundary decoder; no legacy adapters or operational data. */
export function decodePublishedWebsiteSnapshot(payload: unknown): PublishedWebsiteSnapshot {
  const input: unknown = typeof payload === 'string' ? JSON.parse(payload) : payload
  if (!input || typeof input !== 'object') return snapshotSchema.parse(input)
  const tree = structuredClone(input) as Record<string, unknown>
  const definitions = z.array(sharedContentDefinitionSchema.extend({ sectionId: identity })).parse(tree.sharedContentDefinitions)
  const website = tree.website as { sections?: Array<{ id: string; content: Record<string, unknown> }> } | undefined
  for (const section of website?.sections ?? []) {
    if ('sharedContentDefinitions' in section.content) throw new Error('Snapshot definitions must be captured once.')
    const owned = definitions.filter(({ sectionId }) => sectionId === section.id).map(({ sectionId, ...definition }) => { void sectionId; return definition })
    if (owned.length) section.content.sharedContentDefinitions = owned
  }
  return snapshotSchema.parse(tree)
}
