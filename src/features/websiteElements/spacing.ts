export const SPACING_PRESETS = ["none", "xs", "s", "m", "l", "xl"] as const;
export type SpacingPreset = (typeof SPACING_PRESETS)[number];
export type FourSidedSpacing = Partial<Record<"top" | "right" | "bottom" | "left", SpacingPreset>>;
export const SPACING_PRESET_CSS: Record<SpacingPreset, string> = { none: "0", xs: "0.25rem", s: "0.5rem", m: "1rem", l: "1.5rem", xl: "2rem" };
export function resolveFourSidedSpacing(base?: FourSidedSpacing, override?: FourSidedSpacing): FourSidedSpacing { return { ...base, ...override }; }
