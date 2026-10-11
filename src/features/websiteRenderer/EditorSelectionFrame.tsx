export function EditorSelectionFrame({ selected }: { selected: boolean }) {
  if (!selected) return null;
  return (
    <span
      className="editor-selection-frame"
      aria-hidden="true"
    />
  );
}
