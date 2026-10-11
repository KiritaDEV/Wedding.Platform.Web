import type { ResponsiveViewport, WebsiteSectionAppearance } from "../websiteEditor/types";

const gapValues = { small: ".75rem", medium: "1.25rem", large: "2rem" } as const;
const aspectRatios = { square: "1 / 1", portrait: "4 / 5", landscape: "4 / 3" } as const;
const defaultColumns: Record<ResponsiveViewport, number> = { mobile: 1, tablet: 2, desktop: 3 };

export function resolveGalleryGridAppearance(appearance: WebsiteSectionAppearance, viewport: ResponsiveViewport) {
  const gapToken = appearance.gap ?? "medium";
  const aspectRatioToken = appearance.aspectRatio ?? "portrait";
  return {
    columns: appearance.columns ?? defaultColumns[viewport],
    gapToken,
    aspectRatioToken,
    gap: gapValues[gapToken],
    aspectRatio: aspectRatios[aspectRatioToken],
  };
}
