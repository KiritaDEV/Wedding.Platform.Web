import type { ResponsiveViewport, WebsiteSectionAppearance } from "../websiteEditor/types";
import type { WebsiteElement } from "../websiteElements/types";
import { normalizeAuthoredAnimation, type AuthoredAnimation } from "./contract";

type ResponsiveAnimationAppearance = {
  animation?: AuthoredAnimation;
  responsive?: Partial<Record<"tablet" | "mobile", { animation?: AuthoredAnimation }>>;
};

export function resolveAppearanceAnimation(
  appearance: ResponsiveAnimationAppearance | undefined,
  viewport: ResponsiveViewport,
): AuthoredAnimation | undefined {
  const authored = viewport === "desktop"
    ? appearance?.animation
    : appearance?.responsive?.[viewport]?.animation ?? appearance?.animation;
  return normalizeAuthoredAnimation(authored, { preserveExplicitNone: true });
}

export function resolveElementAnimation(element: WebsiteElement, viewport: ResponsiveViewport): AuthoredAnimation | undefined {
  const appearance = "appearance" in element ? element.appearance as ResponsiveAnimationAppearance | undefined : undefined;
  return resolveAppearanceAnimation(appearance, viewport);
}

export function resolveSectionAnimation(appearance: WebsiteSectionAppearance, viewport: ResponsiveViewport): AuthoredAnimation | undefined {
  return resolveAppearanceAnimation(appearance, viewport);
}

export function resolveRsvpSpecializedAnimation(appearance: WebsiteSectionAppearance, viewport: ResponsiveViewport): AuthoredAnimation | undefined {
  const specialized = viewport === "desktop"
    ? appearance.specialized?.content?.animation
    : appearance.responsive?.[viewport]?.specialized?.content?.animation ?? appearance.specialized?.content?.animation;
  return normalizeAuthoredAnimation(specialized, { preserveExplicitNone: true });
}

