export type MediaAspectRatio = "natural" | "square" | "portrait" | "landscape" | "wide";
export type MediaPoint = { x: number; y: number };
export type MediaSize = { width: number; height: number };
export type MediaRect = { width: number; height: number; left: number; top: number };

const authoredRatios: Record<Exclude<MediaAspectRatio, "natural">, string> = {
  square: "1 / 1",
  portrait: "3 / 4",
  landscape: "4 / 3",
  wide: "16 / 9",
};

export const isValidMediaDimension = (value: number) => Number.isFinite(value) && value > 0;

export function safeMediaSize(size: MediaSize): MediaSize {
  return isValidMediaDimension(size.width) && isValidMediaDimension(size.height) ? size : { width: 1, height: 1 };
}

export function resolveMediaAspectRatio(aspectRatio: MediaAspectRatio, source: MediaSize): string {
  if (aspectRatio !== "natural") return authoredRatios[aspectRatio];
  const safe = safeMediaSize(source);
  return `${safe.width} / ${safe.height}`;
}

export function clampMediaPoint(point: MediaPoint): MediaPoint {
  const clamp = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5;
  return { x: clamp(point.x), y: clamp(point.y) };
}

export function resolveContainedMediaGeometry(container: MediaSize, source: MediaSize): MediaRect {
  const safeContainer = safeMediaSize(container);
  const safeSource = safeMediaSize(source);
  const scale = Math.min(safeContainer.width / safeSource.width, safeContainer.height / safeSource.height);
  const width = safeSource.width * scale;
  const height = safeSource.height * scale;
  return { width, height, left: (safeContainer.width - width) / 2, top: (safeContainer.height - height) / 2 };
}

export function resolveSourcePointFromViewport(rect: MediaRect, viewportPoint: MediaPoint): MediaPoint {
  const safeRect = { ...rect, width: isValidMediaDimension(rect.width) ? rect.width : 1, height: isValidMediaDimension(rect.height) ? rect.height : 1 };
  return clampMediaPoint({
    x: (viewportPoint.x - safeRect.left) / safeRect.width,
    y: (viewportPoint.y - safeRect.top) / safeRect.height,
  });
}

export function resolveSourcePointInViewport(rect: MediaRect, point: MediaPoint): MediaPoint {
  const safePoint = clampMediaPoint(point);
  return { x: rect.left + safePoint.x * rect.width, y: rect.top + safePoint.y * rect.height };
}

export function clampMediaZoom(value: number): number {
  const safe = Number.isFinite(value) ? value : 1;
  return Math.max(1, Math.min(3, Math.round(safe * 10) / 10));
}

export function calculateBackgroundMinimumZoom(container: MediaSize, source: MediaSize): number {
  if (!isValidMediaDimension(container.width) || !isValidMediaDimension(container.height) || !isValidMediaDimension(source.width) || !isValidMediaDimension(source.height)) return 1;
  const coverScale = Math.max(container.width / source.width, container.height / source.height);
  const containScale = Math.min(container.width / source.width, container.height / source.height);
  return Math.max(Number.EPSILON, Math.min(1, Math.round((containScale / coverScale) * 1000) / 1000));
}

export function clampBackgroundZoom(value: number, minimum: number): number {
  const safeMinimum = Number.isFinite(minimum) && minimum > 0 ? Math.min(1, minimum) : 1;
  const safe = Number.isFinite(value) ? value : 1;
  return Math.max(safeMinimum, Math.min(3, Math.round(safe * 100) / 100));
}

export function resolveMediaCropGeometry(container: MediaSize, source: MediaSize, point: MediaPoint, zoom: number) {
  const safeContainer = safeMediaSize(container);
  const safeSource = safeMediaSize(source);
  const safePoint = clampMediaPoint(point);
  const safeZoom = clampMediaZoom(zoom);
  const baseScale = Math.max(safeContainer.width / safeSource.width, safeContainer.height / safeSource.height);
  const width = safeSource.width * baseScale * safeZoom;
  const height = safeSource.height * baseScale * safeZoom;
  return {
    width,
    height,
    left: Math.max(safeContainer.width - width, Math.min(0, safeContainer.width / 2 - safePoint.x * width)),
    top: Math.max(safeContainer.height - height, Math.min(0, safeContainer.height / 2 - safePoint.y * height)),
    point: safePoint,
    zoom: safeZoom,
  };
}

export function resolveBackgroundMediaGeometry(container: MediaSize, source: MediaSize, point: MediaPoint, zoom: number) {
  const safeContainer = safeMediaSize(container);
  const safeSource = safeMediaSize(source);
  const safePoint = clampMediaPoint(point);
  const minimumZoom = 1;
  const safeZoom = clampMediaZoom(zoom);
  const coverScale = Math.max(safeContainer.width / safeSource.width, safeContainer.height / safeSource.height);
  const width = safeSource.width * coverScale * safeZoom;
  const height = safeSource.height * coverScale * safeZoom;
  const place = (containerSize: number, imageSize: number, focal: number) => imageSize <= containerSize
    ? (containerSize - imageSize) / 2
    : Math.max(containerSize - imageSize, Math.min(0, containerSize / 2 - focal * imageSize));
  return { width, height, left: place(safeContainer.width, width, safePoint.x), top: place(safeContainer.height, height, safePoint.y), point: safePoint, zoom: safeZoom, minimumZoom };
}
