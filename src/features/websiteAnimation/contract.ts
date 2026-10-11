import { z } from "zod";

export const ENTRANCE_ANIMATION_TYPES = ["none", "fade", "fade-up", "fade-down", "scale-in"] as const;
export const ANIMATION_TYPES = ENTRANCE_ANIMATION_TYPES;
export const ANIMATION_SPEEDS = ["fast", "normal", "slow"] as const;
export const ANIMATION_DELAYS = ["none", "short", "medium", "long"] as const;
export const GALLERY_ANIMATION_STAGGERS = ["none", "short", "medium", "long"] as const;

export const entranceAnimationSchema = z.object({
  type: z.enum(ENTRANCE_ANIMATION_TYPES).optional(),
  speed: z.enum(ANIMATION_SPEEDS).optional(),
  delay: z.enum(ANIMATION_DELAYS).optional(),
}).strict();

export const authoredAnimationSchema = z.object({
  entrance: entranceAnimationSchema.optional(),
}).strict();
export const galleryItemAnimationSchema = z.object({
  entrance: z.object({ type: z.enum(ENTRANCE_ANIMATION_TYPES).optional(), speed: z.enum(ANIMATION_SPEEDS).optional(), stagger: z.enum(GALLERY_ANIMATION_STAGGERS).optional() }).strict().optional(),
}).strict();

export type EntranceAnimation = z.infer<typeof entranceAnimationSchema>;
export type AuthoredAnimation = z.infer<typeof authoredAnimationSchema>;
export type AnimationType = NonNullable<EntranceAnimation["type"]>;
export type AnimationSpeed = NonNullable<EntranceAnimation["speed"]>;
export type AnimationDelay = NonNullable<EntranceAnimation["delay"]>;
export type GalleryItemAnimation = z.infer<typeof galleryItemAnimationSchema>;
export type GalleryAnimationStagger = NonNullable<NonNullable<GalleryItemAnimation["entrance"]>["stagger"]>;

export const ANIMATION_DURATION_MS = { fast: 250, normal: 450, slow: 700 } as const;
export const ANIMATION_DELAY_MS = { none: 0, short: 100, medium: 250, long: 500 } as const;
export const GALLERY_ANIMATION_STAGGER_MS = { none: 0, short: 60, medium: 100, long: 160 } as const;
export const cappedGalleryStaggerDelay = (batchOrder: number, staggerMs: number) => Math.min(batchOrder, 4) * staggerMs;
export const ANIMATION_EASING = "cubic-bezier(.2,.8,.2,1)";
export const ANIMATION_INTERSECTION_THRESHOLD = 0.12;
export const ANIMATION_INTERSECTION_ROOT_MARGIN = "0px 0px -8% 0px";

export function normalizeAuthoredAnimation(
  animation: AuthoredAnimation | undefined,
  options: { preserveExplicitNone?: boolean } = {},
): AuthoredAnimation | undefined {
  const entrance = animation?.entrance;
  if (!entrance?.type) return undefined;
  if (entrance.type === "none") {
    return options.preserveExplicitNone ? { entrance: { type: "none" } } : undefined;
  }
  return {
    entrance: {
      type: entrance.type,
      ...(entrance.speed ? { speed: entrance.speed } : {}),
      ...(entrance.delay ? { delay: entrance.delay } : {}),
    },
  };
}

export function hasEntranceAnimation(animation: AuthoredAnimation | undefined): boolean {
  return Boolean(animation?.entrance?.type && animation.entrance.type !== "none");
}

export function normalizeGalleryItemAnimation(animation: GalleryItemAnimation | undefined, options: { preserveExplicitNone?: boolean } = {}): GalleryItemAnimation | undefined {
  const entrance = animation?.entrance;
  if (!entrance?.type) return undefined;
  if (entrance.type === "none") return options.preserveExplicitNone ? { entrance: { type: "none" } } : undefined;
  return { entrance: { type: entrance.type, ...(entrance.speed && entrance.speed !== "normal" ? { speed: entrance.speed } : {}), ...(entrance.stagger && entrance.stagger !== "none" ? { stagger: entrance.stagger } : {}) } };
}

export function galleryItemAnimationAsAuthored(animation: GalleryItemAnimation | undefined): AuthoredAnimation | undefined {
  const entrance = animation?.entrance;
  return entrance?.type ? { entrance: { type: entrance.type, ...(entrance.speed ? { speed: entrance.speed } : {}) } } : undefined;
}
