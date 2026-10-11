import { z } from 'zod'
import type { WebsiteProjectSummary } from './types'
import { projectColorsSchema } from '../websiteColors/projectColors'

const nonEmpty = z.string().refine((value) => value.trim().length > 0, 'Required')
const legacyDesignSettingsSchema = z.object({
  colorTheme: nonEmpty,
  fontSet: nonEmpty,
  artStyle: nonEmpty,
}).strict()
const currentDesignSettingsSchema = legacyDesignSettingsSchema.extend({
  projectDefaults: z.object({
    headingFontId: nonEmpty.optional(),
    bodyFontId: nonEmpty.optional(),
    headingColorId: nonEmpty.optional(),
    bodyColorId: nonEmpty.optional(),
    accentColorId: nonEmpty.optional(),
  }).strict(),
  customColors: projectColorsSchema.default([]),
}).strict()
const designSettingsSchema = z.union([
  currentDesignSettingsSchema,
  legacyDesignSettingsSchema,
]).transform((settings) => ({
  ...settings,
  projectDefaults: 'projectDefaults' in settings ? settings.projectDefaults : {},
  customColors: 'customColors' in settings ? settings.customColors : [],
}))

export const websiteProjectSummarySchema = z.object({
  id: nonEmpty,
  eventId: nonEmpty,
  name: nonEmpty.max(100),
  templateKey: nonEmpty,
  designSettings: designSettingsSchema,
  isPublished: z.boolean(),
}).strict()

export function parseWebsiteProjectList(value: unknown): WebsiteProjectSummary[] {
  return z.array(websiteProjectSummarySchema).parse(value)
}
