export const WEBSITE_ELEMENT_TYPES = [
  'heading',
  'text',
  'date',
  'accordion',
  'schedule',
  'people',
  'image',
  'media',
  'divider',
  'quote',
  'cta',
  'compositionGroup',
  'eventDate',
  'eventTime',
  'countdown',
] as const

export const WEBSITE_LEAF_ELEMENT_TYPES = WEBSITE_ELEMENT_TYPES.filter(
  (type) => type !== 'compositionGroup',
)

export const CTA_ACTION_TYPES = [
  'rsvp',
  'scrollToSection',
  'viewSchedule',
  'viewGallery',
  'backToTop',
  'externalUrl',
] as const

// Reserved product vocabulary only. These are not accepted WebsiteElement variants in B2.
export const DEFERRED_WEBSITE_ELEMENT_TYPES = ['video', 'locationSummary', 'logoMonogram'] as const

export const WEBSITE_ELEMENT_LIMITS = {
  id: 255,
  shortText: 255,
  text: 20000,
  accordionItems: 50,
  scheduleItems: 100,
  peopleGroups: 30,
  peoplePerGroup: 100,
  externalUrl: 2048,
} as const
