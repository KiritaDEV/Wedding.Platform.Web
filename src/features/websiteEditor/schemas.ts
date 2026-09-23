import { isDividerAssetForTemplate } from "../websiteElements/divider";
import { z } from 'zod'
import type { RenderableWebsite, WebsiteDraft, WebsiteSection, WebsiteSectionAppearance } from './types'
import { CURRENT_WEBSITE_SCHEMA_VERSION } from './schema'
import { templateCapabilitiesSchema } from '../websiteCapabilities/schemas'
import { matchesCurrentDesignCatalog } from '../websiteTemplates/design/catalogs'
import { controlsForViewport, globalDesignCapability, presentationCapability, supportsGlobalDesignValue, sectionCapability } from '../websiteCapabilities/lookup'
import type { AppearanceControlCapability, SectionCapability } from '../websiteCapabilities/types'
import { projectColorsSchema } from '../websiteColors/projectColors'
import { gallerySectionChildFlowSchema, genericTextSectionChildFlowSchema } from './sectionChildFlow'
import { backgroundMediaSchema } from '../websiteMedia/backgroundMedia'
import { galleryImageItemSchema, groupPaddingSchema } from '../websiteElements/schemas'

const text = z.string()
const nonEmptyString = z.string().refine((value) => value.trim().length > 0, 'Required')
export const backgroundTreatmentSchema = z.enum(['inherit', 'plain', 'soft', 'accent', 'custom'])
export const opaqueHexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/).transform((value) => value.toUpperCase())
const designOptionSchema = z.object({ key: nonEmptyString, displayName: nonEmptyString }).strict()
const responsiveMediaSpacingSchema = z.object({
  top: nonEmptyString,
  right: nonEmptyString,
  bottom: nonEmptyString,
  left: nonEmptyString,
}).strict()
const responsiveAppearanceSchema = z.object({
  columns: z.number().int().min(1).max(6).optional(),
  gap: z.enum(['small', 'medium', 'large']).optional(),
  aspectRatio: z.enum(['square', 'portrait', 'landscape']).optional(),
  contentPosition: z.enum(['top-start', 'top-center', 'top-end', 'center-start', 'center', 'center-end', 'bottom-start', 'bottom-center', 'bottom-end']).optional(),
  innerSpacing: groupPaddingSchema.optional(),
  mediaPlacement: nonEmptyString.optional(),
  mediaSize: nonEmptyString.optional(),
  mediaContentGap: nonEmptyString.optional(),
  headingAlignment: nonEmptyString.optional(),
  bodyAlignment: nonEmptyString.optional(),
  mediaSpacing: responsiveMediaSpacingSchema.optional(),
}).strict()
const responsiveControlSchema = z.object({
  mediaPlacement: z.object({ default: nonEmptyString, options: z.array(designOptionSchema).min(1) }).strict().optional(),
  mediaSize: z.object({ default: nonEmptyString, options: z.array(designOptionSchema).min(1) }).strict().optional(),
  mediaContentGap: z.object({ default: nonEmptyString, options: z.array(designOptionSchema).min(1) }).strict().optional(),
  headingAlignment: z.object({ default: nonEmptyString, options: z.array(designOptionSchema).min(1) }).strict().optional(),
  bodyAlignment: z.object({ default: nonEmptyString, options: z.array(designOptionSchema).min(1) }).strict().optional(),
  mediaSpacing: z.object({
    default: responsiveMediaSpacingSchema,
    options: z.array(designOptionSchema).min(1),
  }).strict().optional(),
}).strict()
export const sectionCompositionSchema = z.object({ childFlow: genericTextSectionChildFlowSchema }).strict()
const galleryCompositionSchema = z.object({ childFlow: gallerySectionChildFlowSchema }).strict()
const compositionIdentityRefinement = (compositions: { shared: { childFlow: { elements: import('../websiteElements/types').WebsiteElement[] } }; custom?: Partial<Record<string, { childFlow: { elements: import('../websiteElements/types').WebsiteElement[] } }>> }, context: z.RefinementCtx) => {
  const seen = new Set<string>()
  const visitIdentity = (id: string, path: (string | number)[]) => {
    if (seen.has(id)) context.addIssue({ code: 'custom', message: `Owned IDs must be unique across all Section compositions; duplicate [${id}] found.`, path })
    seen.add(id)
  }
  const visit = (element: import('../websiteElements/types').WebsiteElement, path: (string | number)[]) => {
    visitIdentity(element.id, [...path, 'id'])
    if ('items' in element) element.items.forEach((item, index) => visitIdentity(item.id, [...path, 'items', index, 'id']))
    if (element.type === 'people') element.groups.forEach((group, groupIndex) => {
      visitIdentity(group.id, [...path, 'groups', groupIndex, 'id'])
      group.people.forEach((person, personIndex) => visitIdentity(person.id, [...path, 'groups', groupIndex, 'people', personIndex, 'id']))
    })
    if (element.type === 'compositionGroup') element.children.forEach((child, index) => visit(child, [...path, 'children', index]))
  }
  const branches = [['shared', compositions.shared], ...Object.entries(compositions.custom ?? {})] as const
  branches.forEach(([name, composition]) => composition?.childFlow.elements.forEach((element, index) => visit(element, [name, 'childFlow', 'elements', index])))
}
const galleryCompositionsSchema = z.object({
  shared: galleryCompositionSchema,
  custom: z.object({ desktop: galleryCompositionSchema.optional(), tablet: galleryCompositionSchema.optional(), mobile: galleryCompositionSchema.optional() }).strict().optional(),
}).strict().superRefine(compositionIdentityRefinement).transform((compositions) => compositions.custom && Object.keys(compositions.custom).length > 0 ? compositions : { shared: compositions.shared })
export const sectionCompositionsSchema = z.object({
  shared: sectionCompositionSchema,
  custom: z.object({ desktop: sectionCompositionSchema.optional(), tablet: sectionCompositionSchema.optional(), mobile: sectionCompositionSchema.optional() }).strict().optional(),
}).strict().superRefine(compositionIdentityRefinement).transform((compositions) => compositions.custom && Object.keys(compositions.custom).length > 0 ? compositions : { shared: compositions.shared })
export const heroContentSchema = z.object({ semantic: z.object({}).strict(), compositions: sectionCompositionsSchema }).strict()
export const galleryContentSchema = z.object({
  semantic: z.object({ items: z.array(galleryImageItemSchema).max(24).superRefine((items, context) => {
    const seen = new Set<string>()
    items.forEach((item, index) => {
      if (seen.has(item.id)) context.addIssue({ code: 'custom', path: [index, 'id'], message: 'Gallery item IDs must be unique.' })
      seen.add(item.id)
    })
  }) }).strict(),
  compositions: galleryCompositionsSchema,
}).strict()
export const rsvpContentSchema = z.object({ semantic: z.object({ heading: text, description: text, buttonLabel: text }).strict() }).strict()
export const blankContentSchema = z.object({ semantic: z.object({}).strict(), compositions: sectionCompositionsSchema }).strict()

