import type { ResponsiveViewport } from "../websiteEditor/types";
import type { WebsiteElement } from "../websiteElements/types";
import type { SectionChildFlow } from "../websiteEditor/sectionChildFlow";
import { hasEntranceAnimation } from "./contract";
import { resolveElementAnimation } from "./resolve";
import {
  ANIMATION_DELAYS,
  ANIMATION_SPEEDS,
  ANIMATION_TYPES,
  normalizeAuthoredAnimation,
  type AnimationDelay,
  type AnimationSpeed,
  type AnimationType,
  type AuthoredAnimation,
} from "./contract";

export const ANIMATION_EFFECT_OPTIONS = ANIMATION_TYPES.map(value => ({ value, label: ({ none: "None", fade: "Fade", "fade-up": "Fade up", "fade-down": "Fade down", "scale-in": "Scale in" } as const)[value] }));
export const ANIMATION_SPEED_OPTIONS = ANIMATION_SPEEDS.map(value => ({ value, label: ({ fast: "Fast", normal: "Normal", slow: "Slow" } as const)[value] }));
export const ANIMATION_DELAY_OPTIONS = ANIMATION_DELAYS.map(value => ({ value, label: ({ none: "No delay", short: "Short", medium: "Medium", long: "Long" } as const)[value] }));

export const DEFAULT_ANIMATION_SPEED: AnimationSpeed = "normal";
export const DEFAULT_ANIMATION_DELAY: AnimationDelay = "none";

export function animationSummary(animation?: AuthoredAnimation): string {
  const entrance = animation?.entrance;
  if (!entrance?.type || entrance.type === "none") return "None";
  const labels: Record<AnimationType, string> = {
    none: "None",
    fade: "Fade",
    "fade-up": "Fade up",
    "fade-down": "Fade down",
    "scale-in": "Scale in",
  };
  const parts = [labels[entrance.type]];
  if ((entrance.speed ?? DEFAULT_ANIMATION_SPEED) !== DEFAULT_ANIMATION_SPEED)
    parts.push(capitalize(entrance.speed!));
  if ((entrance.delay ?? DEFAULT_ANIMATION_DELAY) !== DEFAULT_ANIMATION_DELAY)
    parts.push(`${capitalize(entrance.delay!)} delay`);
  return parts.join(" · ");
}

export function updateAuthoredAnimation(
  current: AuthoredAnimation | undefined,
  change: { type?: AnimationType; speed?: AnimationSpeed; delay?: AnimationDelay },
  preserveExplicitNone = false,
): AuthoredAnimation | undefined {
  const type = change.type ?? current?.entrance?.type;
  if (!type || type === "none")
    return normalizeAuthoredAnimation(
      type === "none" ? { entrance: { type } } : undefined,
      { preserveExplicitNone },
    );
  const speed = change.speed ?? current?.entrance?.speed;
  const delay = change.delay ?? current?.entrance?.delay;
  return normalizeAuthoredAnimation({
    entrance: {
      type,
      ...(speed && speed !== DEFAULT_ANIMATION_SPEED ? { speed } : {}),
      ...(delay && delay !== DEFAULT_ANIMATION_DELAY ? { delay } : {}),
    },
  });
}

export function updateElementAnimation(
  element: WebsiteElement,
  viewport: ResponsiveViewport,
  animation: AuthoredAnimation | undefined,
): WebsiteElement {
  const next = structuredClone(element) as WebsiteElement & {
    appearance?: Record<string, unknown> & {
      animation?: AuthoredAnimation;
      responsive?: Partial<Record<"tablet" | "mobile", Record<string, unknown> & { animation?: AuthoredAnimation }>>;
    };
  };
  const appearance = { ...(next.appearance ?? {}) };
  if (viewport === "desktop") {
    if (animation) appearance.animation = animation;
    else delete appearance.animation;
  } else {
    const responsive = { ...appearance.responsive };
    const branch = { ...responsive[viewport] };
    if (animation) branch.animation = animation;
    else delete branch.animation;
    if (Object.keys(branch).length) responsive[viewport] = branch;
    else delete responsive[viewport];
    if (Object.keys(responsive).length) appearance.responsive = responsive;
    else delete appearance.responsive;
  }
  if (Object.keys(appearance).length) next.appearance = appearance as typeof next.appearance;
  else delete next.appearance;
  return next;
}

export function authoredElementAnimation(element: WebsiteElement, viewport: ResponsiveViewport): AuthoredAnimation | undefined {
  const appearance = "appearance" in element ? element.appearance as { animation?: AuthoredAnimation; responsive?: Partial<Record<"tablet" | "mobile", { animation?: AuthoredAnimation }>> } | undefined : undefined;
  return viewport === "desktop" ? appearance?.animation : appearance?.responsive?.[viewport]?.animation;
}

export function animatedElementAncestor(flow: SectionChildFlow, elementId: string, viewport: ResponsiveViewport): WebsiteElement | undefined {
  const ancestors: WebsiteElement[] = [];
  const visit = (elements: WebsiteElement[], parents: WebsiteElement[]): boolean => {
    for (const element of elements) {
      if (element.id === elementId) {
        ancestors.push(...parents);
        return true;
      }
      if (element.type === "compositionGroup" && visit(element.children, [...parents, element])) return true;
    }
    return false;
  };
  visit(flow.elements, []);
  return ancestors.find(ancestor => hasEntranceAnimation(resolveElementAnimation(ancestor, viewport)));
}

function capitalize(value: string): string {
  return value[0].toUpperCase() + value.slice(1);
}
