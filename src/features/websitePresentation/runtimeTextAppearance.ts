import type { CSSProperties } from "react";
import { z } from "zod";
import type { ResolvedDesignContext, TemplateDesignLibrary } from "../websiteCapabilities/types";
import type { ProjectColor } from "../websiteColors/projectColors";
import { resolveWebsiteColor } from "../websiteColors/projectColors";
import { textFontCapabilities, validateTextFontTuple } from "../websiteElements/text";
import { canonicalRuntimeTextAppearanceSchema, TEXT_SIZES, type CanonicalRuntimeTextAppearance, type TextSize } from "../websiteElements/textAppearanceContract";
import type { ResponsiveViewport } from "../websiteEditor/types";
import { fontStackForTemplate } from "../websiteTemplates/design/catalogs";

export { canonicalRuntimeTextAppearanceSchema };
export type RuntimeTextAppearance = z.infer<typeof canonicalRuntimeTextAppearanceSchema>;

export type RuntimeTextAppearanceSources = {
  fallback?: RuntimeTextAppearance;
  theme?: RuntimeTextAppearance;
  shared?: RuntimeTextAppearance;
  exactDevice?: RuntimeTextAppearance;
};

export function resolveRuntimeTextAppearance(sources: RuntimeTextAppearanceSources, viewport: ResponsiveViewport, constraints?: { minimumFontSize?: TextSize }): RuntimeTextAppearance {
  const merged = mergeRuntimeTextAppearance(sources.fallback, sources.theme, sources.shared, sources.exactDevice);
  const responsive = viewport === "desktop" ? undefined : merged.responsive?.[viewport];
  const resolved = { ...merged, ...responsive };
  delete resolved.responsive;
  return enforceRuntimeTextAccessibility(resolved, constraints);
}

/** Applies functional-label readability after every authored and Theme layer has resolved. */
export function enforceRuntimeTextAccessibility(appearance: RuntimeTextAppearance, constraints?: { minimumFontSize?: TextSize }): RuntimeTextAppearance {
  const minimum = constraints?.minimumFontSize;
  if (!minimum || !appearance.fontSize || TEXT_SIZES.indexOf(appearance.fontSize) >= TEXT_SIZES.indexOf(minimum)) return appearance;
  return { ...appearance, fontSize: minimum };
}

export function mergeRuntimeTextAppearance(...sources: Array<RuntimeTextAppearance | undefined>): RuntimeTextAppearance {
  return sources.reduce<RuntimeTextAppearance>((result, source) => source ? ({
    ...result,
    ...source,
    responsive: source.responsive || result.responsive ? {
      tablet: { ...result.responsive?.tablet, ...source.responsive?.tablet },
      mobile: { ...result.responsive?.mobile, ...source.responsive?.mobile },
    } : undefined,
  }) : result, {});
}

export function validateRuntimeTextFont(appearance: CanonicalRuntimeTextAppearance): string | undefined {
  return validateTextFontTuple(appearance);
}

export function resolveRuntimeTextResources(appearance: RuntimeTextAppearance, options: {
  templateKey: string;
  library: TemplateDesignLibrary;
  projectColors?: readonly ProjectColor[];
  context?: ResolvedDesignContext | null;
}): Pick<CSSProperties, "fontFamily" | "color"> & { supportsItalic: boolean; supportedWeights: readonly number[] } {
  const fontFamilyId = appearance.fontFamilyId ?? options.context?.bodyFontId;
  const capabilities = textFontCapabilities(fontFamilyId);
  return {
    fontFamily: fontFamilyId ? fontStackForTemplate(options.templateKey, fontFamilyId) : "inherit",
    color: resolveWebsiteColor(appearance.colorId ?? options.context?.bodyColorId, options.library, options.projectColors ?? []) ?? "inherit",
    supportsItalic: capabilities.italic,
    supportedWeights: capabilities.weights,
  };
}