const contentSchemas: Record<string, z.ZodType> = {
  hero: heroContentSchema,
  gallery: galleryContentSchema,
  rsvp: rsvpContentSchema,
  blank: blankContentSchema,
}

const capabilityBoundAppearanceFields = [
  'mediaPlacement',
  'mediaSize',
  'mediaContentGap',
  'mediaSpacing',
  'cornerStyle',
  'shadowStyle',
] as const
const responsiveCapabilityBoundAppearanceFields = [...capabilityBoundAppearanceFields, 'headingAlignment', 'bodyAlignment'] as const

function appearanceValueSupported(control: AppearanceControlCapability | undefined, value: unknown): boolean {
  if (!control) return false
  if (control.type === 'option') return typeof value === 'string' && control.options.some((option) => option.key === value)
  if (control.type === 'spacing') {
    return Boolean(value && typeof value === 'object' && ['top', 'right', 'bottom', 'left'].every((side) => {
      const sideValue = (value as Record<string, unknown>)[side]
      return typeof sideValue === 'string' && control.options.some((option) => option.key === sideValue)
    }))
  }
  return false
}

export function sectionAppearanceCapabilityIssues(capability: SectionCapability, appearance: WebsiteSectionAppearance) {
  const issues: Array<{ viewport: 'desktop' | 'tablet' | 'mobile'; field: typeof responsiveCapabilityBoundAppearanceFields[number] }> = []
  const presentation = presentationCapability(capability, appearance.presentation)
  const validate = (viewport: 'desktop' | 'tablet' | 'mobile', values: Record<string, unknown>, fields: readonly typeof responsiveCapabilityBoundAppearanceFields[number][]) => {
    const controls = controlsForViewport(capability, presentation, viewport)
    for (const field of fields) {
      const value = values[field]
      if (value === undefined) continue
      const control = controls.find(({ id }) => id === field)
      if (!appearanceValueSupported(control, value)) issues.push({ viewport, field })
    }
  }
  validate('desktop', appearance, capabilityBoundAppearanceFields)
  for (const viewport of ['tablet', 'mobile'] as const) {
    const override = appearance.responsive?.[viewport]
    if (override) validate(viewport, override, responsiveCapabilityBoundAppearanceFields)
  }
  return issues
}

