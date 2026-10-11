import type { CSSProperties } from "react";

const inlineAlignmentProperty = "--website-element-inline-justify";

export function resetElementInlineAlignment(): CSSProperties {
  // A custom property's initial value makes var() use its leaf fallback.
  // `unset` would inherit the ancestor override instead.
  return { [inlineAlignmentProperty]: "initial" } as CSSProperties;
}

export function elementInlineAlignmentOverride(value: CSSProperties["justifyContent"]): CSSProperties {
  return value ? { [inlineAlignmentProperty]: value } as CSSProperties : {};
}

export function resolveElementInlineAlignment(fallback: string) {
  return `var(${inlineAlignmentProperty}, ${fallback})`;
}
