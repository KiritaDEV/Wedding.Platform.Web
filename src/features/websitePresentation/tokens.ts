export const WEBSITE_RADII = ["square", "soft", "rounded", "pill"] as const;
export const WEBSITE_BORDER_WIDTHS = ["none", "thin", "medium", "thick"] as const;
export const WEBSITE_CONTROL_SIZES = ["compact", "normal", "large"] as const;

export type WebsiteRadius = typeof WEBSITE_RADII[number];
export type WebsiteBorderWidth = typeof WEBSITE_BORDER_WIDTHS[number];
export type WebsiteControlSize = typeof WEBSITE_CONTROL_SIZES[number];

export const WEBSITE_RADIUS_CSS: Record<WebsiteRadius, string> = {
  square: "0",
  soft: "0.375rem",
  rounded: "0.75rem",
  pill: "9999px",
};

export const WEBSITE_BORDER_WIDTH_CSS: Record<WebsiteBorderWidth, string> = {
  none: "0",
  thin: "1px",
  medium: "2px",
  thick: "3px",
};

/** These invariants are renderer-owned and deliberately absent from persisted appearances. */
export const WEBSITE_INTERACTIVE_INVARIANTS = {
  minimumTouchTargetCssPx: 44,
  focusIndicatorRequired: true,
  selectedStateRequiresNonColorCue: true,
  disabledBehaviorIsRuntimeOwned: true,
} as const;
