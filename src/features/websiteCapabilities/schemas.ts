import { z } from 'zod'
import { WEBSITE_ELEMENT_TYPES } from '../websiteElements/constants'
export const APPEARANCE_CONTROL_IDS = [
  'headingAlignment',
  'bodyAlignment',
  'backgroundTreatment',
  'emphasis',
  'presentation',
  'mediaPlacement',
  'mediaSize',
  'cornerStyle',
  'shadowStyle',
  'overlayStrength',
  'foregroundColor',
  'mediaSpacing',
  'mediaContentGap',
] as const

const optionSchema = z.object({ key: z.string().min(1), displayName: z.string().min(1) }).strict()
const globalDesignControlBase = {
  default: z.string().min(1),
  options: z.array(optionSchema).min(1),
}

export const globalDesignControlCapabilitySchema = z.discriminatedUnion('type', [
  z.object({
    ...globalDesignControlBase,
    id: z.literal('colorTheme'),
    type: z.literal('palettePreset'),
  }).strict(),
  z.object({
    ...globalDesignControlBase,
    id: z.literal('fontSet'),
    type: z.literal('typographyPairing'),
  }).strict(),
  z.object({
    ...globalDesignControlBase,
    id: z.literal('artStyle'),
    type: z.literal('artStyle'),
  }).strict(),
]).superRefine((control, context) => {
  const keys = control.options.map((option) => option.key)
  if (new Set(keys).size !== keys.length) {
    context.addIssue({ code: 'custom', message: 'Global design option keys must be unique', path: ['options'] })
  }
  if (!keys.includes(control.default)) {
    context.addIssue({ code: 'custom', message: 'Global design default must be an allowed option', path: ['default'] })
  }
})
export const globalDesignCapabilitySchema = z.object({
  controls: z.tuple([
    globalDesignControlCapabilitySchema,
    globalDesignControlCapabilitySchema,
    globalDesignControlCapabilitySchema,
  ]),
}).strict().superRefine((capability, context) => {
  const expected = ['colorTheme', 'fontSet', 'artStyle'] as const
  expected.forEach((id, index) => {
    if (capability.controls[index].id !== id) {
      context.addIssue({ code: 'custom', message: `Expected ${id} global design control`, path: ['controls', index, 'id'] })
    }
  })
})

const designColorSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  value: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  origin: z.literal('template'),
  allowedProjectRoles: z.array(z.enum(['heading', 'body', 'accent'])),
  allowedElementRoles: z.array(z.enum(['headingColor', 'textColor', 'accentColor'])),
  allowedContainerRoles: z.array(z.enum(['headingColor', 'bodyColor', 'accentColor', 'backgroundColor', 'frameColor'])),
}).strict()

const typographyRoleSchema = z.enum(['heading', 'body'])
const fontFamilySchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  allowedRoles: z.array(typographyRoleSchema).min(1),
  family: z.string().min(1),
  category: z.enum(['serif', 'sans', 'script', 'display', 'mono', 'legacy']),
  source: z.discriminatedUnion('type', [
    z.object({ type: z.literal('googleFonts'), apiFamily: z.string().min(1), upstreamUrl: z.string().url(), version: z.string().min(1) }).strict(),
    z.object({ type: z.literal('system') }).strict(),
    z.object({ type: z.literal('legacyAlias') }).strict(),
  ]),
  fallback: z.string(),
  weights: z.array(z.number().int().min(100).max(900)).min(1),
  styles: z.array(z.enum(['normal', 'italic'])).min(1),
  recommendedRoles: z.array(z.enum(['heading', 'body', 'accent'])),
  license: z.object({ id: z.string().min(1), url: z.string().url().optional() }).strict(),
}).strict()
const paletteRolesSchema = z.object({
  canvas: z.string().min(1),
  surface: z.string().min(1),
  text: z.string().min(1),
  textMuted: z.string().min(1),
  accent: z.string().min(1),
  accentContrast: z.string().min(1),
  border: z.string().min(1),
  ornament: z.string().min(1).optional(),
}).strict()
const palettePresetSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  roles: paletteRolesSchema,
}).strict()
const typographyPresetSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  headingFontId: z.string().min(1),
  bodyFontId: z.string().min(1),
}).strict()

