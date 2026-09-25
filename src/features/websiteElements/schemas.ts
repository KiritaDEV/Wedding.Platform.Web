import { DIVIDER_WIDTHS } from "./divider";
import { z } from "zod";
import { backgroundMediaSchema } from "../websiteMedia/backgroundMedia";
import {
  WEBSITE_ELEMENT_LIMITS,
  WEBSITE_LEAF_ELEMENT_TYPES,
} from "./constants";
import { normalizeTextContent, validateTextFontTuple } from "./text";
import { canonicalRuntimeTextAppearanceSchema, canonicalTextResponsiveAppearanceSchema, TEXT_SIZES } from "./textAppearanceContract";
import { normalizeEditorName } from "./blockIdentity";
import { isUnsupportedVideoProviderUrl } from "./videoUrl";
export const elementIdSchema = z
  .string()
  .max(WEBSITE_ELEMENT_LIMITS.id)
  .refine((value) => value.trim().length > 0, "Element ID is required.")
  .transform((value) => value.trim());

const mediaIdSchema = z
  .string()
  .ulid()
  .refine(
    (value) => value[0] >= "0" && value[0] <= "7",
    "Media ID must be a canonical ULID.",
  );
const shortTextSchema = z.string().max(WEBSITE_ELEMENT_LIMITS.shortText);
const baseShape = { id: elementIdSchema, isHidden: z.boolean().optional() };
export const editorNameSchema = z.string()
  .transform(normalizeEditorName)
  .refine((value) => value.length > 0, "Editor name is required.")
  .refine((value) => Array.from(value).length <= 80, "Editor name cannot exceed 80 characters.");
const genericBlockShape = { ...baseShape, editorName: editorNameSchema };
export const elementFontSizeSchema = z.enum(TEXT_SIZES);
export const textEffectStrengthSchema = z.enum(["none", "soft", "medium", "strong"]);
export const elementLineSpacingSchema = z.enum(["tight", "normal", "relaxed"]);
export const elementLetterSpacingSchema = z.enum(["tight", "normal", "wide"]);
export const textAlignmentSchema = z.enum(["start", "center", "end"]);
export const textTransformSchema = z.enum(["none", "uppercase", "lowercase", "capitalize"]);
export const groupSpacingSchema = z.enum(["none", "xs", "s", "m", "l", "xl"]);
export const groupPaddingSchema = z.object({ top: groupSpacingSchema.optional(), right: groupSpacingSchema.optional(), bottom: groupSpacingSchema.optional(), left: groupSpacingSchema.optional() }).strict();
const blockSpacingResponsiveSchema = z.object({ outerSpacing: groupPaddingSchema.optional() }).strict();
const blockSpacingAppearanceShape = { outerSpacing: groupPaddingSchema.optional() };
export const textResponsiveAppearanceSchema = canonicalTextResponsiveAppearanceSchema.extend({
  ...blockSpacingAppearanceShape,
}).strict();
export const textAppearanceSchema = canonicalRuntimeTextAppearanceSchema.extend({
  ...blockSpacingAppearanceShape,
  responsive: z.object({
    tablet: textResponsiveAppearanceSchema.optional(),
    mobile: textResponsiveAppearanceSchema.optional(),
  }).strict().optional(),
}).strict();
export const headingElementSchema = z
  .object({
    ...baseShape,
    type: z.literal("heading"),
    text: shortTextSchema,
  })
  .strict();

const textMarksSchema = z.object({
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  strikethrough: z.boolean().optional(),
}).strict();
export const textRunSchema = z.object({ text: z.string(), marks: textMarksSchema.optional(), colorId: z.string().min(1).optional() }).strict();
const textParagraphSchema = z.object({ type: z.literal("paragraph"), children: z.array(textRunSchema).min(1) }).strict();
export const textDocumentSchema = z.object({ type: z.literal("doc"), children: z.array(textParagraphSchema).min(1).max(100) }).strict().superRefine((document, context) => {
  const length = document.children.reduce((total, block) => total + block.children.reduce((sum, run) => sum + [...run.text].length, 0), 0);
  if (length > WEBSITE_ELEMENT_LIMITS.text) context.addIssue({ code: "custom", message: `Text cannot exceed ${WEBSITE_ELEMENT_LIMITS.text} characters.` });
});
export const textElementSchema = z.object({
  ...genericBlockShape,
  type: z.literal("text"),
  document: textDocumentSchema,
  appearance: textAppearanceSchema.optional(),
}).strict().superRefine((element, context) => {
  const issue = validateTextFontTuple(element.appearance ?? {});
  if (issue) context.addIssue({ code: "custom", message: issue, path: ["appearance"] });
});