function validateCapabilityBoundAppearance(capability: SectionCapability, appearance: WebsiteSectionAppearance, sectionIndex: number, context: z.RefinementCtx) {
  for (const issue of sectionAppearanceCapabilityIssues(capability, appearance)) {
    const path = issue.viewport === 'desktop' ? [] : ['responsive', issue.viewport]
    context.addIssue({ code: 'custom', message: `${issue.field} is not supported by this Template, Section, presentation, and viewport`, path: ['sections', sectionIndex, 'appearance', ...path, issue.field] })
  }
}

export function validateSectionContent(type: string, content: Record<string, unknown>, templateKey?: string) {
  const schema = contentSchemas[type]
  return schema ? schema.superRefine((value, context) => {
    if (!templateKey || typeof value !== "object" || value === null || !("compositions" in value)) return;
    const compositions = value.compositions as { shared: { childFlow: unknown }; custom?: Record<string, { childFlow: unknown }> };
    const visit = (element: import("../websiteElements/types").WebsiteElement, path: (string | number)[]) => {
      if (element.type === "divider" && element.appearance?.assetId !== undefined && !isDividerAssetForTemplate(templateKey, element.appearance.assetId)) {
        context.addIssue({ code: "custom", message: "The selected Divider asset is not supported by this Template.", path: [...path, "appearance", "assetId"] });
      }
      if (element.type === "compositionGroup") element.children.forEach((child, index) => visit(child, [...path, "children", index]));
    };
    const branches = [["shared", compositions.shared], ...Object.entries(compositions.custom ?? {})] as const;
    branches.forEach(([branchName, branch]) => {
      const flow = genericTextSectionChildFlowSchema.safeParse(branch.childFlow);
      if (flow.success) flow.data.elements.forEach((element, index) => visit(element, ["compositions", branchName, "childFlow", "elements", index]));
    });
  }).safeParse(content) : { success: false as const, error: null }
}

export const sectionAppearanceSchema = z.object({
    columns: z.number().int().min(1).max(6).optional(),
    gap: z.enum(['small', 'medium', 'large']).optional(),
    aspectRatio: z.enum(['square', 'portrait', 'landscape']).optional(),
    backgroundMedia: backgroundMediaSchema,
    headingAlignment: z.enum(['inherit', 'left', 'center', 'right']),
    bodyAlignment: z.enum(['inherit', 'left', 'center', 'right']),
    backgroundTreatment: backgroundTreatmentSchema,
    decorativeAppearance: z.object({
      background: z.object({
        texture: z.enum(['none', 'paper', 'fabric', 'grain']).optional(),
        textureStrength: z.number().int().min(10).max(100).optional(),
        pattern: z.enum(['none', 'botanical', 'geometric', 'heritage']).optional(),
        patternStrength: z.number().int().min(10).max(100).optional(),
        overlay: z.enum(['none', 'soft', 'warm', 'deep']).optional(),
        colorId: nonEmptyString.optional(),
        customColor: opaqueHexColorSchema.optional(),
      }).strict().optional(),
      frame: z.object({
        style: z.enum(['none', 'fine', 'ornamental']).optional(),
        size: z.number().int().min(50).max(200).optional(),
        strength: z.number().int().min(0).max(100).optional(),
        colorId: nonEmptyString.optional(),
      }).strict().optional(),
    }).strict().optional(),
    emphasis: z.enum(['inherit', 'standard', 'featured', 'subtle']),
    presentation: nonEmptyString.optional(),
    mediaPlacement: nonEmptyString.optional(),
    mediaSize: nonEmptyString.optional(),
    cornerStyle: nonEmptyString.optional(),
    shadowStyle: nonEmptyString.optional(),
    overlayStrength: z.number().min(0).max(1).optional(),
    foregroundColor: nonEmptyString.optional(),
    mediaSpacing: z.object({
      top: z.enum(['none', 'small', 'medium', 'large']),
      right: z.enum(['none', 'small', 'medium', 'large']),
      bottom: z.enum(['none', 'small', 'medium', 'large']),
      left: z.enum(['none', 'small', 'medium', 'large']),
    }).strict().optional(),
    mediaContentGap: z.enum(['tight', 'comfortable', 'spacious', 'generous']).optional(),
    responsive: z.object({
      tablet: responsiveAppearanceSchema.optional(),
      mobile: responsiveAppearanceSchema.optional(),
    }).strict().optional(),
    backgroundImageOpacity: z.number().int().min(0).max(100).optional(),
    height: z.object({ unit: z.literal('svh'), value: z.number().int().min(25).max(150) }).strict().optional(),
    contentPosition: z.enum(['top-start', 'top-center', 'top-end', 'center-start', 'center', 'center-end', 'bottom-start', 'bottom-center', 'bottom-end']).optional(),
    innerSpacing: groupPaddingSchema.optional(),
  }).strict()