export const templateDesignLibrarySchema = z.object({
  colors: z.array(designColorSchema).min(1),
  fontFamilies: z.array(fontFamilySchema).min(1),
  fontRecommendations: z.object({
    heading: z.array(z.string().min(1)),
    body: z.array(z.string().min(1)),
    accent: z.array(z.string().min(1)),
  }).strict(),
  palettePresets: z.array(palettePresetSchema).min(1),
  typographyPresets: z.array(typographyPresetSchema).min(1),
}).strict().superRefine((library, context) => {
  for (const collection of ['colors', 'fontFamilies', 'palettePresets', 'typographyPresets'] as const) {
    const ids = library[collection].map(({ id }) => id)
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: 'custom', message: `${collection} IDs must be unique`, path: [collection] })
    }
  }

  const colorIds = new Set(library.colors.map(({ id }) => id))
  library.palettePresets.forEach((preset, index) => {
    Object.entries(preset.roles).forEach(([role, colorId]) => {
      if (!colorIds.has(colorId)) context.addIssue({ code: 'custom', message: 'Unknown color reference', path: ['palettePresets', index, 'roles', role] })
    })
  })

  const families = new Map(library.fontFamilies.map((family) => [family.id, family]))
  Object.entries(library.fontRecommendations).forEach(([role, ids]) => {
    ids.forEach((id, index) => {
      if (!families.has(id)) context.addIssue({ code: 'custom', message: 'Unknown font recommendation', path: ['fontRecommendations', role, index] })
    })
    if (new Set(ids).size !== ids.length) context.addIssue({ code: 'custom', message: 'Font recommendations must be unique', path: ['fontRecommendations', role] })
  })
  library.typographyPresets.forEach((preset, index) => {
    if (!families.get(preset.headingFontId)?.allowedRoles.includes('heading')) {
      context.addIssue({ code: 'custom', message: 'Invalid heading font reference', path: ['typographyPresets', index, 'headingFontId'] })
    }
    if (!families.get(preset.bodyFontId)?.allowedRoles.includes('body')) {
      context.addIssue({ code: 'custom', message: 'Invalid body font reference', path: ['typographyPresets', index, 'bodyFontId'] })
    }
  })
})

export const projectDefaultsCapabilitySchema = z.object({
  typography: z.object({
    headingFont: z.object({ allowedFontIds: z.array(z.string().min(1)).min(1) }).strict(),
    bodyFont: z.object({ allowedFontIds: z.array(z.string().min(1)).min(1) }).strict(),
  }).strict(),
  colors: z.object({
    headingColor: z.object({ allowedColorIds: z.array(z.string().min(1)).min(1) }).strict(),
    bodyColor: z.object({ allowedColorIds: z.array(z.string().min(1)).min(1) }).strict(),
    accentColor: z.object({ allowedColorIds: z.array(z.string().min(1)).min(1) }).strict(),
  }).strict(),
}).strict()
const viewportOptionSchema = z.object({
  default: z.string().min(1),
  options: z.array(optionSchema).min(1),
}).strict()
const spacingValueSchema = z.enum(['none', 'small', 'medium', 'large'])
const spacingSchema = z.object({
  top: spacingValueSchema,
  right: spacingValueSchema,
  bottom: spacingValueSchema,
  left: spacingValueSchema,
}).strict()
const viewportSpacingSchema = z.object({
  default: spacingSchema,
  options: z.array(optionSchema).min(1),
}).strict()
const viewportOptions = <T extends z.ZodType>(schema: T) => z.object({
  tablet: schema.optional(),
  mobile: schema.optional(),
}).strict().optional()
const controlBase = {
  id: z.enum(APPEARANCE_CONTROL_IDS),
  scope: z.enum(['shared', 'responsive']),
}

