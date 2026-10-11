import type { ResponsiveViewport, WebsiteSectionAppearance } from "../websiteEditor/types";

export const HERO_CONTENT_POSITIONS = [
  "top-start", "top-center", "top-end",
  "center-start", "center", "center-end",
  "bottom-start", "bottom-center", "bottom-end",
] as const;

export type HeroContentPosition = typeof HERO_CONTENT_POSITIONS[number];

export function resolveHeroContentPosition(appearance: WebsiteSectionAppearance, viewport: ResponsiveViewport): HeroContentPosition {
  if (viewport !== "desktop") return appearance.responsive?.[viewport]?.contentPosition ?? appearance.contentPosition ?? "center";
  return appearance.contentPosition ?? "center";
}

export function heroContentPositionStyle(position: HeroContentPosition) {
  const [vertical, horizontal = "center"] = position === "center" ? ["center", "center"] : position.split("-");
  const align = horizontal === "start" ? "flex-start" : horizontal === "end" ? "flex-end" : "center";
  const justify = vertical === "top" ? "flex-start" : vertical === "bottom" ? "flex-end" : "center";
  return { alignItems: align, justifyContent: justify } as const;
}