export const dateElementSchema = z.object({
  ...genericBlockShape,
  type: z.literal("date"),
  appearance: z.object({
    ...blockSpacingAppearanceShape,
    format: z.enum(["long", "medium", "short", "numeric"]).optional(),
    showWeekday: z.boolean().optional(),
    alignment: textAlignmentSchema.optional(),
    fontFamilyId: z.string().min(1).optional(),
    fontSize: elementFontSizeSchema.optional(),
    fontWeight: z.union([z.literal(400), z.literal(600), z.literal(700)]).optional(),
    lineHeight: elementLineSpacingSchema.optional(),
    letterSpacing: elementLetterSpacingSchema.optional(),
    textTransform: textTransformSchema.optional(),
    colorId: z.string().min(1).optional(),
    textShadow: textEffectStrengthSchema.optional(),
    textShadowColorId: z.string().min(1).optional(),
    glow: textEffectStrengthSchema.optional(),
    glowColorId: z.string().min(1).optional(),
    responsive: z.object({
      tablet: textResponsiveAppearanceSchema.optional(),
      mobile: textResponsiveAppearanceSchema.optional(),
    }).strict().optional(),
  }).strict().optional(),
}).strict().superRefine((element, context) => {
  const issue = validateTextFontTuple(element.appearance ?? {});
  if (issue) context.addIssue({ code: "custom", message: issue, path: ["appearance"] });
});

export const accordionItemSchema = z.object({
  id: elementIdSchema,
  title: z.string().max(WEBSITE_ELEMENT_LIMITS.shortText),
  content: z.string().refine((value) => Array.from(value).length <= WEBSITE_ELEMENT_LIMITS.text, `Content cannot exceed ${WEBSITE_ELEMENT_LIMITS.text} characters.`).transform(normalizeTextContent),
}).strict();

export const accordionElementSchema = z.object({
  ...genericBlockShape,
  type: z.literal("accordion"),
  items: z.array(accordionItemSchema).max(WEBSITE_ELEMENT_LIMITS.accordionItems),
  appearance: z.object({ ...blockSpacingAppearanceShape, responsive: z.object({ tablet: blockSpacingResponsiveSchema.optional(), mobile: blockSpacingResponsiveSchema.optional() }).strict().optional() }).strict().optional(),
}).strict().superRefine((element, context) => {
  const seen = new Set<string>();
  element.items.forEach((item, index) => {
    if (seen.has(item.id)) context.addIssue({ code: "custom", path: ["items", index, "id"], message: "Accordion item IDs must be unique." });
    seen.add(item.id);
  });
});

export const scheduleItemSchema = z.object({
  id: elementIdSchema,
  time: z.string().regex(/^(?:|(?:[01]\d|2[0-3]):[0-5]\d)$/, "Time must use HH:mm format."),
  title: z.string().max(WEBSITE_ELEMENT_LIMITS.shortText),
  details: z.string().refine((value) => Array.from(value).length <= WEBSITE_ELEMENT_LIMITS.text, `Details cannot exceed ${WEBSITE_ELEMENT_LIMITS.text} characters.`).transform(normalizeTextContent),
}).strict();

export const scheduleElementSchema = z.object({
  ...genericBlockShape,
  type: z.literal("schedule"),
  items: z.array(scheduleItemSchema).max(WEBSITE_ELEMENT_LIMITS.scheduleItems),
  appearance: z.object({ ...blockSpacingAppearanceShape, responsive: z.object({ tablet: blockSpacingResponsiveSchema.optional(), mobile: blockSpacingResponsiveSchema.optional() }).strict().optional() }).strict().optional(),
}).strict().superRefine((element, context) => {
  const seen = new Set<string>();
  element.items.forEach((item, index) => {
    if (seen.has(item.id)) context.addIssue({ code: "custom", path: ["items", index, "id"], message: "Schedule item IDs must be unique." });
    seen.add(item.id);
  });
});

