import type { CompositionGroup } from "./types";
import type { ResponsiveViewport } from "../websiteEditor/types";
import { SPACING_PRESETS, SPACING_PRESET_CSS, resolveFourSidedSpacing, type FourSidedSpacing, type SpacingPreset } from "./spacing";

export type GroupLayout = NonNullable<CompositionGroup["layout"]>;
export type GroupLayoutOverride = NonNullable<NonNullable<GroupLayout["responsive"]>["mobile"]>;
export const GROUP_DIRECTIONS = ["vertical", "horizontal"] as const;
export const GROUP_GAPS = SPACING_PRESETS;
export type InnerSpacingPreset = SpacingPreset;
export type InnerSpacing = FourSidedSpacing;
export const INNER_SPACING_CSS = SPACING_PRESET_CSS;

export function resolveInnerSpacing(base: InnerSpacing | undefined, override: InnerSpacing | undefined): InnerSpacing {
  return resolveFourSidedSpacing(base, override);
}
export const GROUP_ALIGNMENTS = ["start", "center", "end", "stretch"] as const;
export const GROUP_DIVISIONS = ["50-50", "60-40", "40-60", "thirds"] as const;
export const GROUP_DIVISION_TEMPLATES = { "50-50": "repeat(2,minmax(0,1fr))", "60-40": "minmax(0,3fr) minmax(0,2fr)", "40-60": "minmax(0,2fr) minmax(0,3fr)", "thirds": "repeat(3,minmax(0,1fr))" } as const;

export function setGroupBackgroundMedia(group: CompositionGroup, backgroundMedia: CompositionGroup["backgroundMedia"]): CompositionGroup {
  const next = { ...group };
  if (backgroundMedia == null) delete next.backgroundMedia;
  else next.backgroundMedia = backgroundMedia;
  return next;
}

export function setGroupBackgroundImageOpacity(group: CompositionGroup, opacity: number): CompositionGroup {
  const appearance = { ...group.appearance };
  if (opacity === 100) delete appearance.backgroundImageOpacity;
  else appearance.backgroundImageOpacity = opacity;
  const next = { ...group };
  if (Object.keys(appearance).length) next.appearance = appearance;
  else delete next.appearance;
  return next;
}
export const GROUP_WIDTHS = ["full", "wide", "medium", "narrow"] as const;
export const GROUP_SHADOWS = ["none", "soft", "medium", "strong"] as const;
export const GROUP_LAYOUT_DEFAULTS = { width: "full", direction: "vertical", gap: "none", alignment: "stretch", division: "50-50", contentPosition: "center" } as const;

export function setGroupShadow(group: CompositionGroup, shadow: NonNullable<CompositionGroup["appearance"]>["shadow"]): CompositionGroup {
  return { ...group, appearance: { ...group.appearance, shadow } };
}

export function setGroupBackgroundColor(group: CompositionGroup, backgroundColorId?: string): CompositionGroup {
  const next = structuredClone(group);
  const appearance = { ...next.appearance };
  if (backgroundColorId === undefined) delete appearance.backgroundColorId;
  else appearance.backgroundColorId = backgroundColorId;
  if (Object.keys(appearance).length) next.appearance = appearance;
  else delete next.appearance;
  return next;
}

export function setGroupDecoration(group: CompositionGroup, field: "texture" | "pattern" | "textureStrength" | "patternStrength", value?: string | number): CompositionGroup {
  const next = structuredClone(group);
  const appearance = { ...next.appearance };
  const decorativeAppearance = { ...appearance.decorativeAppearance };
  const background = { ...decorativeAppearance.background };
  if (value === undefined) delete background[field];
  else Object.assign(background, { [field]: value });
  if (Object.keys(background).length) decorativeAppearance.background = background;
  else delete decorativeAppearance.background;
  if (Object.keys(decorativeAppearance).length) appearance.decorativeAppearance = decorativeAppearance;
  else delete appearance.decorativeAppearance;
  if (Object.keys(appearance).length) next.appearance = appearance;
  else delete next.appearance;
  return next;
}

export function resolveGroupLayout(layout: GroupLayout | undefined, viewport: ResponsiveViewport): GroupLayout {
  const base = layout ?? {};
  const override = viewport === "desktop" ? {} : base.responsive?.[viewport] ?? {};
  return { ...base, ...override, responsive: base.responsive };
}

export function setGroupLayoutProperty<K extends keyof GroupLayoutOverride>(layout: GroupLayout, viewport: ResponsiveViewport, key: K, value: GroupLayoutOverride[K] | undefined): GroupLayout {
  if (viewport === "desktop") {
    const next = { ...layout };
    if (value === undefined) delete next[key]; else Object.assign(next, { [key]: value });
    return next;
  }
  const responsive = { ...layout.responsive };
  const branch = { ...responsive[viewport] };
  if (value === undefined) delete branch[key]; else Object.assign(branch, { [key]: value });
  if (Object.keys(branch).length) responsive[viewport] = branch; else delete responsive[viewport];
  const next = { ...layout };
  if (Object.keys(responsive).length) next.responsive = responsive; else delete next.responsive;
  return next;
}

type GroupScalarLayoutKey = "width" | "direction" | "gap" | "alignment" | "division" | "contentPosition";

export function selectGroupLayoutProperty<K extends GroupScalarLayoutKey>(layout: GroupLayout, viewport: ResponsiveViewport, key: K, value: NonNullable<GroupLayout[K]>): GroupLayout {
  if (viewport === "desktop") return setGroupLayoutProperty(layout, viewport, key, key === "contentPosition" && value === "center" ? undefined : value);
  const desktopValue = layout[key] ?? GROUP_LAYOUT_DEFAULTS[key];
  return setGroupLayoutProperty(layout, viewport, key, value === desktopValue ? undefined : value);
}

export function selectGroupPaddingSide(layout: GroupLayout, viewport: ResponsiveViewport, side: keyof NonNullable<GroupLayout["padding"]>, value: NonNullable<NonNullable<GroupLayout["padding"]>[typeof side]>): GroupLayout {
  const branch = viewport === "desktop" ? layout : layout.responsive?.[viewport] ?? {};
  const padding = { ...branch.padding };
  const desktopValue = layout.padding?.[side] ?? "none";
  if (viewport !== "desktop" && value === desktopValue) delete padding[side];
  else padding[side] = value;
  return setGroupLayoutProperty(layout, viewport, "padding", Object.keys(padding).length ? padding : undefined);
}
