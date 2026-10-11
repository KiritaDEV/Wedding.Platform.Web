import type {
  FourSidedSpacing,
  SpacingPreset,
} from "../../websiteElements/spacing";

export type SpacingSide = "top" | "right" | "bottom" | "left";
export type SpacingChanges = Partial<Record<SpacingSide, SpacingPreset>>;
export type SpacingAxis = "vertical" | "horizontal";

const sidesForAxis: Record<SpacingAxis, readonly [SpacingSide, SpacingSide]> = {
  vertical: ["top", "bottom"],
  horizontal: ["left", "right"],
};

export function spacingAxisValue(
  spacing: FourSidedSpacing | undefined,
  axis: SpacingAxis,
): SpacingPreset | "mixed" {
  const [first, second] = sidesForAxis[axis];
  const firstValue = spacing?.[first] ?? "none";
  return firstValue === (spacing?.[second] ?? "none") ? firstValue : "mixed";
}

export function spacingAxisChanges(
  axis: SpacingAxis,
  value: SpacingPreset,
): SpacingChanges {
  const [first, second] = sidesForAxis[axis];
  return { [first]: value, [second]: value };
}

export function spacingSideChanges(
  side: SpacingSide,
  value: SpacingPreset,
): SpacingChanges {
  return { [side]: value };
}
