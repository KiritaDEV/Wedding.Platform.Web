export const SURFACE_RADII = ["square", "soft", "rounded", "pill"] as const;
export const SURFACE_SHADOWS = ["none", "soft", "medium", "strong"] as const;

export const SURFACE_RADIUS_CSS: Record<(typeof SURFACE_RADII)[number], string> = {
  square: "0",
  soft: ".5rem",
  rounded: "1.25rem",
  pill: "9999px",
};

export const SURFACE_SHADOW_CSS: Record<(typeof SURFACE_SHADOWS)[number], string> = {
  none: "none",
  soft: "0 4px 16px rgb(0 0 0 / .1)",
  medium: "0 10px 28px rgb(0 0 0 / .16)",
  strong: "0 18px 45px rgb(0 0 0 / .24)",
};
