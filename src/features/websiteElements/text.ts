import type { ResponsiveViewport } from "../websiteEditor/types";
import { platformFont } from "../websiteFonts/platformFonts";

export const TEXT_SIZES = ["xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl"] as const;
export const TEXT_EFFECT_STRENGTHS = ["none", "soft", "medium", "strong"] as const;
export const TEXT_LINE_HEIGHTS = ["tight", "normal", "relaxed"] as const;
export const TEXT_LETTER_SPACINGS = ["tight", "normal", "wide"] as const;
export const TEXT_ALIGNMENTS = ["start", "center", "end"] as const;
export const TEXT_TRANSFORMS = ["none", "uppercase", "lowercase", "capitalize"] as const;
export const TEXT_FONT_WEIGHTS = [400, 600, 700] as const;

export type TextSize = typeof TEXT_SIZES[number];
export type TextAlignment = typeof TEXT_ALIGNMENTS[number];
export type TextFontWeight = typeof TEXT_FONT_WEIGHTS[number];
export type TextEffectStrength = typeof TEXT_EFFECT_STRENGTHS[number];
export type TextResponsiveAppearance = { fontSize?: TextSize; alignment?: TextAlignment };
export type TextAppearance = {
  fontFamilyId?: string; fontSize?: TextSize; fontWeight?: 400 | 600 | 700;
  lineHeight?: typeof TEXT_LINE_HEIGHTS[number];
  letterSpacing?: typeof TEXT_LETTER_SPACINGS[number];
  alignment?: TextAlignment; colorId?: string; italic?: boolean;
  textShadow?: TextEffectStrength; textShadowColorId?: string;
  glow?: TextEffectStrength; glowColorId?: string;
  underline?: boolean; strikethrough?: boolean;
  textTransform?: typeof TEXT_TRANSFORMS[number];
  responsive?: { tablet?: TextResponsiveAppearance; mobile?: TextResponsiveAppearance };
};

export function setTextEffect(appearance: TextAppearance, effect: "textShadow" | "glow", value: TextEffectStrength): TextAppearance {
  const next = { ...appearance };
  const colorKey = effect === "textShadow" ? "textShadowColorId" : "glowColorId";
  if (value === "none") { delete next[effect]; delete next[colorKey]; }
  else next[effect] = value;
  return next;
}

export function selectTextGlobalAppearanceProperty<K extends keyof TextAppearance>(
  appearance: TextAppearance,
  key: K,
  value: TextAppearance[K],
  inheritedValue: TextAppearance[K],
): TextAppearance {
  const next = { ...appearance };
  if (value === inheritedValue || value === undefined) delete next[key];
  else Object.assign(next, { [key]: value });
  return next;
}

export function normalizeTextContent(value: string): string {
  return value.replace(/(?:\r\n|[\r\n\u2028\u2029])+/gu, " ");
}

export function resolveTextResponsiveAppearance(
  appearance: TextAppearance,
  viewport: ResponsiveViewport,
  inherited: Required<Pick<TextAppearance, "fontSize" | "alignment">>,
): Required<Pick<TextAppearance, "fontSize" | "alignment">> {
  const branch = viewport === "desktop" ? undefined : appearance.responsive?.[viewport];
  return {
    fontSize: branch?.fontSize ?? appearance.fontSize ?? inherited.fontSize,
    alignment: branch?.alignment ?? appearance.alignment ?? inherited.alignment,
  };
}

export function setTextResponsiveProperty(
  appearance: TextAppearance,
  viewport: ResponsiveViewport,
  key: keyof TextResponsiveAppearance,
  value: TextResponsiveAppearance[keyof TextResponsiveAppearance] | undefined,
): TextAppearance {
  if (viewport === "desktop") {
    const next = { ...appearance };
    if (value === undefined) delete next[key]; else Object.assign(next, { [key]: value });
    return next;
  }
  const branch = { ...appearance.responsive?.[viewport] };
  if (value === undefined) delete branch[key]; else Object.assign(branch, { [key]: value });
  const responsive = { ...appearance.responsive };
  if (Object.keys(branch).length) responsive[viewport] = branch; else delete responsive[viewport];
  const next = { ...appearance };
  if (Object.keys(responsive).length) next.responsive = responsive; else delete next.responsive;
  return next;
}

