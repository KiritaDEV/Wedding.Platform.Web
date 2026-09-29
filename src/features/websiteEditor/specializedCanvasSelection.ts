export function specializedSectionIdFromTarget(target: EventTarget | null): string | undefined {
  const closest = (target as { closest?: (selector: string) => { getAttribute(name: string): string | null } | null } | null)?.closest;
  const specialized = closest?.call(target, "[data-editor-specialized-section-id]");
  return specialized?.getAttribute("data-editor-specialized-section-id") || undefined;
}
