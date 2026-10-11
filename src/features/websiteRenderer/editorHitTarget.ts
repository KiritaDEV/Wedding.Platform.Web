// Prefer actual sibling bounds over overlapping hit strips. In a gap, use the
// nearest frame; containing Group frames must not steal a leaf's hit target.
export function nearestEditorHitFrame(current: HTMLElement, hits: readonly Element[], x: number, y: number): HTMLElement {
  const frames = [...new Set([current, ...hits.map((hit) => hit.closest<HTMLElement>("[data-editor-website-element]")).filter((frame): frame is HTMLElement => Boolean(frame))])];
  const leaves = frames.filter((frame) => !frames.some((other) => frame !== other && frame.contains(other)));
  const distance = (frame: HTMLElement) => {
    const rect = frame.getBoundingClientRect();
    return Math.hypot(Math.max(rect.left - x, 0, x - rect.right), Math.max(rect.top - y, 0, y - rect.bottom));
  };
  return leaves.reduce((nearest, frame) => distance(frame) < distance(nearest) ? frame : nearest, leaves[0] ?? current);
}
