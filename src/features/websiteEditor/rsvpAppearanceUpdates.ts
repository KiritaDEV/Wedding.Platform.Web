import type { ActionAppearance } from "../websitePresentation/actionAppearance";
import type { ChoiceAppearance } from "../websitePresentation/choiceAppearance";
import type { RuntimeTextAppearance } from "../websitePresentation/runtimeTextAppearance";

const compact = <T extends object>(value: T): T => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && (!(typeof item === "object" && item !== null) || Object.keys(item).length))) as T;

export const updateChoiceColor = (authored: ChoiceAppearance, state: "selected" | "unselected", key: "textColorId" | "backgroundColorId" | "borderColorId", value?: string): ChoiceAppearance => compact({ ...authored, [state]: compact({ ...authored[state], [key]: value }) });

export const updateActionColor = (authored: ActionAppearance, key: "textColorId" | "backgroundColorId" | "borderColorId", value?: string): ActionAppearance => compact({ ...authored, [key]: value });

export const updateRuntimeTextColor = (authored: RuntimeTextAppearance, key: "colorId" | "textShadowColorId" | "glowColorId", value?: string): RuntimeTextAppearance => compact({ ...authored, [key]: value });

export const updateRuntimeTextEffect = (authored: RuntimeTextAppearance, effect: "textShadow" | "glow", value: RuntimeTextAppearance["textShadow"]): RuntimeTextAppearance => {
  const colorKey = effect === "textShadow" ? "textShadowColorId" : "glowColorId";
  return compact({ ...authored, [effect]: value, [colorKey]: value === "none" ? undefined : authored[colorKey] });
};
