import type { ContextDefaultsIntent, ResolvedDesignContext, TemplateCapabilities } from '../websiteCapabilities/types'
import type { ProjectColor } from '../websiteColors/projectColors'
import type { SectionChildFlow } from './sectionChildFlow'
import type { BackgroundMedia } from '../websiteMedia/backgroundMedia'

export type SectionDesignDefaults = ContextDefaultsIntent

export type SectionMedia = BackgroundMedia
export type SectionComposition = { childFlow: SectionChildFlow }
export type SectionCompositions = { shared: SectionComposition; custom?: Partial<Record<ResponsiveViewport, SectionComposition>> }
export type HeroContent = { semantic: Record<string, never>; compositions: SectionCompositions }
export type PeoplePerson = { id: string; name: string; role?: string | null; media?: SectionMedia }
export type PeopleGroup = { id: string; name: string; people: PeoplePerson[] }
export type GalleryContent = { semantic: { heading: string; items: [] } }
export type RsvpContent = { semantic: { heading: string; description: string; buttonLabel: string } }
export type BlankContent = { semantic: Record<string, never>; compositions: SectionCompositions }

type SectionBase<TType extends string, TContent> = {
  id: string
  type: TType
  displayName: string
  editorName: string | null
  sortOrder: number
  isEnabled: boolean
  content: TContent
  appearance: TType extends 'hero' | 'blank' ? WebsiteSectionAppearanceEnvelope : WebsiteSectionAppearance
  designDefaults: SectionDesignDefaults
  resolvedDesignContext: ResolvedDesignContext | null
  appearanceOptions: WebsiteSectionAppearanceOptions | null
  mediaCapability: { mode: 'single' | 'multiple' } | null
  itemMediaCapability: { itemType: 'person'; mode: 'single' } | null
  presentationCapability: WebsiteSectionPresentationCapability | null
}