export const appearanceControlCapabilitySchema = z.discriminatedUnion('type', [
  z.object({
    ...controlBase,
    type: z.literal('option'),
    default: z.string().min(1),
    options: z.array(optionSchema).min(1),
    viewports: viewportOptions(viewportOptionSchema),
  }).strict(),
  z.object({
    ...controlBase,
    type: z.literal('number'),
    default: z.number(),
    minimum: z.number(),
    maximum: z.number(),
    step: z.number().positive(),
  }).strict(),
  z.object({
    ...controlBase,
    type: z.literal('spacing'),
    default: spacingSchema,
    options: z.array(optionSchema).min(1),
    viewports: viewportOptions(viewportSpacingSchema),
  }).strict(),
])

export const presentationCapabilitySchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().min(1),
  preview: z.string().min(1),
  appearanceControls: z.array(appearanceControlCapabilitySchema),
  contextDefaults: z.lazy(() => contextDefaultsCapabilitySchema).nullable(),
}).strict()

export const contextDefaultsCapabilitySchema = z.object({
  typography: z.array(z.object({
    role: typographyRoleSchema,
    allowedFontIds: z.array(z.string().min(1)).min(1),
    scope: z.literal('shared'),
  }).strict()),
  colors: z.array(z.object({
    role: z.enum(['headingColor', 'bodyColor', 'accentColor']),
    allowedColorIds: z.array(z.string().min(1)).min(1),
    scope: z.literal('shared'),
  }).strict()),
}).strict()

export const sectionCapabilitySchema = z.object({
  id: z.string().min(1),
  appearanceControls: z.array(appearanceControlCapabilitySchema),
  contextDefaults: contextDefaultsCapabilitySchema,
  defaultPresentation: z.string().min(1).nullable(),
  presentations: z.array(presentationCapabilitySchema),
  elements: z.object({
    allowedTypes: z.array(z.enum(WEBSITE_ELEMENT_TYPES)),
    maxCount: z.number().int().positive(),
    compositionGroups: z.null(),
  }).strict().nullable().optional(),
  decorativeAppearance: z.object({
    textures: z.array(z.enum(['none', 'paper', 'fabric', 'grain'])),
    patterns: z.array(z.enum(['none', 'botanical', 'geometric', 'heritage'])),
    overlays: z.array(z.enum(['none', 'soft', 'warm', 'deep'])),
    frames: z.array(z.enum(['none', 'fine', 'ornamental'])),
    backgroundColorIds: z.array(z.string().min(1)).min(1),
    frameColorIds: z.array(z.string().min(1)).min(1),
  }).strict().nullable(),
}).strict()

const elementTypographyCapabilitySchema = z.object({
  role: typographyRoleSchema,
  allowedFontIds: z.array(z.string().min(1)).min(1),
  scope: z.literal('shared'),
}).strict()
const elementColorCapabilitySchema = z.object({
  role: z.enum(['headingColor', 'textColor', 'accentColor']),
  allowedColorIds: z.array(z.string().min(1)).min(1),
  scope: z.literal('shared'),
}).strict()
export const elementCapabilitySchema = z.object({
  type: z.enum(WEBSITE_ELEMENT_TYPES),
  appearance: z.object({
    typography: z.array(elementTypographyCapabilitySchema),
    colors: z.array(elementColorCapabilitySchema),
  }).strict().nullable(),
}).strict()

const expectedElementAppearanceRoles = {
  heading: { typography: ['heading'], colors: ['headingColor'] },
  text: { typography: ['body'], colors: ['textColor'] },
  date: null,
  accordion: null,
  schedule: null,
  people: null,
  quote: { typography: ['body'], colors: ['textColor'] },
  image: null,
  media: { typography: [], colors: [] },
  divider: null,
  cta: null,
  compositionGroup: null,
  eventDate: null,
  eventTime: null,
  countdown: null,
} as const

