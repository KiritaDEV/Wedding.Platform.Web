import { z } from "zod";
import { SPACING_PRESETS } from "../websiteElements/spacing";
import type { ResponsiveViewport } from "../websiteEditor/types";
import { WEBSITE_BORDER_WIDTHS, WEBSITE_CONTROL_SIZES, WEBSITE_RADII } from "./tokens";

const choiceColorsSchema = z.object({
  textColorId: z.string().min(1).optional(),
  backgroundColorId: z.string().min(1).optional(),
  borderColorId: z.string().min(1).optional(),
}).strict();

const selectedChoiceAppearanceSchema = choiceColorsSchema.extend({
  emphasis: z.enum(["normal", "semibold", "bold"]).optional(),
}).strict();

const choiceResponsiveAppearanceSchema = z.object({
  direction: z.enum(["row", "column"]).optional(),
  size: z.enum(WEBSITE_CONTROL_SIZES).optional(),
}).strict();

export const choiceAppearanceSchema = z.object({
  layout: z.enum(["cards", "segmented"]).optional(),
  direction: z.enum(["row", "column"]).optional(),
  size: z.enum(WEBSITE_CONTROL_SIZES).optional(),
  radius: z.enum(WEBSITE_RADII).optional(),
  borderWidth: z.enum(WEBSITE_BORDER_WIDTHS).optional(),
  gap: z.enum(SPACING_PRESETS).optional(),
  unselected: choiceColorsSchema.optional(),
  selected: selectedChoiceAppearanceSchema.optional(),
  disabled: z.object({ opacity: z.enum(["soft", "muted"]).optional() }).strict().optional(),
  responsive: z.object({ tablet: choiceResponsiveAppearanceSchema.optional(), mobile: choiceResponsiveAppearanceSchema.optional() }).strict().optional(),
}).strict();

export type ChoiceAppearance = z.infer<typeof choiceAppearanceSchema>;

export function resolveChoiceAppearance(sources: {
  fallback: ChoiceAppearance;
  theme?: ChoiceAppearance;
  shared?: ChoiceAppearance;
  exactDevice?: ChoiceAppearance;
}, viewport: ResponsiveViewport): ChoiceAppearance {
  const merged = [sources.fallback, sources.theme, sources.shared, sources.exactDevice].reduce<ChoiceAppearance>((result, source) => source ? ({
    ...result,
    ...source,
    unselected: { ...result.unselected, ...source.unselected },
    selected: { ...result.selected, ...source.selected },
    disabled: { ...result.disabled, ...source.disabled },
    responsive: source.responsive || result.responsive ? {
      tablet: { ...result.responsive?.tablet, ...source.responsive?.tablet },
      mobile: { ...result.responsive?.mobile, ...source.responsive?.mobile },
    } : undefined,
  }) : result, {});
  const responsive = viewport === "desktop" ? undefined : merged.responsive?.[viewport];
  const resolved = { ...merged, ...responsive };
  delete resolved.responsive;
  return resolved;
}
