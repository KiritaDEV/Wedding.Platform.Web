import type { ResolvedDesignContext, TemplateDesignLibrary } from "../websiteCapabilities/types";
import { textFontCapabilities, type TextAppearance } from "./text";
import type { TextElement } from "./types";

export const friendlyFontWeightOptions = (fontId?: string) => textFontCapabilities(fontId).weights
  .map((weight) => ({ value: String(weight), label: weight === 400 ? "Normal" : weight === 600 ? "Semi-bold" : "Bold" }));

export function withTextAppearance(element: TextElement, appearance: TextAppearance): TextElement {
  const next = { ...element };
  if (Object.keys(appearance).length) next.appearance = appearance; else delete next.appearance;
  return next;
}

export function curatedTextColors(
  library: TemplateDesignLibrary,
  allowedIds: readonly string[],
  context?: ResolvedDesignContext | null,
  currentId?: string,
): Array<{ id: string; displayName: string; value: string }> {
  const allowed = new Set(allowedIds);
  const palette = library.palettePresets.find(({ roles }) => context && roles.text === context.bodyColorId && roles.accent === context.accentColorId)
    ?? library.palettePresets.find(({ roles }) => context && Object.values(roles).includes(context.bodyColorId))
    ?? library.palettePresets[0];
  const semantic = [
    [context?.headingColorId, "Primary"],
    [context?.accentColorId, "Accent"],
    [context?.bodyColorId, "Text"],
    [palette?.roles.textMuted, "Muted"],
  ] as const;
  const seen = new Set<string>();
  const result: Array<{ id: string; displayName: string; value: string }> = semantic.flatMap(([id, displayName]) => {
    if (!id || seen.has(id) || !allowed.has(id)) return [];
    const color = library.colors.find((candidate) => candidate.id === id);
    if (!color) return [];
    seen.add(id);
    return [{ id, displayName, value: color.value }];
  });
  if (currentId && allowed.has(currentId) && !seen.has(currentId)) {
    const current = library.colors.find(({ id }) => id === currentId);
    if (current) result.push({ ...current, displayName: "Current color" });
  }
  return result;
}
