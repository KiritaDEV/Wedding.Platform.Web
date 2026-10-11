import type { ResolvedDesignContext, TemplateDesignLibrary } from "../websiteCapabilities/types";
import { resolveWebsiteColor, type ProjectColor } from "../websiteColors/projectColors";

export function resolveDividerColors(colorId: string | undefined, context: ResolvedDesignContext | null | undefined, library: TemplateDesignLibrary, projectColors: readonly ProjectColor[]) {
  const authoredColor = resolveWebsiteColor(colorId, library, projectColors);
  const defaultColor = resolveWebsiteColor(context?.accentColorId, library, projectColors) ?? "currentColor";
  return { authoredColor, defaultColor, effectiveColor: authoredColor ?? defaultColor };
}
