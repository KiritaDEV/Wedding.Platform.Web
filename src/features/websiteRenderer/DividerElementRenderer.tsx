import { useEffect, type CSSProperties } from "react";
import { getDecorativeAssetStyle } from "./decorativeExecution";
import { resolveDecorativeExecutionById } from "./templateDecorativeAssets";
import { observeDecorativeSource, useDecorativeSourceAvailability } from "./decorativeSourceAvailability";
import type { TemplateDesignLibrary, ResolvedDesignContext } from "../websiteCapabilities/types";
import type { ProjectColor } from "../websiteColors/projectColors";
import { resolveDividerColors } from "../websiteElements/dividerColor";
import { dividerRegistryForTemplate, resolveDividerAsset, resolveDividerWidthPercent } from "../websiteElements/divider";
import type { DividerElement } from "../websiteElements/types";
import { resolveElementInlineAlignment } from "./elementInlineAlignment";
import { resolveDropShadowEffects } from "../websiteElements/textEffects";
import { resolveWebsiteColor } from "../websiteColors/projectColors";

const alignmentStyles = { start: "flex-start", center: "center", end: "flex-end" } as const;

export function DividerElementRenderer({ element, templateKey, library, projectColors = [], context, previewColor, previewShadowColor, previewGlowColor, mode = "public" }: { element: DividerElement; previewColor?: string; previewShadowColor?: string; previewGlowColor?: string; templateKey: string; library: TemplateDesignLibrary; projectColors?: readonly ProjectColor[]; context?: ResolvedDesignContext | null; mode?: "editor" | "public" }) {
  useDecorativeSourceAvailability();
  const appearance = element.appearance ?? {};
  const registry = dividerRegistryForTemplate(templateKey);
  const colors = resolveDividerColors(appearance.colorId, context, library, projectColors);
  const asset = resolveDividerAsset(templateKey, appearance.assetId);
  const source = asset?.sourcePath;
  useEffect(() => { if (source) observeDecorativeSource(source); }, [source]);
  const decoration = asset ? resolveDecorativeExecutionById(templateKey, asset.id, "desktop", undefined, { accent: colors.defaultColor }) : null;
  if (!asset || !decoration) return mode === "editor" ? <div data-website-element="divider" data-divider-unavailable role="status" className="min-h-10 w-full text-center text-xs leading-10 text-foreground-muted">Divider artwork is unavailable for this template</div> : null;

  const width = appearance.width ?? registry.defaultWidth;
  const alignment = appearance.alignment ?? registry.defaultAlignment;
  const color = mode === "editor" ? previewColor ?? colors.effectiveColor : colors.effectiveColor;
  const visualStyle: CSSProperties = {
    width: `${resolveDividerWidthPercent(width)}%`,
    aspectRatio: `${asset.intrinsicWidth} / ${asset.intrinsicHeight}`,
    ...getDecorativeAssetStyle({ ...decoration, tint: color, execution: { ...decoration.execution, opacity: (appearance.opacity ?? 100) / 100 } }),
    filter: resolveDropShadowEffects(appearance.shadow, previewShadowColor ?? resolveWebsiteColor(appearance.shadowColorId, library, projectColors), appearance.glow, previewGlowColor ?? resolveWebsiteColor(appearance.glowColorId, library, projectColors)),
  };

  return <div data-website-element="divider" data-divider-asset={asset.id} aria-hidden="true" className="flex w-full" style={{ justifyContent: resolveElementInlineAlignment(alignmentStyles[alignment]) }}><span aria-hidden="true" style={visualStyle} /></div>;
}
