import type { TemplateDesignLibrary } from "../websiteCapabilities/types";
import type { ProjectColor } from "../websiteColors/projectColors";
import { resolveWebsiteColor } from "../websiteColors/projectColors";
import type { ActionAppearance } from "./actionAppearance";
import type { ChoiceAppearance } from "./choiceAppearance";
import type { RuntimeTextAppearance } from "./runtimeTextAppearance";
import { validateRuntimeTextFont } from "./runtimeTextAppearance";

export type AppearanceResourceIssue = { path: string; message: string };

export function validateRuntimeTextResources(appearance: RuntimeTextAppearance, library: TemplateDesignLibrary, projectColors: readonly ProjectColor[]): AppearanceResourceIssue[] {
  const fontIssue = validateRuntimeTextFont(appearance);
  return [
    ...validateColorFields(appearance, ["colorId", "textShadowColorId", "glowColorId"], "typography", library, projectColors),
    ...(fontIssue ? [{ path: "typography.fontFamilyId", message: fontIssue }] : []),
  ];
}

export function validateActionAppearanceResources(appearance: ActionAppearance, library: TemplateDesignLibrary, projectColors: readonly ProjectColor[]): AppearanceResourceIssue[] {
  return [
    ...validateColorFields(appearance, ["textColorId", "backgroundColorId", "borderColorId"], "action", library, projectColors),
    ...validateRuntimeTextResources(appearance.typography ?? {}, library, projectColors).map((issue) => ({ ...issue, path: `action.${issue.path}` })),
  ];
}

export function validateChoiceAppearanceResources(appearance: ChoiceAppearance, library: TemplateDesignLibrary, projectColors: readonly ProjectColor[]): AppearanceResourceIssue[] {
  return [
    ...validateColorFields(appearance.unselected ?? {}, ["textColorId", "backgroundColorId", "borderColorId"], "choice.unselected", library, projectColors),
    ...validateColorFields(appearance.selected ?? {}, ["textColorId", "backgroundColorId", "borderColorId"], "choice.selected", library, projectColors),
  ];
}

function validateColorFields(value: Record<string, unknown>, fields: readonly string[], prefix: string, library: TemplateDesignLibrary, projectColors: readonly ProjectColor[]): AppearanceResourceIssue[] {
  return fields.flatMap((field) => {
    const colorId = value[field];
    return typeof colorId === "string" && resolveWebsiteColor(colorId, library, projectColors) === undefined
      ? [{ path: `${prefix}.${field}`, message: "Website color is not supported." }]
      : [];
  });
}