const peopleMediaSchema = z.object({
  assetId: mediaIdSchema,
  focalPoint: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).strict().optional(),
  zoom: z.number().min(1).max(3).optional(),
}).strict().nullable().optional();
export const peoplePersonSchema = z.object({
  id: elementIdSchema,
  name: z.string().min(1).max(255),
  role: z.string().max(255).nullable().optional(),
  media: peopleMediaSchema,
}).strict();
export const peopleGroupSchema = z.object({
  id: elementIdSchema,
  name: z.string().min(1).max(255),
  people: z.array(peoplePersonSchema).max(WEBSITE_ELEMENT_LIMITS.peoplePerGroup),
}).strict();
export const peopleElementSchema = z.object({
  ...genericBlockShape,
  type: z.literal("people"),
  groups: z.array(peopleGroupSchema).max(WEBSITE_ELEMENT_LIMITS.peopleGroups),
  appearance: z.object({ ...blockSpacingAppearanceShape, presentation: z.enum(["portraits", "cards", "minimal", "namesOnly"]).optional(), responsive: z.object({ tablet: blockSpacingResponsiveSchema.optional(), mobile: blockSpacingResponsiveSchema.optional() }).strict().optional() }).strict().optional(),
}).strict().superRefine((element, context) => {
  const groupIds = new Set<string>();
  const personIds = new Set<string>();
  element.groups.forEach((group, groupIndex) => {
    if (groupIds.has(group.id)) context.addIssue({ code: "custom", path: ["groups", groupIndex, "id"], message: "People group IDs must be unique." });
    groupIds.add(group.id);
    group.people.forEach((person, personIndex) => {
      if (personIds.has(person.id)) context.addIssue({ code: "custom", path: ["groups", groupIndex, "people", personIndex, "id"], message: "Person IDs must be unique." });
      personIds.add(person.id);
    });
  });
});

export const imageElementSchema = z
  .object({
    ...baseShape,
    type: z.literal("image"),
    mediaId: mediaIdSchema,
  })
  .strict();

const focalPointSchema = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).strict();
export const galleryImageItemSchema = z.object({
  id: elementIdSchema, type: z.literal("image"), mediaId: mediaIdSchema,
  focalPoint: focalPointSchema.optional(), zoom: z.number().min(1).max(3).optional(),
}).strict();
export const mediaImageItemSchema = z.object({
  id: elementIdSchema, type: z.literal("image"), mediaId: mediaIdSchema,
  alt: z.string().max(500).optional(), decorative: z.boolean().optional(), focalPoint: focalPointSchema.optional(),
  zoom: z.number().min(1).max(3).optional(),
}).strict().superRefine((item, context) => {
  if (!item.decorative && !item.alt?.trim()) context.addIssue({ code: "custom", path: ["alt"], message: "Alt text is required unless the image is decorative." });
});
const mediaVideoItemSchema = z.object({
  id: elementIdSchema, type: z.literal("video"), url: z.string().max(WEBSITE_ELEMENT_LIMITS.externalUrl).url().refine((value) => new URL(value).protocol === "https:", "Video URLs must use HTTPS.").refine((value) => !isUnsupportedVideoProviderUrl(value), "Direct video file required. YouTube and Vimeo links aren't supported."),
  controls: z.boolean().optional(),
}).strict();
export const mediaItemSchema = z.discriminatedUnion("type", [mediaImageItemSchema, mediaVideoItemSchema]);
const mediaResponsivePresentationSchema = z.object({ mode: z.enum(["single", "carousel"]).optional(), width: z.enum(["small", "medium", "large", "full"]).optional(), aspectRatio: z.enum(["natural", "square", "portrait", "landscape", "wide"]).optional() }).strict();
const mediaPresentationSchema = mediaResponsivePresentationSchema.extend({
  alignment: z.enum(["start", "center", "end"]).optional(), fit: z.enum(["cover", "contain"]).optional(),
  carousel: z.object({ autoplay: z.boolean().optional(), interval: z.number().int().min(2000).max(15000).optional(), arrows: z.boolean().optional(), dots: z.boolean().optional(), loop: z.boolean().optional() }).strict().optional(),
  responsive: z.object({ tablet: mediaResponsivePresentationSchema.optional(), mobile: mediaResponsivePresentationSchema.optional() }).strict().optional(),
}).strict();
const mediaAppearanceSchema = z.object({ ...blockSpacingAppearanceShape, corners: z.enum(["square", "soft", "rounded", "pill"]).optional(), frame: z.enum(["none", "line", "mat"]).optional(), shadow: z.enum(["none", "soft", "medium", "strong"]).optional(), responsive: z.object({ tablet: blockSpacingResponsiveSchema.optional(), mobile: blockSpacingResponsiveSchema.optional() }).strict().optional() }).strict();
export const mediaElementSchema = z.object({ ...genericBlockShape, type: z.literal("media"), items: z.array(mediaItemSchema).max(8), presentation: mediaPresentationSchema.optional(), appearance: mediaAppearanceSchema.optional() }).strict().superRefine((element, context) => {
  const kinds = new Set(element.items.map(({ type }) => type));
  if (kinds.size > 1) context.addIssue({ code: "custom", path: ["items"], message: "Mixed image and video collections are not supported yet." });
  if (element.items.filter(({ type }) => type === "video").length > 1) context.addIssue({ code: "custom", path: ["items"], message: "Media supports only one video." });
  if (element.presentation?.mode === "single" && element.items.length !== 1) context.addIssue({ code: "custom", path: ["presentation", "mode"], message: "Single presentation requires exactly one item." });
  if (element.presentation?.mode === "carousel" && (element.items.length < 2 || element.items.some(({ type }) => type !== "image"))) context.addIssue({ code: "custom", path: ["presentation", "mode"], message: "Carousel presentation requires at least two images." });
  for (const viewport of ["tablet", "mobile"] as const) {
    const mode = element.presentation?.responsive?.[viewport]?.mode;
    if (mode === "single" && element.items.length !== 1) context.addIssue({ code: "custom", path: ["presentation", "responsive", viewport, "mode"], message: "Single presentation requires exactly one item." });
    if (mode === "carousel" && (element.items.length < 2 || element.items.some(({ type }) => type !== "image"))) context.addIssue({ code: "custom", path: ["presentation", "responsive", viewport, "mode"], message: "Carousel presentation requires at least two images." });
  }
});

