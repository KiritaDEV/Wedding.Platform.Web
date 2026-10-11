import { z } from 'zod'
import type {
  appearanceControlCapabilitySchema,
  contextDefaultsCapabilitySchema,
  elementCapabilitySchema,
  globalDesignCapabilitySchema,
  globalDesignControlCapabilitySchema,
  presentationCapabilitySchema,
  projectDefaultsCapabilitySchema,
  sectionCapabilitySchema,
  templateDesignLibrarySchema,
  templateCapabilitiesSchema,
} from './schemas'

export type AppearanceControlCapability = z.infer<typeof appearanceControlCapabilitySchema>
export type ContextDefaultsCapability = z.infer<typeof contextDefaultsCapabilitySchema>
export type ElementCapability = z.infer<typeof elementCapabilitySchema>
export type GlobalDesignCapability = z.infer<typeof globalDesignCapabilitySchema>
export type GlobalDesignControlCapability = z.infer<typeof globalDesignControlCapabilitySchema>
export type PresentationCapability = z.infer<typeof presentationCapabilitySchema>
export type ProjectDefaultsCapability = z.infer<typeof projectDefaultsCapabilitySchema>
export type SectionCapability = z.infer<typeof sectionCapabilitySchema>
export type TemplateDesignLibrary = z.infer<typeof templateDesignLibrarySchema>
export type TemplateCapabilities = z.infer<typeof templateCapabilitiesSchema>

export type ContextDefaultsIntent = {
  headingFontId?: string
  bodyFontId?: string
  headingColorId?: string
  bodyColorId?: string
  accentColorId?: string
}

export type ResolvedDesignContext = {
  headingFontId: string
  bodyFontId: string
  headingColorId: string
  bodyColorId: string
  accentColorId: string
}
