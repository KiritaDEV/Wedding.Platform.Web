import { z } from "zod";

export const TEXT_SIZES = ["xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl"] as const;
export const TEXT_EFFECT_STRENGTHS = ["none", "soft", "medium", "strong"] as const;
export const TEXT_LINE_HEIGHTS = ["tight", "normal", "relaxed"] as const;
export const TEXT_LETTER_SPACINGS = ["tight", "normal", "wide"] as const;
export const TEXT_ALIGNMENTS = ["start", "center", "end"] as const;
export const TEXT_TRANSFORMS = ["none", "uppercase", "lowercase", "capitalize"] as const;
export const TEXT_FONT_WEIGHTS = [400, 600, 700] as const;

export const canonicalTextResponsiveAppearanceSchema = z.object({
  fontSize: z.enum(TEXT_SIZES).optional(),
  alignment: z.enum(TEXT_ALIGNMENTS).optional(),
}).strict();

/** Typography-only Website text appearance. It deliberately contains no content or block spacing. */
export const canonicalRuntimeTextAppearanceSchema = z.object({
  fontFamilyId: z.string().min(1).optional(),
  fontSize: z.enum(TEXT_SIZES).optional(),
  fontWeight: z.union([z.literal(400), z.literal(600), z.literal(700)]).optional(),
  lineHeight: z.enum(TEXT_LINE_HEIGHTS).optional(),
  letterSpacing: z.enum(TEXT_LETTER_SPACINGS).optional(),
  alignment: z.enum(TEXT_ALIGNMENTS).optional(),
  colorId: z.string().min(1).optional(),
  textShadow: z.enum(TEXT_EFFECT_STRENGTHS).optional(),
  textShadowColorId: z.string().min(1).optional(),
  glow: z.enum(TEXT_EFFECT_STRENGTHS).optional(),
  glowColorId: z.string().min(1).optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  strikethrough: z.boolean().optional(),
  textTransform: z.enum(TEXT_TRANSFORMS).optional(),
  responsive: z.object({
    tablet: canonicalTextResponsiveAppearanceSchema.optional(),
    mobile: canonicalTextResponsiveAppearanceSchema.optional(),
  }).strict().optional(),
}).strict();

export type TextSize = typeof TEXT_SIZES[number];
export type TextAlignment = typeof TEXT_ALIGNMENTS[number];
export type TextFontWeight = typeof TEXT_FONT_WEIGHTS[number];
export type TextEffectStrength = typeof TEXT_EFFECT_STRENGTHS[number];
export type TextResponsiveAppearance = z.infer<typeof canonicalTextResponsiveAppearanceSchema>;
export type CanonicalRuntimeTextAppearance = z.infer<typeof canonicalRuntimeTextAppearanceSchema>;