const dividerAppearanceSchema = z.object({
  ...blockSpacingAppearanceShape,
  assetId: z.string().min(1).max(100).optional(),
  width: z.enum(DIVIDER_WIDTHS).optional(),
  alignment: textAlignmentSchema.optional(),
  colorId: z.string().min(1).optional(),
  opacity: z.number().int().min(25).max(100).optional(),
  shadow: textEffectStrengthSchema.optional(),
  shadowColorId: z.string().min(1).optional(),
  glow: textEffectStrengthSchema.optional(),
  glowColorId: z.string().min(1).optional(),
  responsive: z.object({ tablet: blockSpacingResponsiveSchema.optional(), mobile: blockSpacingResponsiveSchema.optional() }).strict().optional(),
}).strict();

export const dividerElementSchema = z
  .object({
    ...genericBlockShape,
    type: z.literal("divider"),
    appearance: dividerAppearanceSchema.optional(),
  })
  .strict();

export const quoteElementSchema = z
  .object({
    ...baseShape,
    type: z.literal("quote"),
    text: z.string().max(WEBSITE_ELEMENT_LIMITS.text),
    attribution: shortTextSchema.optional(),
  })
  .strict();

const scrollToSectionActionSchema = z
  .object({
    type: z.literal("scrollToSection"),
    sectionId: elementIdSchema,
  })
  .strict();

const externalUrlActionSchema = z
  .object({
    type: z.literal("externalUrl"),
    url: z
      .string()
      .max(WEBSITE_ELEMENT_LIMITS.externalUrl)
      .url()
      .refine(
        (value) => new URL(value).protocol === "https:",
        "External URLs must use HTTPS.",
      ),
  })
  .strict();

export const ctaActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("rsvp") }).strict(),
  scrollToSectionActionSchema,
  z.object({ type: z.literal("viewSchedule") }).strict(),
  z.object({ type: z.literal("viewGallery") }).strict(),
  z.object({ type: z.literal("backToTop") }).strict(),
  externalUrlActionSchema,
]);

export const ctaElementSchema = z
  .object({
    ...baseShape,
    type: z.literal("cta"),
    label: shortTextSchema,
    action: ctaActionSchema,
  })
  .strict();

export const eventDateElementSchema = z
  .object({
    ...baseShape,
    type: z.literal("eventDate"),
  })
  .strict();

export const eventTimeElementSchema = z
  .object({
    ...baseShape,
    type: z.literal("eventTime"),
  })
  .strict();

export const countdownElementSchema = z
  .object({
    ...baseShape,
    type: z.literal("countdown"),
  })
  .strict();

export const websiteLeafElementSchema = z.discriminatedUnion("type", [
  headingElementSchema,
  textElementSchema,
  dateElementSchema,
  accordionElementSchema,
  scheduleElementSchema,
  peopleElementSchema,
  imageElementSchema,
  mediaElementSchema,
  dividerElementSchema,
  quoteElementSchema,
  ctaElementSchema,
  eventDateElementSchema,
  eventTimeElementSchema,
  countdownElementSchema,
]);

