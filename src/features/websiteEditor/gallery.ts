import { createSemanticId } from "./createSemanticId";
import type { GalleryItem } from "./types";
import { clampMediaPoint, clampMediaZoom, type MediaPoint } from "../websiteElements/mediaCrop";

export function addGalleryImage(items: GalleryItem[], mediaId: string): GalleryItem[] {
  if (items.length >= 24) return items;
  return [...items, { id: createSemanticId("gallery-item"), type: "image", mediaId }];
}

export function addGalleryImages(items: GalleryItem[], mediaIds: string[]): GalleryItem[] {
  const available = Math.max(0, 24 - items.length);
  if (available === 0 || mediaIds.length === 0) return items;
  return [
    ...items,
    ...mediaIds.slice(0, available).map((mediaId) => ({
      id: createSemanticId("gallery-item"),
      type: "image" as const,
      mediaId,
    })),
  ];
}

export function removeGalleryItem(items: GalleryItem[], itemId: string): GalleryItem[] {
  return items.filter(({ id }) => id !== itemId);
}

export function duplicateGalleryItem(items: GalleryItem[], itemId: string): GalleryItem[] {
  const index = items.findIndex(({ id }) => id === itemId);
  if (index < 0 || items.length >= 24) return items;
  const next = [...items];
  next.splice(index + 1, 0, { ...items[index], id: createSemanticId("gallery-item") });
  return next;
}

/** Replacement preserves identity and resets source-specific framing. */
export function replaceGalleryImage(items: GalleryItem[], itemId: string, mediaId: string): GalleryItem[] {
  const source = items.find(item => item.id === itemId);
  if (!source || source.mediaId === mediaId) return items;
  return items.map((item) => {
    if (item.id !== itemId || item.mediaId === mediaId) return item;
    const replacement = { ...item, mediaId };
    delete replacement.focalPoint;
    delete replacement.zoom;
    return replacement;
  });
}

export function frameGalleryItem(items: GalleryItem[], itemId: string, focalPoint?: MediaPoint, zoom?: number): GalleryItem[] {
  return items.map((item) => {
    if (item.id !== itemId) return item;
    const framed = { ...item };
    if (focalPoint !== undefined) {
      const point = clampMediaPoint(focalPoint);
      if (point.x === 0.5 && point.y === 0.5) delete framed.focalPoint;
      else framed.focalPoint = point;
    }
    if (zoom !== undefined) {
      const normalizedZoom = clampMediaZoom(zoom);
      if (normalizedZoom === 1) delete framed.zoom;
      else framed.zoom = normalizedZoom;
    }
    return framed;
  });
}

export function reorderGalleryItem(items: GalleryItem[], from: number, to: number): GalleryItem[] {
  if (from < 0 || to < 0 || from >= items.length || to >= items.length || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