export function selectTextResponsiveProperty(
  appearance: TextAppearance,
  viewport: ResponsiveViewport,
  key: keyof TextResponsiveAppearance,
  value: TextResponsiveAppearance[keyof TextResponsiveAppearance],
  inherited: Required<Pick<TextAppearance, "fontSize" | "alignment">> = { fontSize: "m", alignment: "start" },
): TextAppearance {
  if (viewport === "desktop") return setTextResponsiveProperty(appearance, viewport, key, value);
  const desktopValue = appearance[key] ?? inherited[key];
  return setTextResponsiveProperty(appearance, viewport, key, value === desktopValue ? undefined : value);
}

export function resetTextResponsiveDevice(appearance: TextAppearance, viewport: Exclude<ResponsiveViewport, "desktop">): TextAppearance {
  const responsive = { ...appearance.responsive };
  delete responsive[viewport];
  const next = { ...appearance };
  if (Object.keys(responsive).length) next.responsive = responsive; else delete next.responsive;
  return next;
}

export function validateTextFontTuple(appearance: TextAppearance): string | undefined {
  if (!appearance.fontFamilyId) return undefined;
  const font = platformFont(appearance.fontFamilyId);
  if (!font) return "Text font family is not supported.";
  if (appearance.fontWeight !== undefined && !font.weights.includes(appearance.fontWeight)) return "Text font weight is not supported by the selected family.";
  if (appearance.italic === true && !font.styles.includes("italic")) return "Italic is not supported by the selected family.";
  return undefined;
}

export function textFontCapabilities(fontFamilyId?: string) {
  const font = platformFont(fontFamilyId ?? "");
  return {
    weights: TEXT_FONT_WEIGHTS.filter((weight) => font?.weights.includes(weight)),
    italic: font?.styles.includes("italic") === true,
  };
}

export function setTextFontWeight(
  appearance: TextAppearance,
  effectiveFontFamilyId: string | undefined,
  weight: TextFontWeight,
): TextAppearance {
  if (!textFontCapabilities(effectiveFontFamilyId).weights.includes(weight)) return appearance;
  const next = weight === 400 ? { ...appearance } : pinEffectiveTextFont(appearance, effectiveFontFamilyId);
  if (weight === 400) delete next.fontWeight;
  else next.fontWeight = weight;
  return next;
}

export function toggleTextBold(appearance: TextAppearance, effectiveFontFamilyId?: string): TextAppearance {
  if (!textFontCapabilities(effectiveFontFamilyId).weights.includes(700)) return appearance;
  return setTextFontWeight(appearance, effectiveFontFamilyId, appearance.fontWeight === 700 ? 400 : 700);
}

export function toggleTextItalic(appearance: TextAppearance, effectiveFontFamilyId?: string): TextAppearance {
  if (!textFontCapabilities(effectiveFontFamilyId).italic) return appearance;
  const next = appearance.italic ? { ...appearance } : pinEffectiveTextFont(appearance, effectiveFontFamilyId);
  if (next.italic) delete next.italic;
  else next.italic = true;
  return next;
}

function pinEffectiveTextFont(appearance: TextAppearance, effectiveFontFamilyId?: string): TextAppearance {
  return !appearance.fontFamilyId && effectiveFontFamilyId
    ? { ...appearance, fontFamilyId: effectiveFontFamilyId }
    : { ...appearance };
}

export function normalizeTextAppearanceForFont(appearance: TextAppearance, effectiveFontFamilyId?: string): TextAppearance {
  const capabilities = textFontCapabilities(effectiveFontFamilyId);
  const next = { ...appearance };
  if (next.fontWeight !== undefined && !capabilities.weights.includes(next.fontWeight)) delete next.fontWeight;
  if (next.italic && !capabilities.italic) delete next.italic;
  return next;
}

export function changeTextFontFamily(appearance: TextAppearance, fontFamilyId: string | undefined, inheritedFontFamilyId?: string): TextAppearance {
  const next = { ...appearance };
  if (fontFamilyId) next.fontFamilyId = fontFamilyId; else delete next.fontFamilyId;
  return normalizeTextAppearanceForFont(next, fontFamilyId ?? inheritedFontFamilyId);
}
