const REVEAL_COMFORT = 24;

type VerticalBounds = Pick<DOMRect, "top" | "bottom" | "height">;

export function revealScrollDelta(
  target: VerticalBounds,
  viewport: Pick<VerticalBounds, "top" | "bottom">,
  comfort: number,
  clientToScrollScale = 1,
) {
  if (viewport.bottom <= viewport.top || target.height <= 0) return 0;
  const visibleTop = viewport.top + comfort;
  const visibleBottom = viewport.bottom - comfort;
  const clientDelta = target.top < visibleTop
    ? target.top - visibleTop
    : target.bottom > visibleBottom
      ? target.bottom - visibleBottom
      : 0;
  return clientDelta / (clientToScrollScale > 0 ? clientToScrollScale : 1);
}

function transformedScrollScale(container: HTMLElement, bounds: DOMRect) {
  return container.clientHeight > 0 ? bounds.height / container.clientHeight : 1;
}

export function revealEditorTarget(
  target: HTMLElement,
  comfort = REVEAL_COMFORT,
) {
  const ownerDocument = target.ownerDocument;
  const ownerWindow = ownerDocument.defaultView;
  if (!ownerWindow) return false;

  const markedContainer = target.closest<HTMLElement>("[data-editor-preview-scroll]");
  const scrollContainer = markedContainer ?? ownerDocument.scrollingElement;
  if (!scrollContainer) return false;

  const targetBounds = target.getBoundingClientRect();
  const containerBounds = markedContainer?.getBoundingClientRect();
  const viewportBounds = containerBounds ?? {
    top: 0,
    bottom: ownerDocument.documentElement.clientHeight,
  };
  const scale = markedContainer && containerBounds
    ? transformedScrollScale(markedContainer, containerBounds)
    : 1;
  const delta = revealScrollDelta(targetBounds, viewportBounds, comfort, scale);
  if (delta === 0) return false;

  const behavior = ownerWindow.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
  scrollContainer.scrollBy({ top: delta, behavior });
  return true;
}

export function findEditorTarget(
  documents: readonly Document[],
  selector: string,
) {
  return documents
    .map((candidate) => candidate.querySelector<HTMLElement>(selector))
    .find(Boolean);
}