const groupLayoutValues = {
  width: z.enum(["full", "wide", "medium", "narrow"]),
  direction: z.enum(["vertical", "horizontal"]),
  gap: groupSpacingSchema,
  padding: groupPaddingSchema,
  alignment: z.enum(["start", "center", "end", "stretch"]),
  division: z.enum(["50-50", "60-40", "40-60", "thirds"]),
} as const;
const groupContentPositionSchema = z.enum(['top-start', 'top-center', 'top-end', 'center-start', 'center', 'center-end', 'bottom-start', 'bottom-center', 'bottom-end']);
const groupLayoutOverrideSchema = z.object({ width: groupLayoutValues.width.optional(), direction: groupLayoutValues.direction.optional(), gap: groupLayoutValues.gap.optional(), padding: groupLayoutValues.padding.optional(), alignment: groupLayoutValues.alignment.optional(), division: groupLayoutValues.division.optional(), contentPosition: groupContentPositionSchema.optional() }).strict();
const groupAppearanceSchema = z.object({
  outerSpacing: groupPaddingSchema.optional(),
  backgroundColorId: z.string().min(1).optional(),
  backgroundImageOpacity: z.number().int().min(0).max(100).optional(),
  shadow: z.enum(["none", "soft", "medium", "strong"]).optional(),
  decorativeAppearance: z.object({
    background: z.object({
      texture: z.enum(["none", "paper", "fabric", "grain"]).optional(),
      textureStrength: z.number().int().min(10).max(100).optional(),
      pattern: z.enum(["none", "botanical", "geometric", "heritage"]).optional(),
      patternStrength: z.number().int().min(10).max(100).optional(),
    }).strict().optional(),
  }).strict().optional(),
  responsive: z.object({ tablet: blockSpacingResponsiveSchema.optional(), mobile: blockSpacingResponsiveSchema.optional() }).strict().optional(),
}).strict();
export const groupLayoutSchema = z.object({
  width: groupLayoutValues.width.optional(),
  direction: groupLayoutValues.direction.optional(), gap: groupLayoutValues.gap.optional(), padding: groupLayoutValues.padding.optional(), alignment: groupLayoutValues.alignment.optional(), division: groupLayoutValues.division.optional(), contentPosition: groupContentPositionSchema.optional(),
  responsive: z.object({ tablet: groupLayoutOverrideSchema.optional(), mobile: groupLayoutOverrideSchema.optional() }).strict().optional(),
}).strict();

const groupLeafElementSchema = z.discriminatedUnion("type", [textElementSchema, dateElementSchema, accordionElementSchema, scheduleElementSchema, peopleElementSchema, dividerElementSchema, mediaElementSchema]);
const nestedCompositionGroupSchema = z.object({ ...genericBlockShape, type: z.literal("compositionGroup"), children: z.array(groupLeafElementSchema).max(20), layout: groupLayoutSchema.optional(), appearance: groupAppearanceSchema.optional(), backgroundMedia: backgroundMediaSchema }).strict();
export const compositionGroupSchema = z.object({ ...genericBlockShape, type: z.literal("compositionGroup"), children: z.array(z.union([groupLeafElementSchema, nestedCompositionGroupSchema])).max(20), layout: groupLayoutSchema.optional(), appearance: groupAppearanceSchema.optional(), backgroundMedia: backgroundMediaSchema }).strict().superRefine((group, context) => addDuplicateIdIssues([group], context));

export const websiteElementSchema = z.union([
  websiteLeafElementSchema,
  compositionGroupSchema,
]);

type ElementWithIdentity = {
  id: string;
  type?: string;
  items?: Array<{ id: string }>;
  children?: ElementWithIdentity[];
};

function addDuplicateIdIssues(
  elements: ElementWithIdentity[],
  context: z.RefinementCtx,
) {
  const seen = new Set<string>();
  const visit = (element: ElementWithIdentity) => {
    if (seen.has(element.id)) {
      context.addIssue({
        code: "custom",
        message: `Element IDs must be unique within a section; duplicate [${element.id}] found.`,
      });
    }
    seen.add(element.id);

    element.children?.forEach(visit);
  };
  elements.forEach(visit);
}

export const websiteElementTreeSchema = z
  .array(websiteElementSchema)
  .superRefine(addDuplicateIdIssues);

// Keep the centralized list tied to the active schema vocabulary at compile time.
const _activeLeafTypeCheck: readonly z.infer<
  typeof websiteLeafElementSchema
>["type"][] = WEBSITE_LEAF_ELEMENT_TYPES;
void _activeLeafTypeCheck;
