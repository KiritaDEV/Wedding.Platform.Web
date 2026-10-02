import { z } from "zod";

export const ENTRANCE_ANIMATION_TYPES = ["none", "fade", "fade-up", "fade-down", "scale-in"] as const;
export const ANIMATION_SPEEDS = ["fast", "normal", "slow"] as const;
export const ANIMATION_DELAYS = ["none", "short", "medium", "long"] as const;

export const entranceAnimationSchema = z.object({
  type: z.enum(ENTRANCE_ANIMATION_TYPES).optional(),
  speed: z.enum(ANIMATION_SPEEDS).optional(),
  delay: z.enum(ANIMATION_DELAYS).optional(),
}).strict();

export const authoredAnimationSchema = z.object({
  entrance: entranceAnimationSchema.optional(),
}).strict();

export type EntranceAnimation = z.infer<typeof entranceAnimationSchema>;
export type AuthoredAnimation = z.infer<typeof authoredAnimationSchema>;

export const ANIMATION_DURATION_MS = { fast: 250, normal: 450, slow: 700 } as const;
export const ANIMATION_DELAY_MS = { none: 0, short: 100, medium: 250, long: 500 } as const;
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

