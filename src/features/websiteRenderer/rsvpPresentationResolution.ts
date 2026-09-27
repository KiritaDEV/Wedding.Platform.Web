import type { ResolvedDesignContext, TemplateDesignLibrary } from "../websiteCapabilities/types";
import type { ProjectColor } from "../websiteColors/projectColors";
import type { ResponsiveViewport } from "../websiteEditor/types";
import { resolveActionAppearance } from "../websitePresentation/actionAppearance";
import { resolveChoiceAppearance } from "../websitePresentation/choiceAppearance";
import { resolveRuntimeTextAppearance } from "../websitePresentation/runtimeTextAppearance";
import { PLATFORM_RSVP_PRESENTATION_FALLBACK, rsvpThemePresentation, type RsvpThemePresentation } from "../websitePresentation/rsvpThemePresentation";
import type { RsvpRuntimeAppearance } from "../websitePresentation/rsvpThemePresentation";

export type ResolvedRsvpPresentation = RsvpThemePresentation;
export type RsvpPresentationEnvironment = {
  templateKey?: string;
  viewport?: ResponsiveViewport;
  library?: TemplateDesignLibrary;
  projectColors?: readonly ProjectColor[];
  context?: ResolvedDesignContext | null;
  authored?: RsvpRuntimeAppearance;
};

export function resolveRsvpPresentation(environment: RsvpPresentationEnvironment): ResolvedRsvpPresentation {
  const viewport = environment.viewport ?? "desktop";
  const theme = rsvpThemePresentation(environment.templateKey ?? "", environment.context, environment.library);
  return {
    guestName: resolveRuntimeTextAppearance({ fallback: PLATFORM_RSVP_PRESENTATION_FALLBACK.guestName, theme: theme.guestName, shared: environment.authored?.guestName }, viewport, { minimumFontSize: "s" }),
    responseLabel: resolveRuntimeTextAppearance({ fallback: PLATFORM_RSVP_PRESENTATION_FALLBACK.responseLabel, theme: theme.responseLabel, shared: environment.authored?.responseLabel }, viewport, { minimumFontSize: "s" }),
    supportingText: resolveRuntimeTextAppearance({ fallback: PLATFORM_RSVP_PRESENTATION_FALLBACK.supportingText, theme: theme.supportingText, shared: environment.authored?.supporting }, viewport, { minimumFontSize: "s" }),
    statusHeading: resolveRuntimeTextAppearance({ fallback: PLATFORM_RSVP_PRESENTATION_FALLBACK.statusHeading, theme: theme.statusHeading, shared: environment.authored?.status }, viewport, { minimumFontSize: "m" }),
    choice: resolveChoiceAppearance({ fallback: PLATFORM_RSVP_PRESENTATION_FALLBACK.choice, theme: theme.choice, shared: environment.authored?.choice }, viewport),
    primaryAction: resolveActionAppearance({ fallback: PLATFORM_RSVP_PRESENTATION_FALLBACK.primaryAction, theme: theme.primaryAction, shared: environment.authored?.action }, viewport),
    secondaryAction: resolveActionAppearance({ fallback: PLATFORM_RSVP_PRESENTATION_FALLBACK.secondaryAction, theme: theme.secondaryAction, shared: environment.authored?.action }, viewport),
    layout: theme.layout,
  };
}

export function rsvpSubmitLabel(editingExisting: boolean): "Submit RSVP" | "Save changes" {
  return editingExisting ? "Save changes" : "Submit RSVP";
}
