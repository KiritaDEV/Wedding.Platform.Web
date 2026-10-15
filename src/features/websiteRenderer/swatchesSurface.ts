// Flat is the original Swatches boundary, including its faint light outer edge.
const flat = 'inset 0 0 0 1px rgb(0 0 0 / .2), 0 0 0 1px rgb(255 255 255 / .35)';

/** Fixed lighting from the upper left. Only inner edges change; the fill remains literal. */
export const SWATCH_SURFACE_SHADOWS = {
  flat,
  raised: `inset 2px 2px 3px rgb(255 255 255 / .55), inset -2px -2px 3px rgb(0 0 0 / .28), ${flat}`,
  inset: `inset 2px 2px 3px rgb(0 0 0 / .32), inset -2px -2px 3px rgb(255 255 255 / .45), ${flat}`,
} as const;
