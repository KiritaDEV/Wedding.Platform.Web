import { z } from 'zod'
import { SPACING_PRESETS, SPACING_PRESET_CSS } from './spacing'
import { canonicalRuntimeTextAppearanceSchema } from './textAppearanceContract'
import { validateTextFontTuple } from './text'

export const SCHEDULE_TYPOGRAPHY_ROLES = ['dayHeading', 'activityTime', 'activityTitle', 'activityDescription', 'activityLocation', 'activityMapLink'] as const
export type ScheduleTypographyRole = typeof SCHEDULE_TYPOGRAPHY_ROLES[number]
// Use the Text contract, excluding effects and transforms outside this phase.
export const scheduleTypographySchema = canonicalRuntimeTextAppearanceSchema.omit({ textShadow: true, textShadowColorId: true, glow: true, glowColorId: true, textTransform: true }).superRefine((value, context) => {
  const issue = validateTextFontTuple(value)
  if (issue) context.addIssue({ code: 'custom', message: issue })
})

export const scheduleSpacing = z.enum(SPACING_PRESETS)
const colorId = z.string().min(1).refine((value) => Array.from(value).length <= 255).regex(/^\S+$/u)
export const scheduleLayoutAppearanceShape = {
  typography: z.object(Object.fromEntries(SCHEDULE_TYPOGRAPHY_ROLES.map((role) => [role, scheduleTypographySchema.optional()])) as Record<ScheduleTypographyRole, ReturnType<typeof scheduleTypographySchema.optional>>).strict().optional(),
  dateFormat: z.enum(['long', 'short', 'weekday']).optional(),
  timeFormat: z.enum(['12-hour', '24-hour']).optional(),
  showDescriptions: z.boolean().optional(),
  showLocations: z.boolean().optional(),
  showMapLinks: z.boolean().optional(),
  dayGap: scheduleSpacing.optional(),
  contentWidth: z.enum(['full', 'wide', 'medium', 'narrow']).optional(),
  contentAlignment: z.enum(['start', 'center', 'end']).optional(),
  layout: z.enum(['timeline', 'list', 'cards']).optional(),
  rowSpacing: scheduleSpacing.optional(),
  timeline: z.object({
    arrangement: z.enum(['left', 'alternating']).optional(),
    marker: z.enum(['dot', 'number', 'minimal']).optional(),
    markerColorId: colorId.optional(), lineColorId: colorId.optional(),
    lineWidth: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  }).strict().optional(),
  list: z.object({ timePosition: z.enum(['left', 'above']).optional(), separation: z.enum(['none', 'line']).optional() }).strict().optional(),
  cards: z.object({
    columns: z.enum(['single', 'grid']).optional(), gap: scheduleSpacing.optional(), padding: scheduleSpacing.optional(),
    backgroundColorId: colorId.optional(), borderColorId: colorId.optional(),
    borderWidth: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
    radius: z.enum(['none', 's', 'm', 'l']).optional(), alignment: z.enum(['start', 'center', 'end']).optional(),
  }).strict().optional(),
}
export const scheduleLayoutAppearanceSchema = z.object(scheduleLayoutAppearanceShape).strict()
export type ScheduleLayoutAppearance = z.infer<typeof scheduleLayoutAppearanceSchema>
export const scheduleSpacingValues = SPACING_PRESET_CSS

export function normalizeScheduleAppearance<T extends ScheduleLayoutAppearance>(appearance: T): T | undefined {
  const next = { ...appearance }
  if (next.typography) {
    const typography = { ...next.typography }
    for (const role of SCHEDULE_TYPOGRAPHY_ROLES) {
      if (typography[role] && !Object.keys(typography[role]).length) delete typography[role]
    }
    if (Object.keys(typography).length) next.typography = typography
    else delete next.typography
  }
  for (const group of ['timeline', 'list', 'cards'] as const) {
    if (next[group] && !Object.keys(next[group]).length) delete next[group]
  }
  return Object.keys(next).length ? next : undefined
}
