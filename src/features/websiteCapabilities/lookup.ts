import type { WebsiteElement } from '../websiteElements/types'
import type { ProjectDesignDefaults } from '../websiteEditor/types'
import type { ResponsiveViewport } from '../websiteEditor/types'
import type { AppearanceControlCapability, ContextDefaultsCapability, ContextDefaultsIntent, ElementCapability, GlobalDesignCapability, GlobalDesignControlCapability, PresentationCapability, ResolvedDesignContext, SectionCapability, TemplateCapabilities, TemplateDesignLibrary } from './types'

export function globalDesignCapability(capabilities: TemplateCapabilities): GlobalDesignCapability {
  return capabilities.globalDesign
}

export function templateDesignLibrary(capabilities: TemplateCapabilities): TemplateDesignLibrary {
  return capabilities.designLibrary
}

export function designColor(library: TemplateDesignLibrary, colorId: string) {
  return library.colors.find(({ id }) => id === colorId)
}

export function palettePreset(library: TemplateDesignLibrary, presetId: string) {
  return library.palettePresets.find(({ id }) => id === presetId)
}

export function fontFamily(library: TemplateDesignLibrary, fontId: string) {
  return library.fontFamilies.find(({ id }) => id === fontId)
}

export function typographyPreset(library: TemplateDesignLibrary, presetId: string) {
  return library.typographyPresets.find(({ id }) => id === presetId)
}

export function projectHeadingFont(library: TemplateDesignLibrary, defaults: ProjectDesignDefaults) {
  return fontFamily(library, defaults.headingFontId)
}

export function projectBodyFont(library: TemplateDesignLibrary, defaults: ProjectDesignDefaults) {
  return fontFamily(library, defaults.bodyFontId)
}

export function projectHeadingColor(library: TemplateDesignLibrary, defaults: ProjectDesignDefaults) {
  return designColor(library, defaults.headingColorId)
}

export function projectBodyColor(library: TemplateDesignLibrary, defaults: ProjectDesignDefaults) {
  return designColor(library, defaults.bodyColorId)
}

export function projectAccentColor(library: TemplateDesignLibrary, defaults: ProjectDesignDefaults) {
  return designColor(library, defaults.accentColorId)
}

export function globalDesignControl(
  capability: GlobalDesignCapability,
  controlId: GlobalDesignControlCapability['id'],
): GlobalDesignControlCapability | undefined {
  return capability.controls.find((control) => control.id === controlId)
}

export function globalDesignOptions(
  capability: GlobalDesignCapability,
  controlId: GlobalDesignControlCapability['id'],
) {
  return globalDesignControl(capability, controlId)?.options ?? []
}

export function globalDesignDefault(
  capability: GlobalDesignCapability,
  controlId: GlobalDesignControlCapability['id'],
): string | undefined {
  return globalDesignControl(capability, controlId)?.default
}

export function supportsGlobalDesignValue(
  capability: GlobalDesignCapability,
  controlId: GlobalDesignControlCapability['id'],
  value: string,
): boolean {
  return globalDesignOptions(capability, controlId).some((option) => option.key === value)
}

export function sectionCapability(capabilities: TemplateCapabilities, sectionId: string): SectionCapability | undefined {
  return capabilities.sections.find((section) => section.id === sectionId)
}

export function sectionContextDefaultsCapability(
  section: SectionCapability,
  presentation?: PresentationCapability,
): ContextDefaultsCapability {
  return presentation?.contextDefaults ?? section.contextDefaults
}

export function resolveInheritedDesignContext(
  parent: ResolvedDesignContext,
  capability: ContextDefaultsCapability,
  intent: ContextDefaultsIntent,
): ResolvedDesignContext {
  const allowed = new Map<string, string[]>()
  capability.typography.forEach((control) => allowed.set(control.role === 'heading' ? 'headingFontId' : 'bodyFontId', control.allowedFontIds))
  capability.colors.forEach((control) => allowed.set(`${control.role}Id`, control.allowedColorIds))
  Object.entries(intent).forEach(([key, value]) => {
    if (!value || !allowed.get(key)?.includes(value)) throw new Error(`Invalid contextual default: ${key}`)
  })
  return { ...parent, ...intent }
}

export function presentationCapability(section: SectionCapability, presentationId?: string): PresentationCapability | undefined {
  const id = presentationId ?? section.defaultPresentation
  return section.presentations.find((presentation) => presentation.id === id)
}

export function controlsForViewport(
  section: SectionCapability,
  presentation: PresentationCapability | undefined,
  viewport: ResponsiveViewport,
): AppearanceControlCapability[] {
  return [...section.appearanceControls, ...(presentation?.appearanceControls ?? [])]
    .map((control) => controlForViewport(control, viewport))
    .filter((control): control is AppearanceControlCapability => control !== undefined)
}

export function elementCapability(section: SectionCapability, elementType: WebsiteElement['type']): WebsiteElement['type'] | undefined {
  return section.elements?.allowedTypes.find((type) => type === elementType)
}

export function templateElementCapability(
  capabilities: TemplateCapabilities,
  elementType: WebsiteElement['type'],
): ElementCapability | undefined {
  return capabilities.elementCapabilities.find(({ type }) => type === elementType)
}

export function elementTypographyCapability(
  capability: ElementCapability | undefined,
  role: 'heading' | 'body',
) {
  return capability?.appearance?.typography.find((control) => control.role === role)
}

export function elementColorCapability(
  capability: ElementCapability | undefined,
  role: 'headingColor' | 'textColor' | 'accentColor',
) {
  return capability?.appearance?.colors.find((control) => control.role === role)
}

export function appearanceControl(
  section: SectionCapability,
  presentation: PresentationCapability | undefined,
  controlId: AppearanceControlCapability['id'],
  viewport: ResponsiveViewport = 'desktop',
): AppearanceControlCapability | undefined {
  return controlsForViewport(section, presentation, viewport).find((control) => control.id === controlId)
}

export function controlCapability(
  section: SectionCapability,
  controlId: AppearanceControlCapability['id'],
  presentationId?: string,
): AppearanceControlCapability | undefined {
  const presentation = presentationCapability(section, presentationId)
  return [...section.appearanceControls, ...(presentation?.appearanceControls ?? [])].find((control) => control.id === controlId)
}

export function controlForViewport(
  control: AppearanceControlCapability | undefined,
  viewport: ResponsiveViewport,
): AppearanceControlCapability | undefined {
  if (!control || viewport === 'desktop' || control.scope === 'shared' || control.type === 'number') return control
  const narrowing = control.viewports?.[viewport]
  if (!narrowing) return undefined
  if (control.type === 'option' && typeof narrowing.default === 'string') {
    return { ...control, default: narrowing.default, options: narrowing.options, viewports: undefined }
  }
  if (control.type === 'spacing' && typeof narrowing.default === 'object') {
    return { ...control, default: narrowing.default, options: narrowing.options, viewports: undefined }
  }
  return undefined
}

export function supportsControl(
  section: SectionCapability,
  controlId: AppearanceControlCapability['id'],
  presentationId?: string,
  viewport: ResponsiveViewport = 'desktop',
): boolean {
  return controlForViewport(controlCapability(section, controlId, presentationId), viewport) !== undefined
}

export function optionValues(control: AppearanceControlCapability | undefined) {
  return control?.type === 'option' || control?.type === 'spacing' ? control.options : []
}

export function controlDefault(control: AppearanceControlCapability | undefined): AppearanceControlCapability['default'] | undefined {
  return control?.default
}

export function isResponsiveControl(control: AppearanceControlCapability | undefined): boolean {
  return control?.scope === 'responsive'
}