const sectionAppearanceEnvelopeSchema = z.object({
  shared: sectionAppearanceSchema,
  custom: z.object({ desktop: sectionAppearanceSchema.optional(), tablet: sectionAppearanceSchema.optional(), mobile: sectionAppearanceSchema.optional() }).strict().optional(),
}).strict()

const sectionSchema = z.object({
  id: z.string(), type: z.enum(['hero', 'gallery', 'rsvp', 'blank']), displayName: z.string(), editorName: z.string().min(1).max(80).nullable(), sortOrder: z.number(),
  isEnabled: z.boolean(), content: z.record(z.string(), z.unknown()),
  appearance: z.union([sectionAppearanceSchema, sectionAppearanceEnvelopeSchema]),
  designDefaults: z.object({
    headingFontId: nonEmptyString.optional(),
    bodyFontId: nonEmptyString.optional(),
    headingColorId: nonEmptyString.optional(),
    bodyColorId: nonEmptyString.optional(),
    accentColorId: nonEmptyString.optional(),
  }).strict().default({}),
  resolvedDesignContext: z.object({
    headingFontId: nonEmptyString,
    bodyFontId: nonEmptyString,
    headingColorId: nonEmptyString,
    bodyColorId: nonEmptyString,
    accentColorId: nonEmptyString,
  }).strict().nullable().default(null),
  appearanceOptions: z.object({
    headingAlignments: z.array(z.object({ key: z.string(), displayName: z.string() }).strict()),
    bodyAlignments: z.array(z.object({ key: z.string(), displayName: z.string() }).strict()),
    backgroundTreatments: z.array(z.object({ key: z.string(), displayName: z.string() }).strict()),
    emphasisOptions: z.array(z.object({ key: z.string(), displayName: z.string() }).strict()),
  }).strict().nullable(),
  mediaCapability: z.object({ mode: z.enum(['single', 'multiple']) }).strict().nullable(),
  itemMediaCapability: z.object({ itemType: z.literal('person'), mode: z.literal('single') }).strict().nullable(),
  presentationCapability: z.object({
    default: nonEmptyString,
    options: z.array(z.object({
      key: nonEmptyString, displayName: nonEmptyString, description: nonEmptyString, preview: nonEmptyString,
      mediaControls: z.object({
        mediaPlacements: z.object({ default: nonEmptyString, options: z.array(designOptionSchema).min(1) }).strict().optional(),
        mediaSizes: z.object({ default: nonEmptyString, options: z.array(designOptionSchema).min(1) }).strict().optional(),
        cornerStyles: z.object({ default: nonEmptyString, options: z.array(designOptionSchema).min(1) }).strict().optional(),
        shadowStyles: z.object({ default: nonEmptyString, options: z.array(designOptionSchema).min(1) }).strict().optional(),
        overlayStrength: z.object({ default: z.number(), min: z.number(), max: z.number(), step: z.number().positive() }).strict().optional(),
        foregroundColors: z.object({ default: nonEmptyString, options: z.array(designOptionSchema).min(1) }).strict().optional(),
        mediaSpacing: z.object({
          default: z.object({
            top: z.enum(['none', 'small', 'medium', 'large']),
            right: z.enum(['none', 'small', 'medium', 'large']),
            bottom: z.enum(['none', 'small', 'medium', 'large']),
            left: z.enum(['none', 'small', 'medium', 'large']),
          }).strict(),
          options: z.array(designOptionSchema).min(1),
        }).strict().optional(),
        mediaContentGaps: z.object({ default: nonEmptyString, options: z.array(designOptionSchema).min(1) }).strict().optional(),
        responsive: z.object({
          tablet: responsiveControlSchema.optional(),
          mobile: responsiveControlSchema.optional(),
        }).strict().optional(),
      }).strict().nullable(),
    }).strict()).min(1),
  }).strict().nullable(),
}).strict()

