import type { ResponsiveViewport } from "./types";

export type EditorZoomPreference =
  | { type: "fit" }
  | { type: "custom"; scale: number };

export type EditorZoomPreferences = Record<ResponsiveViewport, EditorZoomPreference>;

export const EDITOR_ZOOM_STORAGE_KEY = "wedding-platform:website-editor-zoom:v1";
export const EDITOR_ZOOM_STEPS = [0.5, 0.67, 0.75, 0.9, 1] as const;
export const EDITOR_ZOOM_FIT_INSET = 16;

export const DEFAULT_EDITOR_ZOOM_PREFERENCES: EditorZoomPreferences = {
  desktop: { type: "fit" },
  tablet: { type: "fit" },
  mobile: { type: "custom", scale: 1 },
};

export function resolveEditorCanvasGeometry(viewport: Readonly<{ width: number; height: number }>, scale: number) {
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return {
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    displayWidth: viewport.width * safeScale,
    displayHeight: viewport.height * safeScale,
    scale: safeScale,
  };
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function browserEditorZoomStorage(): StorageLike | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

function isSupportedScale(value: unknown): value is number {
  return typeof value === "number" && EDITOR_ZOOM_STEPS.some((scale) => scale === value);
}

export function validateEditorZoomPreference(
  value: unknown,
  fallback: EditorZoomPreference,
): EditorZoomPreference {
  if (!value || typeof value !== "object") return fallback;
  const candidate = value as { type?: unknown; scale?: unknown };
  if (candidate.type === "fit") return { type: "fit" };
  if (candidate.type === "custom" && isSupportedScale(candidate.scale)) {
    return { type: "custom", scale: candidate.scale };
  }
  return fallback;
}

export function parseEditorZoomPreferences(value: string | null): EditorZoomPreferences {
  if (!value) return { ...DEFAULT_EDITOR_ZOOM_PREFERENCES };
  try {
    const parsed: unknown = JSON.parse(value);
    const record = parsed && typeof parsed === "object"
      ? parsed as Partial<Record<ResponsiveViewport, unknown>>
      : {};
    return {
      desktop: validateEditorZoomPreference(record.desktop, DEFAULT_EDITOR_ZOOM_PREFERENCES.desktop),
      tablet: validateEditorZoomPreference(record.tablet, DEFAULT_EDITOR_ZOOM_PREFERENCES.tablet),
      mobile: validateEditorZoomPreference(record.mobile, DEFAULT_EDITOR_ZOOM_PREFERENCES.mobile),
    };
  } catch {
    return { ...DEFAULT_EDITOR_ZOOM_PREFERENCES };
  }
}

export function loadEditorZoomPreferences(storage?: StorageLike): EditorZoomPreferences {
  try {
    return parseEditorZoomPreferences(storage?.getItem(EDITOR_ZOOM_STORAGE_KEY) ?? null);
  } catch {
    return { ...DEFAULT_EDITOR_ZOOM_PREFERENCES };
  }
}

export function saveEditorZoomPreferences(
  preferences: EditorZoomPreferences,
  storage?: StorageLike,
): void {
  try {
    storage?.setItem(EDITOR_ZOOM_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Browser privacy settings and storage quotas must not break the editor.
  }
}

export function computeFitScale(
  availableWidth: number,
  availableHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  inset = EDITOR_ZOOM_FIT_INSET,
): number {
  if (![availableWidth, availableHeight, viewportWidth, viewportHeight].every(Number.isFinite) || viewportWidth <= 0 || viewportHeight <= 0) return 1;
  return Math.min(Math.max(Math.min((availableWidth - inset) / viewportWidth, (availableHeight - inset) / viewportHeight), 0.01), 1);
}

export function stepEditorZoom(
  preference: EditorZoomPreference,
  effectiveScale: number,
  direction: -1 | 1,
): EditorZoomPreference {
  const current = preference.type === "custom" ? preference.scale : effectiveScale;
  const next = direction > 0
    ? EDITOR_ZOOM_STEPS.find((scale) => scale > current + 0.0001)
    : [...EDITOR_ZOOM_STEPS].reverse().find((scale) => scale < current - 0.0001);
  return { type: "custom", scale: next ?? (direction > 0 ? 1 : 0.5) };
}
