const REVEAL_PADDING = 12;

export function revealStructureRow(
  container: HTMLElement,
  row: HTMLElement,
  padding = REVEAL_PADDING,
) {
  const containerBounds = container.getBoundingClientRect();
  const rowBounds = row.getBoundingClientRect();
  if (containerBounds.height <= 0 || rowBounds.height <= 0) return false;

  const visibleTop = containerBounds.top + padding;
  const visibleBottom = containerBounds.bottom - padding;
  const top = rowBounds.top < visibleTop
    ? rowBounds.top - visibleTop
    : rowBounds.bottom > visibleBottom
      ? rowBounds.bottom - visibleBottom
      : 0;
  if (top === 0) return false;

  container.scrollBy({ top, behavior: "auto" });
  return true;
}
