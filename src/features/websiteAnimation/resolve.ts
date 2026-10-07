import type { ResponsiveViewport, WebsiteSectionAppearance, WebsiteSectionAppearanceEnvelope } from "../websiteEditor/types";
import type { WebsiteElement } from "../websiteElements/types";
import { normalizeAuthoredAnimation, normalizeGalleryItemAnimation, type AuthoredAnimation, type GalleryItemAnimation } from "./contract";

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

export function resolveSectionAnimation(appearance: WebsiteSectionAppearance | WebsiteSectionAppearanceEnvelope, viewport: ResponsiveViewport): AuthoredAnimation | undefined {
  if ("shared" in appearance) {
    const authored = appearance.custom?.[viewport]?.animation ?? appearance.shared.animation;
    return normalizeAuthoredAnimation(authored, { preserveExplicitNone: true });
  }
  return resolveAppearanceAnimation(appearance, viewport);
}

export function resolveRsvpSpecializedAnimation(appearance: WebsiteSectionAppearance, viewport: ResponsiveViewport): AuthoredAnimation | undefined {
  const specialized = viewport === "desktop"
    ? appearance.specialized?.content?.animation
    : appearance.responsive?.[viewport]?.specialized?.content?.animation ?? appearance.specialized?.content?.animation;
  return normalizeAuthoredAnimation(specialized, { preserveExplicitNone: true });
}

export function resolveGalleryItemAnimation(appearance: WebsiteSectionAppearance | WebsiteSectionAppearanceEnvelope, viewport: ResponsiveViewport): GalleryItemAnimation | undefined {
  const authored = "shared" in appearance
    ? appearance.custom?.[viewport]?.galleryItemAnimation ?? appearance.shared.galleryItemAnimation
    : appearance.galleryItemAnimation;
  return normalizeGalleryItemAnimation(authored, { preserveExplicitNone: true });
}
