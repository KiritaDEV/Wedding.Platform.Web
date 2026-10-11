import { z } from 'zod'

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const localTime = z.string().regex(/^\d{2}:\d{2}$/)
const utcInstant = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
const eventBaseSchema = z.object({
  id: z.string().min(1),
  type: z.literal('wedding'),
  name: z.string(),
  slug: z.string(),
  eventDate: dateOnly.nullable(),
  startTime: localTime.nullable(),
  timeZone: z.string().min(1),
  rsvpIsOpen: z.boolean(),
  rsvpDeadline: dateOnly.nullable(),
  rsvpIsEffectivelyOpen: z.boolean(),
  startsAtUtc: utcInstant.nullable(),
  status: z.enum(['active', 'archived']),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const eventSchema = eventBaseSchema.extend({ membershipRole: z.enum(['owner', 'admin']) })
export const eventDetailSchema = eventBaseSchema.extend({ membershipRole: z.enum(['owner', 'admin']).nullable() })

export const timeZoneOptionSchema = z.object({ id: z.string().min(1), displayName: z.string().min(1) }).strict()

export const createEventSchema = z.object({
  name: z.string().trim().min(1, 'Event name is required.').max(255, 'Use 255 characters or fewer.'),
  type: z.literal('wedding'),
  eventDate: z.string().refine(
    (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
    'Enter a valid event date.',
  ),
  slug: z.string().trim().max(255, 'Use 255 characters or fewer.')
    .refine((value) => !value || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), 'Use lowercase letters, numbers, and hyphens.'),
  timeZone: z.string().min(1, 'Select a valid time zone.'),
})

export type CreateEventFormValues = z.infer<typeof createEventSchema>