export const templateCapabilitiesSchema = z.object({
  globalDesign: globalDesignCapabilitySchema,
  designLibrary: templateDesignLibrarySchema,
  projectDefaults: projectDefaultsCapabilitySchema,
  projectColorLibrary: z.object({
    enabled: z.literal(true),
    maximum: z.literal(32),
    format: z.literal('opaqueHex'),
  }).strict(),
  elements: z.array(z.enum(WEBSITE_ELEMENT_TYPES)),
  elementCapabilities: z.array(elementCapabilitySchema),
  sections: z.array(sectionCapabilitySchema),
}).strict().superRefine((capabilities, context) => {
  for (const [controlId, presets] of [
    ['colorTheme', capabilities.designLibrary.palettePresets],
    ['fontSet', capabilities.designLibrary.typographyPresets],
  ] as const) {
    const options = capabilities.globalDesign.controls.find(({ id }) => id === controlId)?.options ?? []
    if (options.length !== presets.length || options.some((option, index) => option.key !== presets[index]?.id || option.displayName !== presets[index]?.displayName)) {
      context.addIssue({ code: 'custom', message: `${controlId} options must match design-library presets`, path: ['globalDesign', 'controls'] })
    }
  }

  const families = new Map(capabilities.designLibrary.fontFamilies.map((family) => [family.id, family]))
  const colors = new Map(capabilities.designLibrary.colors.map((color) => [color.id, color]))
  const validateContextDefaults = (capability: z.infer<typeof contextDefaultsCapabilitySchema>, path: Array<string | number>) => {
    const typographyRoles = capability.typography.map(({ role }) => role)
    const colorRoles = capability.colors.map(({ role }) => role)
    if (new Set(typographyRoles).size !== typographyRoles.length) context.addIssue({ code: 'custom', message: 'Context typography roles must be unique', path: [...path, 'typography'] })
    if (new Set(colorRoles).size !== colorRoles.length) context.addIssue({ code: 'custom', message: 'Context color roles must be unique', path: [...path, 'colors'] })
    capability.typography.forEach((control, controlIndex) => control.allowedFontIds.forEach((id, idIndex) => {
      if (!families.get(id)?.allowedRoles.includes(control.role)) context.addIssue({ code: 'custom', message: 'Illegal context font', path: [...path, 'typography', controlIndex, 'allowedFontIds', idIndex] })
    }))
    capability.colors.forEach((control, controlIndex) => control.allowedColorIds.forEach((id, idIndex) => {
      if (!colors.get(id)?.allowedContainerRoles.includes(control.role)) context.addIssue({ code: 'custom', message: 'Illegal context color', path: [...path, 'colors', controlIndex, 'allowedColorIds', idIndex] })
    }))
  }
  capabilities.sections.forEach((section, sectionIndex) => {
    validateContextDefaults(section.contextDefaults, ['sections', sectionIndex, 'contextDefaults'])
    section.decorativeAppearance?.frameColorIds.forEach((id, colorIndex) => {
      if (!colors.get(id)?.allowedContainerRoles.includes('frameColor')) context.addIssue({ code: 'custom', message: 'Illegal Frame color', path: ['sections', sectionIndex, 'decorativeAppearance', 'frameColorIds', colorIndex] })
    })
    section.presentations.forEach((presentation, presentationIndex) => {
      if (presentation.contextDefaults) validateContextDefaults(presentation.contextDefaults, ['sections', sectionIndex, 'presentations', presentationIndex, 'contextDefaults'])
    })
  })
  const elementTypes = capabilities.elementCapabilities.map(({ type }) => type)
  if (new Set(elementTypes).size !== elementTypes.length) {
    context.addIssue({ code: 'custom', message: 'Element capability types must be unique', path: ['elementCapabilities'] })
  }
  capabilities.elementCapabilities.forEach((element, elementIndex) => {
    const expected = expectedElementAppearanceRoles[element.type]
    if (expected === null) {
      if (element.appearance !== null) {
        context.addIssue({ code: 'custom', message: 'Element type does not support appearance', path: ['elementCapabilities', elementIndex, 'appearance'] })
      }
      return
    }
    if (!element.appearance) {
      context.addIssue({ code: 'custom', message: 'Element appearance capability is required', path: ['elementCapabilities', elementIndex, 'appearance'] })
      return
    }
    const typographyRoles = element.appearance.typography.map(({ role }) => role)
    const colorRoles = element.appearance.colors.map(({ role }) => role)
    if (new Set(typographyRoles).size !== typographyRoles.length) {
      context.addIssue({ code: 'custom', message: 'Element typography roles must be unique', path: ['elementCapabilities', elementIndex, 'appearance', 'typography'] })
    }
    if (new Set(colorRoles).size !== colorRoles.length) {
      context.addIssue({ code: 'custom', message: 'Element color roles must be unique', path: ['elementCapabilities', elementIndex, 'appearance', 'colors'] })
    }
    if (typographyRoles.length !== expected.typography.length || typographyRoles.some((role, index) => role !== expected.typography[index])) {
      context.addIssue({ code: 'custom', message: 'Element typography roles do not match its semantic type', path: ['elementCapabilities', elementIndex, 'appearance', 'typography'] })
    }
    if (colorRoles.length !== expected.colors.length || colorRoles.some((role, index) => role !== expected.colors[index])) {
      context.addIssue({ code: 'custom', message: 'Element color roles do not match its semantic type', path: ['elementCapabilities', elementIndex, 'appearance', 'colors'] })
    }
    element.appearance.typography.forEach((control, controlIndex) => {
      control.allowedFontIds.forEach((id, idIndex) => {
        if (!families.get(id)?.allowedRoles.includes(control.role)) {
          context.addIssue({ code: 'custom', message: 'Illegal element font', path: ['elementCapabilities', elementIndex, 'appearance', 'typography', controlIndex, 'allowedFontIds', idIndex] })
        }
      })
    })
    element.appearance.colors.forEach((control, controlIndex) => {
      control.allowedColorIds.forEach((id, idIndex) => {
        if (!colors.get(id)?.allowedElementRoles.includes(control.role)) {
          context.addIssue({ code: 'custom', message: 'Illegal element color', path: ['elementCapabilities', elementIndex, 'appearance', 'colors', controlIndex, 'allowedColorIds', idIndex] })
        }
      })
    })
  })
  for (const [path, ids, role] of [
    ['headingFont', capabilities.projectDefaults.typography.headingFont.allowedFontIds, 'heading'],
    ['bodyFont', capabilities.projectDefaults.typography.bodyFont.allowedFontIds, 'body'],
  ] as const) {
    ids.forEach((id, index) => {
      if (!families.get(id)?.allowedRoles.includes(role)) context.addIssue({ code: 'custom', message: `Illegal ${role} font`, path: ['projectDefaults', 'typography', path, 'allowedFontIds', index] })
    })
  }
  for (const [path, ids, role] of [
    ['headingColor', capabilities.projectDefaults.colors.headingColor.allowedColorIds, 'heading'],
    ['bodyColor', capabilities.projectDefaults.colors.bodyColor.allowedColorIds, 'body'],
    ['accentColor', capabilities.projectDefaults.colors.accentColor.allowedColorIds, 'accent'],
  ] as const) {
    ids.forEach((id, index) => {
      if (!colors.get(id)?.allowedProjectRoles.includes(role)) context.addIssue({ code: 'custom', message: `Illegal ${role} color`, path: ['projectDefaults', 'colors', path, 'allowedColorIds', index] })
    })
  }
})