export type SectionAlignment = 'inherit' | 'left' | 'center' | 'right'
export type BackgroundTreatment = 'inherit' | 'plain' | 'soft' | 'accent' | 'custom'
export type SectionDecorativeAppearance = {
  background?: {
    texture?: 'none' | 'paper' | 'fabric' | 'grain'
    textureStrength?: number
    pattern?: 'none' | 'botanical' | 'geometric' | 'heritage'
    patternStrength?: number
    overlay?: 'none' | 'soft' | 'warm' | 'deep'
    colorId?: string
    customColor?: string
  }
  frame?: {
    style?: 'none' | 'fine' | 'ornamental'
    size?: number
    strength?: number
    colorId?: string
  }
}
export type SectionEmphasis = 'inherit' | 'standard' | 'featured' | 'subtle'
export type MediaSpacingValue = 'none' | 'small' | 'medium' | 'large'
export type MediaSpacing = { top: MediaSpacingValue; right: MediaSpacingValue; bottom: MediaSpacingValue; left: MediaSpacingValue }
export type MediaContentGap = 'tight' | 'comfortable' | 'spacious' | 'generous'
export type ResponsiveViewport = 'desktop' | 'tablet' | 'mobile'
export type HeroMinimumHeight = { unit: 'svh'; value: number }
export type WebsiteSectionResponsiveAppearance = {
  contentPosition?: import('../websiteRenderer/heroContentPosition').HeroContentPosition
  innerSpacing?: import('../websiteElements/group').InnerSpacing
  mediaPlacement?: string
  mediaSize?: string
  mediaContentGap?: string
  headingAlignment?: string
  bodyAlignment?: string
  mediaSpacing?: { top: string; right: string; bottom: string; left: string }
}
export type WebsiteSectionAppearance = {
  backgroundMedia?: SectionMedia
  contentPosition?: import('../websiteRenderer/heroContentPosition').HeroContentPosition
  innerSpacing?: import('../websiteElements/group').InnerSpacing
  headingAlignment: SectionAlignment
  bodyAlignment: SectionAlignment
  backgroundTreatment: BackgroundTreatment
  decorativeAppearance?: SectionDecorativeAppearance
  emphasis: SectionEmphasis
  presentation?: string
  mediaPlacement?: string
  mediaSize?: string
  cornerStyle?: string
  shadowStyle?: string
  overlayStrength?: number
  foregroundColor?: string
  mediaSpacing?: MediaSpacing
  mediaContentGap?: MediaContentGap
  responsive?: Partial<Record<'tablet' | 'mobile', WebsiteSectionResponsiveAppearance>>
  backgroundImageOpacity?: number
  height?: HeroMinimumHeight
}
export type WebsiteSectionAppearanceEnvelope = {
  shared: WebsiteSectionAppearance
  custom?: Partial<Record<ResponsiveViewport, WebsiteSectionAppearance>>
}
export type WebsiteSectionPresentationOption = {
  key: string
  displayName: string
  description: string
  preview: string
  mediaControls: WebsiteSectionMediaControls | null
}
export type MediaControlOptionGroup = { default: string; options: DesignOption[] }
export type ResponsiveMediaControls = {
  mediaPlacement?: MediaControlOptionGroup
  mediaSize?: MediaControlOptionGroup
  mediaContentGap?: MediaControlOptionGroup
  headingAlignment?: MediaControlOptionGroup
  bodyAlignment?: MediaControlOptionGroup
  mediaSpacing?: { default: MediaSpacing; options: DesignOption[] }
}
export type WebsiteSectionMediaControls = {
  mediaPlacements?: MediaControlOptionGroup
  mediaSizes?: MediaControlOptionGroup
  cornerStyles?: MediaControlOptionGroup
  shadowStyles?: MediaControlOptionGroup
  overlayStrength?: { default: number; min: number; max: number; step: number }
  foregroundColors?: MediaControlOptionGroup
  mediaSpacing?: { default: MediaSpacing; options: DesignOption[] }
  mediaContentGaps?: MediaControlOptionGroup
  responsive?: Partial<Record<'tablet' | 'mobile', ResponsiveMediaControls>>
}
export type WebsiteSectionPresentationCapability = {
  default: string
  options: WebsiteSectionPresentationOption[]
}
export type WebsiteSectionAppearanceOptions = {
  headingAlignments: DesignOption[]
  bodyAlignments: DesignOption[]
  backgroundTreatments: DesignOption[]
  emphasisOptions: DesignOption[]
}

export type WebsiteSection =
  | SectionBase<'hero', HeroContent>
  | SectionBase<'gallery', GalleryContent>
  | SectionBase<'rsvp', RsvpContent>
  | SectionBase<'blank', BlankContent>

export type ColorTheme = string
export type FontSet = string
export type ArtStyle = string
export type ProjectDesignDefaultOverrides = {
  headingFontId?: string
  bodyFontId?: string
  headingColorId?: string
  bodyColorId?: string
  accentColorId?: string
}
export type WebsiteDesignSettings = {
  colorTheme: ColorTheme
  fontSet: FontSet
  artStyle: ArtStyle
  projectDefaults: ProjectDesignDefaultOverrides
  customColors: ProjectColor[]
}
export type ProjectDesignDefaults = {
  headingFontId: string
  bodyFontId: string
  headingColorId: string
  bodyColorId: string
  accentColorId: string
}
export type DesignOption = { key: string; displayName: string }
export type WebsiteDesignOptions = {
  colorThemes: DesignOption[]
  fontSets: DesignOption[]
  artStyles: DesignOption[]
}
export type WebsiteTemplateSummary = { key: string; displayName: string; designOptions: WebsiteDesignOptions; capabilities: TemplateCapabilities }

export type WebsiteDraft = {
  schemaVersion: 5
  id: string
  eventId: string
  name: string
  templateKey: string
  designSettings: WebsiteDesignSettings
  projectDesignDefaults: ProjectDesignDefaults | null
  template: WebsiteTemplateSummary | null
  sections: WebsiteSection[]
  media: Record<string, ResolvedWebsiteMedia>
}

export type ResolvedWebsiteMedia = {
  id: string
  originalFilename: string
  width: number
  height: number
  web: { width: number; height: number; url: string }
}
