export const EDITOR_DESKTOP_PANE_WIDTHS = {
  structure: 300,
  inspector: 390,
} as const;

export const DESKTOP_EDITOR_GRID_COLUMNS = `${EDITOR_DESKTOP_PANE_WIDTHS.structure}px minmax(0, 1fr) ${EDITOR_DESKTOP_PANE_WIDTHS.inspector}px`;
