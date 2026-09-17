import type { WebsiteSectionAppearance } from "./types";

export const HERO_MINIMUM_HEIGHT_MIN = 25;
export const HERO_MINIMUM_HEIGHT_MAX = 150;
export const HERO_MINIMUM_HEIGHT_STEP = 5;
export const HERO_MINIMUM_HEIGHT_INITIAL = 75;

export function setHeroHeightMode(appearance: WebsiteSectionAppearance, mode: "automatic" | "custom") {
  const next = { ...appearance };
  if (mode === "automatic") delete next.height;
  else next.height ??= { unit: "svh", value: HERO_MINIMUM_HEIGHT_INITIAL };
  return next;
}

export function setHeroMinimumHeight(appearance: WebsiteSectionAppearance, value: number) {
  return { ...appearance, height: { unit: "svh" as const, value } };
}
