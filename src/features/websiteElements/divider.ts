import { decorativeAssetRegistries, type TemplateDecorativeAssetDefinition } from "../websiteRenderer/templateDecorativeAssets";
import { isDecorativeSourceAvailable } from "../websiteRenderer/decorativeSourceAvailability";
export const DIVIDER_ALIGNMENTS = ["start", "center", "end"] as const;
export const DIVIDER_WIDTHS = ["small", "medium", "large", "full"] as const;
export type DividerWidth = (typeof DIVIDER_WIDTHS)[number];
export const DIVIDER_WIDTH_DEFAULT: DividerWidth = "medium";
const widthPercentages: Record<DividerWidth, number> = { small: 25, medium: 50, large: 75, full: 100 };
export const resolveDividerWidthPercent = (width: DividerWidth = DIVIDER_WIDTH_DEFAULT): number => widthPercentages[width];
export const DIVIDER_OPACITY_MIN = 25;
export const DIVIDER_OPACITY_MAX = 100;
export const DIVIDER_OPACITY_DEFAULT = 100;

export type DividerAlignment = (typeof DIVIDER_ALIGNMENTS)[number];

export type TemplateDividerAsset = TemplateDecorativeAssetDefinition & { label: string; intrinsicWidth: number; intrinsicHeight: number };

export const dividerAssetsForTemplate = (templateKey: string): readonly TemplateDividerAsset[] =>
  (decorativeAssetRegistries[templateKey]?.assets ?? []).filter((asset): asset is TemplateDividerAsset =>
    asset.kind === "divider" && asset.status === "active" && typeof asset.label === "string"
    && Number.isFinite(asset.intrinsicWidth) && (asset.intrinsicWidth ?? 0) > 0
    && Number.isFinite(asset.intrinsicHeight) && (asset.intrinsicHeight ?? 0) > 0
    && isDecorativeSourceAvailable(asset.sourcePath));

export const dividerRegistryForTemplate = (templateKey: string) => ({
  defaultWidth: DIVIDER_WIDTH_DEFAULT,
  defaultAlignment: "center" as const,
  assets: dividerAssetsForTemplate(templateKey),
});

export const resolveDividerAsset = (templateKey: string, assetId?: string) => {
  const assets = dividerAssetsForTemplate(templateKey);
  const selectedId = assetId ?? decorativeAssetRegistries[templateKey]?.defaultAssetIds?.divider;
  return assets.find(({ id }) => id === selectedId);
};

export const isDividerAssetForTemplate = (templateKey: string, assetId: string): boolean => dividerAssetsForTemplate(templateKey).some((asset) => asset.id === assetId);