const projectDesignDefaultOverridesSchema = z.object({
  headingFontId: nonEmptyString.optional(),
  bodyFontId: nonEmptyString.optional(),
  headingColorId: nonEmptyString.optional(),
  bodyColorId: nonEmptyString.optional(),
  accentColorId: nonEmptyString.optional(),
}).strict()
const legacyDesignSettingsSchema = z.object({
  colorTheme: nonEmptyString,
  fontSet: nonEmptyString,
  artStyle: nonEmptyString,
}).strict()
const currentDesignSettingsSchema = legacyDesignSettingsSchema.extend({
  projectDefaults: projectDesignDefaultOverridesSchema,
  customColors: projectColorsSchema.default([]),
}).strict()

const renderableWebsiteCommonSchema = z.object({
  id: z.string(),
  templateKey: z.string(),
  projectDesignDefaults: z.object({
    headingFontId: nonEmptyString,
    bodyFontId: nonEmptyString,
    headingColorId: nonEmptyString,
    bodyColorId: nonEmptyString,
    accentColorId: nonEmptyString,
  }).strict().nullable(),
  template: z.object({
    key: nonEmptyString,
    displayName: nonEmptyString,
    designOptions: z.object({
      colorThemes: z.array(designOptionSchema).min(1),
      fontSets: z.array(designOptionSchema).min(1),
      artStyles: z.array(designOptionSchema).min(1),
    }).strict(),
    capabilities: templateCapabilitiesSchema,
  }).strict().nullable(),
  sections: z.array(sectionSchema),
  media: z.record(z.string(), z.object({
    id: z.string(), originalFilename: z.string(), width: z.number(), height: z.number(),
    web: z.object({ width: z.number(), height: z.number(), url: z.string().url() }).strict(),
  }).strict()),
}).strict()

const draftCommonSchema = renderableWebsiteCommonSchema.extend({
  eventId: z.string(),
  name: nonEmptyString.max(100),
}).strict()

const publicRenderableWebsiteSchema = renderableWebsiteCommonSchema.extend({
  schemaVersion: z.literal(CURRENT_WEBSITE_SCHEMA_VERSION),
  designSettings: currentDesignSettingsSchema,
  media: z.preprocess(
    (value) => Array.isArray(value) && value.length === 0 ? {} : value,
    renderableWebsiteCommonSchema.shape.media,
  ),
}).strict().transform((website) => ({
  ...website,
  designSettings: {
    ...website.designSettings,
    projectDefaults: 'projectDefaults' in website.designSettings ? website.designSettings.projectDefaults : {},
    customColors: website.designSettings.customColors ?? [],
  },
}))

