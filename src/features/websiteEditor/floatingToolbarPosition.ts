export type ToolbarRect = { left: number; top: number; width: number; height: number };
export type ToolbarPosition = { left: number; top: number; placement: "above" | "below" };

export function resolveRangeToolbarAnchor(range: Pick<Range, "getBoundingClientRect" | "getClientRects">): ToolbarRect | null {
  const bounding = range.getBoundingClientRect();
  const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
  if (!rects.length) return bounding.width > 0 && bounding.height > 0 ? bounding : null;
  const firstTop = Math.min(...rects.map((rect) => rect.top));
  const upperLine = rects.filter((rect) => Math.abs(rect.top - firstTop) < 1);
  const left = Math.min(...upperLine.map((rect) => rect.left));
  const right = Math.max(...upperLine.map((rect) => rect.right));
  const top = Math.min(...upperLine.map((rect) => rect.top));
  const bottom = Math.max(...upperLine.map((rect) => rect.bottom));
  return { left, top, width: right - left, height: bottom - top };
}

export function translateToolbarAnchorToHost(
  anchor: ToolbarRect,
  sourceDocument: Document,
  hostDocument: Document,
): ToolbarRect | null {
  if (sourceDocument === hostDocument) return anchor;
  const frame = Array.from(hostDocument.querySelectorAll("iframe"))
    .find((candidate) => candidate.contentDocument === sourceDocument);
  if (!frame) return null;
  const frameBounds = frame.getBoundingClientRect();
  const scaleX = frame.clientWidth > 0 ? frameBounds.width / frame.clientWidth : 1;
  const scaleY = frame.clientHeight > 0 ? frameBounds.height / frame.clientHeight : scaleX;
  return {
    left: frameBounds.left + anchor.left * scaleX,
    top: frameBounds.top + anchor.top * scaleY,
    width: anchor.width * scaleX,
    height: anchor.height * scaleY,
  };
}

export function resolveFloatingToolbarResizeObserver(
  view: Window,
  fallback: typeof ResizeObserver | undefined = typeof ResizeObserver === "undefined" ? undefined : ResizeObserver,
): typeof ResizeObserver | undefined {
  return (view as Window & { ResizeObserver?: typeof ResizeObserver }).ResizeObserver ?? fallback;
}

export function resolveFloatingToolbarPosition(anchor: ToolbarRect, toolbar: Pick<ToolbarRect, "width" | "height">, viewport: { width: number; height: number }, margin = 8, gap = 8): ToolbarPosition {
  const maximumLeft = Math.max(margin, viewport.width - toolbar.width - margin);
  const left = Math.min(Math.max(anchor.left + anchor.width / 2 - toolbar.width / 2, margin), maximumLeft);
  const roomAbove = anchor.top - margin;
  const placement = roomAbove >= toolbar.height + gap ? "above" : "below";
  const idealTop = placement === "above" ? anchor.top - toolbar.height - gap : anchor.top + anchor.height + gap;
  const maximumTop = Math.max(margin, viewport.height - toolbar.height - margin);
  return { left, top: Math.min(Math.max(idealTop, margin), maximumTop), placement };
}
