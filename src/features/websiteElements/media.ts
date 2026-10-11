import type { MediaElement } from "./types";
import type { ResponsiveViewport } from "../websiteEditor/types";
import { clampMediaPoint, clampMediaZoom, type MediaPoint } from "./mediaCrop";
import { isUnsupportedVideoProviderUrl } from "./videoUrl";

type ResponsiveProperty = "mode" | "width" | "aspectRatio";
type GlobalProperty = "alignment" | "fit" | "carousel";
type Presentation = NonNullable<MediaElement["presentation"]>;
type ResponsivePresentation = NonNullable<NonNullable<Presentation["responsive"]>["mobile"]>;

const compact = <T extends object>(value: T | undefined): T | undefined => {
  if (!value) return undefined;
  const entries = Object.entries(value).filter(([, item]) => item !== undefined);
  return entries.length ? Object.fromEntries(entries) as T : undefined;
};
const withPresentation = (element: MediaElement, presentation: MediaElement["presentation"]): MediaElement => {
  const next = { ...element };
  if (presentation) next.presentation = presentation;
  else delete next.presentation;
  return next;
};

const canonicalMode = (mode: ResponsivePresentation["mode"], itemCount: number) => {
  if (mode === undefined || itemCount === 0) return undefined;
  return itemCount === 1 ? "single" as const : "carousel" as const;
};

export function canonicalizeMediaPresentation(presentation: MediaElement["presentation"], itemCount: number): MediaElement["presentation"] {
  if (!presentation) return undefined;
  const mode = canonicalMode(presentation.mode, itemCount);
  const carousel = compact(presentation.carousel);
  const base = {
    mode: mode ?? (itemCount > 1 ? "carousel" as const : "single" as const),
    width: presentation.width ?? "full" as const,
    aspectRatio: presentation.aspectRatio ?? "natural" as const,
  };
  const normalizeOverride = (override: ResponsivePresentation | undefined): ResponsivePresentation | undefined => {
    if (!override) return undefined;
    const overrideMode = canonicalMode(override.mode, itemCount);
    return compact({
      ...(overrideMode !== undefined && overrideMode !== base.mode ? { mode: overrideMode } : {}),
      ...(override.width !== undefined && override.width !== base.width ? { width: override.width } : {}),
      ...(override.aspectRatio !== undefined && override.aspectRatio !== base.aspectRatio ? { aspectRatio: override.aspectRatio } : {}),
    });
  };
  const tablet = normalizeOverride(presentation.responsive?.tablet);
  const mobile = normalizeOverride(presentation.responsive?.mobile);
  const responsive = compact({ ...(tablet ? { tablet } : {}), ...(mobile ? { mobile } : {}) });
  return compact({
    ...(mode ? { mode } : {}),
    ...(presentation.width ? { width: presentation.width } : {}),
    ...(presentation.alignment ? { alignment: presentation.alignment } : {}),
    ...(presentation.aspectRatio ? { aspectRatio: presentation.aspectRatio } : {}),
    ...(presentation.fit ? { fit: presentation.fit } : {}),
    ...(carousel ? { carousel } : {}),
    ...(responsive ? { responsive } : {}),
  });
}

export function resolveMediaPresentation(element: MediaElement, viewport: ResponsiveViewport) {
  const base = element.presentation ?? {};
  const override = viewport === "desktop" ? undefined : base.responsive?.[viewport];
  return { mode: element.items.length > 1 ? "carousel" as const : "single" as const, width: "full" as const, alignment: "center" as const, aspectRatio: "natural" as const, fit: "cover" as const, ...base, ...override, responsive: base.responsive };
}

export function setMediaPresentationProperty(element: MediaElement, viewport: ResponsiveViewport, key: ResponsiveProperty | GlobalProperty, value: unknown): MediaElement {
  const presentation = element.presentation ?? {};
  if (viewport === "desktop" || key === "alignment" || key === "fit" || key === "carousel") {
    const values = { ...presentation } as Record<string, unknown>;
    const normalized = value && typeof value === "object" && !Array.isArray(value) ? compact(value as object) : value;
    if (normalized === undefined) delete values[key];
    else values[key] = normalized;
    const next = canonicalizeMediaPresentation(compact(values) as MediaElement["presentation"], element.items.length);
    return withPresentation(element, next);
  }
  const next = canonicalizeMediaPresentation({ ...presentation, responsive: { ...presentation.responsive, [viewport]: { ...presentation.responsive?.[viewport], [key]: value } } }, element.items.length);
  return withPresentation(element, next);
}

export function setMediaItems(element: MediaElement, items: MediaElement["items"]): MediaElement {
  const nextPresentation = canonicalizeMediaPresentation(element.presentation, items.length);
  return withPresentation({ ...element, items }, nextPresentation);
}

export function setMediaImageFraming(element: MediaElement, itemId: string, point: MediaPoint, zoom: number): MediaElement {
  const normalizedPoint = clampMediaPoint(point);
  const normalizedZoom = clampMediaZoom(zoom);
  return {
    ...element,
    items: element.items.map((item) => {
      if (item.id !== itemId || item.type !== "image") return item;
      const next = { ...item };
      if (normalizedPoint.x === 0.5 && normalizedPoint.y === 0.5) delete next.focalPoint;
      else next.focalPoint = normalizedPoint;
      if (normalizedZoom === 1) delete next.zoom;
      else next.zoom = normalizedZoom;
      return next;
    }),
  };
}

export function replaceMediaImageSource(element: MediaElement, itemId: string, mediaId: string, alt: string): MediaElement {
  return setMediaItems(element, element.items.map((item) => {
    if (item.id !== itemId || item.type !== "image") return item;
    const replacement = { ...item, mediaId, alt: item.decorative ? "" : alt.trim() };
    delete replacement.focalPoint;
    delete replacement.zoom;
    return replacement;
  }));
}

export function directVideoUrlIssue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Enter a direct video URL.";
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return "Video URLs must use HTTPS.";
    return isUnsupportedVideoProviderUrl(url.href) ? "Direct video file required. YouTube and Vimeo links aren't supported." : null;
  } catch {
    return "Enter a valid video URL.";
  }
}

export const shouldShowMediaVideoLoadError = (mode: "editor" | "public", failed: boolean) => mode === "editor" && failed;

export const carouselIntervalSeconds = (intervalMs: number | undefined) => (intervalMs ?? 5000) / 1000;

export function carouselIntervalMilliseconds(value: string): number | undefined {
  if (!/^\d+$/.test(value)) return undefined;
  const seconds = Number(value);
  return Number.isInteger(seconds) && seconds >= 2 && seconds <= 15 ? seconds * 1000 : undefined;
}

export function setMediaImageDecorative(element: MediaElement, itemId: string, decorative: boolean, meaningfulAlt: string): MediaElement {
  const fallback = meaningfulAlt.trim() || "Image";
  return {
    ...element,
    items: element.items.map((item) => item.id === itemId && item.type === "image" ? { ...item, decorative, alt: decorative ? "" : fallback } : item),
  };
}

export const carouselIndex = (current: number, direction: -1 | 1, length: number, loop: boolean) => loop ? (current + direction + length) % length : Math.max(0, Math.min(length - 1, current + direction));
export const mediaAutoplayAllowed = (autoplay: boolean, itemCount: number, reducedMotion: boolean, mode: "editor" | "public" = "public") => mode === "public" && autoplay && itemCount > 1 && !reducedMotion;
export const carouselAutoplayStep = (current: number, length: number, loop: boolean) => { const next = carouselIndex(current, 1, length, loop); return { next, stop: !loop && next >= length - 1 }; };
