export type InlineEditLifecycle = {
  activeKey: string | null;
  entryValue: string;
};

export function advanceInlineEditLifecycle(
  previous: InlineEditLifecycle,
  activeKey: string | null,
  currentValue: string,
): { lifecycle: InlineEditLifecycle; began: boolean } {
  if (!activeKey) return { lifecycle: { ...previous, activeKey: null }, began: false };
  if (previous.activeKey === activeKey) return { lifecycle: previous, began: false };
  return { lifecycle: { activeKey, entryValue: currentValue }, began: true };
}
