type ThemeRoot = Pick<HTMLElement, "className" | "dataset">;

export function syncEditorPreviewTheme(source: ThemeRoot, target: ThemeRoot) {
  target.className = source.className;
  if (source.dataset.theme) target.dataset.theme = source.dataset.theme;
  else delete target.dataset.theme;
}
