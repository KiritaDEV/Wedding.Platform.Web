import { z } from "zod";
import { SPACING_PRESETS } from "../websiteElements/spacing";
import { canonicalRuntimeTextAppearanceSchema } from "../websiteElements/textAppearanceContract";
import type { ResponsiveViewport } from "../websiteEditor/types";
import { WEBSITE_BORDER_WIDTHS, WEBSITE_CONTROL_SIZES, WEBSITE_RADII } from "./tokens";
import { resolveRuntimeTextAppearance } from "./runtimeTextAppearance";

const actionResponsiveAppearanceSchema = z.object({
  size: z.enum(WEBSITE_CONTROL_SIZES).optional(),
  width: z.enum(["intrinsic", "full"]).optional(),
  alignment: z.enum(["start", "center", "end"]).optional(),
}).strict();

export const actionAppearanceSchema = z.object({
  typography: canonicalRuntimeTextAppearanceSchema.optional(),
  textColorId: z.string().min(1).optional(),
  backgroundColorId: z.string().min(1).optional(),
  borderColorId: z.string().min(1).optional(),
  borderWidth: z.enum(WEBSITE_BORDER_WIDTHS).optional(),
  radius: z.enum(WEBSITE_RADII).optional(),
  size: z.enum(WEBSITE_CONTROL_SIZES).optional(),
  paddingX: z.enum(SPACING_PRESETS).optional(),
  paddingY: z.enum(SPACING_PRESETS).optional(),
  width: z.enum(["intrinsic", "full"]).optional(),
  alignment: z.enum(["start", "center", "end"]).optional(),
  variant: z.enum(["filled", "outline", "minimal"]).optional(),
  responsive: z.object({ tablet: actionResponsiveAppearanceSchema.optional(), mobile: actionResponsiveAppearanceSchema.optional() }).strict().optional(),
}).strict();

export type ActionAppearance = z.infer<typeof actionAppearanceSchema>;

export function resolveActionAppearance(sources: {
  fallback: ActionAppearance;
  theme?: ActionAppearance;
  shared?: ActionAppearance;
  exactDevice?: ActionAppearance;
}, viewport: ResponsiveViewport): ActionAppearance {
  const merged = [sources.fallback, sources.theme, sources.shared, sources.exactDevice].reduce<ActionAppearance>((result, source) => source ? ({
    ...result,
    ...source,
    typography: { ...result.typography, ...source.typography },
    responsive: source.responsive || result.responsive ? {
      tablet: { ...result.responsive?.tablet, ...source.responsive?.tablet },
      mobile: { ...result.responsive?.mobile, ...source.responsive?.mobile },
    } : undefined,
  }) : result, {});
  const responsive = viewport === "desktop" ? undefined : merged.responsive?.[viewport];
  const resolved = { ...merged, ...responsive };
  if (merged.typography) resolved.typography = resolveRuntimeTextAppearance({
    fallback: sources.fallback.typography,
    theme: sources.theme?.typography,
    shared: sources.shared?.typography,
    exactDevice: sources.exactDevice?.typography,
  }, viewport);
  delete resolved.responsive;
  return resolved;
}