const draftSchema = draftCommonSchema.extend({
  schemaVersion: z.literal(CURRENT_WEBSITE_SCHEMA_VERSION),
  designSettings: currentDesignSettingsSchema,
}).strict().transform((draft) => ({
  ...draft,
  designSettings: {
    ...draft.designSettings,
    projectDefaults: 'projectDefaults' in draft.designSettings ? draft.designSettings.projectDefaults : {},
    customColors: draft.designSettings.customColors ?? [],
  },
})).superRefine((draft, context) => {
  const rejectResponsive = (value: unknown, path: (string | number)[]): void => {
    if (Array.isArray(value)) return value.forEach((item, index) => rejectResponsive(item, [...path, index]))
    if (!value || typeof value !== 'object') return
    const record = value as Record<string, unknown>
    if (Object.hasOwn(record, 'responsive')) context.addIssue({ code: 'custom', message: 'Device-specific authored properties require a custom Section owner.', path: [...path, 'responsive'] })
    Object.entries(record).forEach(([key, item]) => rejectResponsive(item, [...path, key]))
  }
  draft.sections.forEach((section, index) => {
    if (section.type === 'hero' || section.type === 'blank') {
      rejectResponsive(section.content, ['sections', index, 'content'])
      rejectResponsive(section.appearance, ['sections', index, 'appearance'])
    }
  })
  if (!draft.template) return

  const designCapability = globalDesignCapability(draft.template.capabilities)
  if (!draft.projectDesignDefaults) {
    context.addIssue({ code: 'custom', message: 'Resolved Project Design Defaults are required for a supported Template', path: ['projectDesignDefaults'] })
    return
  }
  const projectDesignDefaults = draft.projectDesignDefaults
  const library = draft.template.capabilities.designLibrary
  const capability = draft.template.capabilities.projectDefaults
  const familyIds = new Set(library.fontFamilies.map(({ id }) => id))
  const colorIds = new Set(library.colors.map(({ id }) => id))
  const resolvedChecks = [
    ['headingFontId', familyIds, capability.typography.headingFont.allowedFontIds],
    ['bodyFontId', familyIds, capability.typography.bodyFont.allowedFontIds],
    ['headingColorId', colorIds, capability.colors.headingColor.allowedColorIds],
    ['bodyColorId', colorIds, capability.colors.bodyColor.allowedColorIds],
    ['accentColorId', colorIds, capability.colors.accentColor.allowedColorIds],
  ] as const

  const overrideChecks = [
    ['headingFontId', capability.typography.headingFont.allowedFontIds],
    ['bodyFontId', capability.typography.bodyFont.allowedFontIds],
    ['headingColorId', capability.colors.headingColor.allowedColorIds],
    ['bodyColorId', capability.colors.bodyColor.allowedColorIds],
    ['accentColorId', capability.colors.accentColor.allowedColorIds],
  ] as const
  overrideChecks.forEach(([key, allowedIds]) => {
    const id = draft.designSettings.projectDefaults[key]
    if (id !== undefined && !allowedIds.includes(id)) {
      context.addIssue({ code: 'custom', message: 'Project Design Default override is not allowed by this Template', path: ['designSettings', 'projectDefaults', key] })
    }
  })
  resolvedChecks.forEach(([key, libraryIds, allowedIds]) => {
    const id = projectDesignDefaults[key]
    if (!libraryIds.has(id) || !allowedIds.includes(id)) {
      context.addIssue({ code: 'custom', message: 'Resolved Project Design Default is not allowed by this Template', path: ['projectDesignDefaults', key] })
    }
  })

  if (!matchesCurrentDesignCatalog(draft.template.key, draft.template.capabilities.designLibrary)) {
    context.addIssue({ code: 'custom', message: 'Template Design Library does not match the current renderer catalog', path: ['template', 'capabilities', 'designLibrary'] })
  }

  for (const setting of ['colorTheme', 'fontSet', 'artStyle'] as const) {
    const value = draft.designSettings[setting]
    if (!supportsGlobalDesignValue(designCapability, setting, value)) {
      context.addIssue({
        code: 'custom',
        message: 'Design setting is not supported by the selected Template',
        path: ['designSettings', setting],
      })
    }
  }

  draft.sections.forEach((section, index) => {
    const composable = section.type === 'hero' || section.type === 'gallery' || section.type === 'blank'
    const envelope = composable && 'shared' in section.appearance ? section.appearance : null
    if (composable && !envelope) {
      context.addIssue({ code: 'custom', message: 'Composition Sections require a shared/custom appearance envelope', path: ['sections', index, 'appearance'] })
      return
    }
    if (!composable && 'shared' in section.appearance) {
      context.addIssue({ code: 'custom', message: 'Semantic-only Sections require one Section appearance', path: ['sections', index, 'appearance'] })
      return
    }
    if (envelope) {
      const content = section.content as { compositions?: { custom?: Record<string, unknown> } }
      for (const viewport of ['desktop', 'tablet', 'mobile'] as const) {
        if (Boolean(content.compositions?.custom?.[viewport]) !== Boolean(envelope.custom?.[viewport])) context.addIssue({ code: 'custom', message: 'Custom composition and appearance must be paired', path: ['sections', index, 'appearance', 'custom', viewport] })
      }
    }
    const appearances = envelope ? [envelope.shared, ...Object.values(envelope.custom ?? {})] : [section.appearance as WebsiteSectionAppearance]
    const capability = sectionCapability(draft.template!.capabilities, section.type)
    const allowedContextValues = new Map<string, string[]>()
    capability?.contextDefaults.typography.forEach((control) => allowedContextValues.set(control.role === 'heading' ? 'headingFontId' : 'bodyFontId', control.allowedFontIds))
    capability?.contextDefaults.colors.forEach((control) => allowedContextValues.set(`${control.role}Id`, control.allowedColorIds))
    Object.entries(section.designDefaults).forEach(([key, id]) => {
      if (!allowedContextValues.get(key)?.includes(id)) {
        context.addIssue({ code: 'custom', message: 'Section Design Default is not allowed by this Template and Section', path: ['sections', index, 'designDefaults', key] })
      }
    })
    if (section.resolvedDesignContext) {
      const resolved = section.resolvedDesignContext
      for (const [key, libraryIds, allowedIds] of resolvedChecks) {
        if (!libraryIds.has(resolved[key]) || !allowedIds.includes(resolved[key])) {
          context.addIssue({ code: 'custom', message: 'Resolved Section Design Context is not allowed by this Template', path: ['sections', index, 'resolvedDesignContext', key] })
        }
      }
    }
    appearances.forEach((appearance) => {
    const presentation = appearance.presentation
    if (presentation && !capability?.presentations.some((option) => option.id === presentation)) {
      context.addIssue({
        code: 'custom',
        message: 'Presentation is not supported by the selected Template',
        path: ['sections', index, 'appearance', 'presentation'],
      })
    }
    if (capability && (!presentation || capability.presentations.some((option) => option.id === presentation))) {
      validateCapabilityBoundAppearance(capability, appearance, index, context)
    }
    const decorative = appearance.decorativeAppearance
    if (decorative && !capability?.decorativeAppearance) {
      context.addIssue({ code: 'custom', message: 'Decorative appearance is not supported by this Template and Section', path: ['sections', index, 'appearance', 'decorativeAppearance'] })
    } else if (decorative && capability?.decorativeAppearance) {
      for (const [field, allowed] of [
        ['texture', capability.decorativeAppearance.textures],
        ['pattern', capability.decorativeAppearance.patterns],
        ['overlay', capability.decorativeAppearance.overlays],
      ] as const) {
        const value = decorative.background?.[field]
        if (value !== undefined && !allowed.includes(value as never)) context.addIssue({ code: 'custom', message: `Decorative ${field} is not supported by this Template and Section`, path: ['sections', index, 'appearance', 'decorativeAppearance', 'background', field] })
      }
      const frame = decorative.frame?.style
      if (frame !== undefined && !capability.decorativeAppearance.frames.includes(frame)) context.addIssue({ code: 'custom', message: 'Decorative Frame is not supported by this Template and Section', path: ['sections', index, 'appearance', 'decorativeAppearance', 'frame', 'style'] })
      const frameColorId = decorative.frame?.colorId
      const allowedFrameColorIds = new Set([...capability.decorativeAppearance.frameColorIds, ...draft.designSettings.customColors.map(({ id }) => id)])
      if (frameColorId !== undefined && !allowedFrameColorIds.has(frameColorId)) context.addIssue({ code: 'custom', message: 'Decorative Frame color is not supported by this Website', path: ['sections', index, 'appearance', 'decorativeAppearance', 'frame', 'colorId'] })
    }
    })
  })
})

export function normalizeWebsiteDraftFromApi(value: unknown): WebsiteDraft {
  const draft = draftSchema.parse(value)
  const sections = draft.sections.map((section) => {
    const schema = contentSchemas[section.type]
    if (!schema) return section as WebsiteSection
    return { ...section, content: schema.parse(section.content) } as WebsiteSection
  })
  return { ...draft, sections }
}

export function normalizePublicRenderableWebsiteFromApi(value: unknown): RenderableWebsite {
  const website = publicRenderableWebsiteSchema.parse(value)
  const sections = website.sections.map((section) => {
    const schema = contentSchemas[section.type]
    if (!schema) return section as WebsiteSection
    return { ...section, content: schema.parse(section.content) } as WebsiteSection
  })
  return { ...website, sections }
}
