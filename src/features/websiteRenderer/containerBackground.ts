import type { TemplateDesignLibrary } from "../websiteCapabilities/types";
import type { ProjectColor } from "../websiteColors/projectColors";
import { resolveWebsiteColor } from "../websiteColors/projectColors";

export function resolveContainerBackgroundColor(
  backgroundColorId: string | undefined,
  library: TemplateDesignLibrary,
  projectColors: readonly ProjectColor[],
): string | undefined {
  return resolveWebsiteColor(backgroundColorId, library, projectColors);
}
