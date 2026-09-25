import type { ResolvedDesignContext } from "../websiteCapabilities/types";
import type { RuntimeTextAppearance } from "./runtimeTextAppearance";
import type { ActionAppearance } from "./actionAppearance";
import type { ChoiceAppearance } from "./choiceAppearance";

export type RsvpRuntimeLayoutAppearance = {
  width: "narrow" | "medium" | "wide" | "full";
  alignment: "start" | "center" | "end";
  guestGap: "none" | "xs" | "s" | "m" | "l" | "xl";
  guestPadding: "none" | "xs" | "s" | "m" | "l" | "xl";
  guestPresentation: "rows" | "cards";
};

export type RsvpThemePresentation = {
  guestName: RuntimeTextAppearance;
  responseLabel: RuntimeTextAppearance;
  supportingText: RuntimeTextAppearance;
  statusHeading: RuntimeTextAppearance;
  choice: ChoiceAppearance;
  primaryAction: ActionAppearance;
  secondaryAction: ActionAppearance;
  layout: RsvpRuntimeLayoutAppearance;
};

export const PLATFORM_RSVP_PRESENTATION_FALLBACK: RsvpThemePresentation = {
  guestName: { fontSize: "m", fontWeight: 600, lineHeight: "normal" },
  responseLabel: { fontSize: "s", fontWeight: 600, lineHeight: "normal" },
  supportingText: { fontSize: "s", fontWeight: 400, lineHeight: "normal" },
  statusHeading: { fontSize: "l", fontWeight: 600, lineHeight: "tight", alignment: "center" },
  choice: {
    layout: "cards", direction: "row", size: "normal", radius: "soft", borderWidth: "thin", gap: "s",
    selected: { emphasis: "semibold" }, disabled: { opacity: "muted" },
  },
  primaryAction: { variant: "filled", size: "normal", radius: "soft", borderWidth: "thin", width: "intrinsic", alignment: "center", paddingX: "l", paddingY: "s" },
  secondaryAction: { variant: "outline", size: "normal", radius: "soft", borderWidth: "thin", width: "intrinsic", alignment: "center", paddingX: "l", paddingY: "s" },
  layout: { width: "medium", alignment: "center", guestGap: "m", guestPadding: "m", guestPresentation: "cards" },
};

export function rsvpThemePresentation(templateKey: string, context?: ResolvedDesignContext | null): RsvpThemePresentation {
  const commonColors = context ? {
    text: context.bodyColorId,
    heading: context.headingColorId,
    accent: context.accentColorId,
  } : {};
  if (templateKey === "classic-filipiniana-v1") return {
    guestName: { fontFamilyId: context?.headingFontId, colorId: commonColors.heading, fontSize: "l", fontWeight: 600, lineHeight: "tight" },
    responseLabel: { fontFamilyId: context?.bodyFontId, colorId: commonColors.text, fontSize: "xs", fontWeight: 600, letterSpacing: "wide", textTransform: "uppercase" },
    supportingText: { fontFamilyId: context?.bodyFontId, colorId: commonColors.text, fontSize: "s", lineHeight: "relaxed" },
    statusHeading: { fontFamilyId: context?.headingFontId, colorId: commonColors.heading, fontSize: "xl", fontWeight: 600, alignment: "center" },
    choice: { ...PLATFORM_RSVP_PRESENTATION_FALLBACK.choice, radius: "soft", selected: { textColorId: commonColors.heading, borderColorId: commonColors.accent, emphasis: "semibold" } },
    primaryAction: { ...PLATFORM_RSVP_PRESENTATION_FALLBACK.primaryAction, textColorId: commonColors.heading, backgroundColorId: commonColors.accent, borderColorId: commonColors.accent, typography: { fontFamilyId: context?.bodyFontId, fontSize: "xs", fontWeight: 600, letterSpacing: "wide", textTransform: "uppercase" } },
    secondaryAction: { ...PLATFORM_RSVP_PRESENTATION_FALLBACK.secondaryAction, textColorId: commonColors.heading, borderColorId: commonColors.accent },
    layout: { ...PLATFORM_RSVP_PRESENTATION_FALLBACK.layout, guestPresentation: "cards" },
  };
  if (templateKey === "modern-editorial-v1") return {
    guestName: { fontFamilyId: context?.headingFontId, colorId: commonColors.heading, fontSize: "l", fontWeight: 600, lineHeight: "tight" },
    responseLabel: { fontFamilyId: context?.bodyFontId, colorId: commonColors.text, fontSize: "xs", fontWeight: 700, letterSpacing: "wide", textTransform: "uppercase" },
    supportingText: { fontFamilyId: context?.bodyFontId, colorId: commonColors.text, fontSize: "s", lineHeight: "normal" },
    statusHeading: { fontFamilyId: context?.headingFontId, colorId: commonColors.heading, fontSize: "xl", fontWeight: 600, alignment: "start" },
    choice: { ...PLATFORM_RSVP_PRESENTATION_FALLBACK.choice, layout: "segmented", radius: "square", selected: { textColorId: commonColors.heading, borderColorId: commonColors.heading, emphasis: "bold" } },
    primaryAction: { ...PLATFORM_RSVP_PRESENTATION_FALLBACK.primaryAction, variant: "outline", radius: "square", textColorId: commonColors.heading, borderColorId: commonColors.heading, typography: { fontFamilyId: context?.bodyFontId, fontSize: "xs", fontWeight: 700, letterSpacing: "wide", textTransform: "uppercase" } },
    secondaryAction: { ...PLATFORM_RSVP_PRESENTATION_FALLBACK.secondaryAction, radius: "square", textColorId: commonColors.heading, borderColorId: commonColors.heading },
    layout: { ...PLATFORM_RSVP_PRESENTATION_FALLBACK.layout, guestPresentation: "rows" },
  };
  return PLATFORM_RSVP_PRESENTATION_FALLBACK;
}
