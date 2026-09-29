import { Check } from "lucide-react";
import type { CSSProperties, ElementType, FormEvent, ReactNode } from "react";
import { resolveWebsiteColor } from "../websiteColors/projectColors";
import { SPACING_PRESET_CSS } from "../websiteElements/spacing";
import { resolveTextEffects } from "../websiteElements/textEffects";
import type { ActionAppearance } from "../websitePresentation/actionAppearance";
import type { ChoiceAppearance } from "../websitePresentation/choiceAppearance";
import { resolveRuntimeTextResources, type RuntimeTextAppearance } from "../websitePresentation/runtimeTextAppearance";
import { WEBSITE_BORDER_WIDTH_CSS, WEBSITE_RADIUS_CSS } from "../websitePresentation/tokens";
import type { PrivateInvitationRuntime } from "../privateEventSite/api";
import type { RsvpDraft } from "../privateEventSite/rsvpForm";
import { elementFontSizes, elementLetterSpacings, elementLineHeights } from "./elementTypography";
import { rsvpSubmitLabel, type ResolvedRsvpPresentation, type RsvpPresentationEnvironment } from "./rsvpPresentationResolution";
import { scopedColorPreviewTarget, useEditorColorPreview } from "../websiteEditor/colorPreview";

type RsvpProjection = NonNullable<PrivateInvitationRuntime["rsvp"]>;

export function RsvpFormPresentation({ rsvp, presentation, environment, draft, editingExisting, confirmation, message, submitting, accessPanel, onChoice, onSubmit, onEdit }: {
  rsvp: RsvpProjection;
  presentation: ResolvedRsvpPresentation;
  environment: RsvpPresentationEnvironment;
  draft: RsvpDraft;
  editingExisting: boolean;
  confirmation: "received" | "updated" | null;
  message: string | null;
  submitting: boolean;
  accessPanel?: ReactNode;
  onChoice: (guestId: string, response: "attending" | "declined") => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEdit: () => void;
}) {
  const editable = rsvp.availability === "open";
  const showEditing = editable && (rsvp.status !== "complete" || editingExisting);
  const complete = rsvp.guests.every((guest) => draft[guest.id] !== null);
  const changed = rsvp.guests.some((guest) => draft[guest.id] !== guest.response);
  const availability = {
    open: "RSVP responses are open.",
    event_closed: "RSVP responses are closed. Your current responses are shown below.",
    deadline_passed: "The RSVP deadline has passed. Your current responses are read-only.",
    invitation_inactive: "This invitation is inactive. Your current responses are read-only.",
  }[rsvp.availability];
  const width = { narrow: "32rem", medium: "36rem", wide: "48rem", full: "100%" }[presentation.layout.width];
  const mobile = environment.viewport === "mobile";

  return <div className="mx-auto mt-8 min-w-0 w-full max-w-full" style={{ maxWidth: width, textAlign: presentation.layout.alignment }} data-private-rsvp-state="trusted" data-rsvp-shared-presentation>
    {accessPanel}
    {confirmation && <RuntimeText as="p" kind="statusHeading" appearance={presentation.statusHeading} environment={environment} className="mb-5" role="status">{confirmation === "received" ? "RSVP received" : "RSVP updated"}</RuntimeText>}
    <RuntimeText as="strong" kind="statusHeading" appearance={presentation.statusHeading} environment={environment} className="block min-w-0 max-w-full whitespace-normal [overflow-wrap:anywhere]">{statusLabel(rsvp.status)}</RuntimeText>
    {rsvp.guests.length === 0 ? <RuntimeText as="p" kind="supportingText" appearance={presentation.supportingText} environment={environment} className="mt-5">No active Guests are available for RSVP.</RuntimeText>
      : showEditing ? <form className="mt-5" aria-busy={submitting || undefined} onSubmit={onSubmit}>
        <div style={{ display: "grid", gap: SPACING_PRESET_CSS[presentation.layout.guestGap] }}>
          {rsvp.guests.map((guest) => <fieldset key={guest.id} className="min-w-0 max-w-full border border-current/15" style={{ borderRadius: WEBSITE_RADIUS_CSS[presentation.choice.radius ?? "soft"], padding: SPACING_PRESET_CSS[presentation.layout.guestPadding] }}>
            <RuntimeText as="legend" kind="guestName" appearance={presentation.guestName} environment={environment} className="max-w-full whitespace-normal [overflow-wrap:anywhere] px-1">{guest.name}</RuntimeText>
            <ChoiceGroup appearance={presentation.choice} labelAppearance={presentation.responseLabel} environment={environment} name={`rsvp-${guest.id}`} value={draft[guest.id]} disabled={submitting} onChange={(response) => onChoice(guest.id, response)} />
          </fieldset>)}
        </div>
        {!complete && <RuntimeText as="p" kind="supportingText" appearance={presentation.supportingText} environment={environment} className="mt-4">Choose Attending or Declined for every Guest.</RuntimeText>}
        {message && <RuntimeText as="p" kind="supportingText" appearance={presentation.supportingText} environment={environment} className="mt-3" style={{ color: "#b91c1c" }} role="alert">{message}</RuntimeText>}
        <WebsiteAction appearance={presentation.primaryAction} environment={environment} className="mt-5" type="submit" disabled={submitting || !complete || !changed} aria-busy={submitting || undefined}>{submitting ? "Saving…" : rsvpSubmitLabel(editingExisting)}</WebsiteAction>
      </form> : <>
        <ul className="mt-5 min-w-0 max-w-full divide-y divide-current/15">{rsvp.guests.map((guest) => <li key={guest.id} data-rsvp-summary-guest className={`flex min-w-0 max-w-full gap-x-4 gap-y-1 py-3 ${mobile ? "flex-col items-start" : "flex-wrap items-baseline justify-between"}`}>
          <RuntimeText as="span" kind="guestName" appearance={presentation.guestName} environment={environment} className="min-w-0 whitespace-normal [overflow-wrap:anywhere]">{guest.name}</RuntimeText>
          <RuntimeText as="span" kind="responseLabel" appearance={presentation.responseLabel} environment={environment}>{responseLabel(guest.response)}</RuntimeText>
        </li>)}</ul>
        {rsvp.lastUpdated && <RuntimeText as="p" kind="supportingText" appearance={presentation.supportingText} environment={environment} className="mt-4">RSVP last updated {new Date(rsvp.lastUpdated).toLocaleString()}</RuntimeText>}
        <RuntimeText as="p" kind="supportingText" appearance={presentation.supportingText} environment={environment} className="mt-4">{availability}</RuntimeText>
        {message && <RuntimeText as="p" kind="supportingText" appearance={presentation.supportingText} environment={environment} className="mt-3" style={{ color: "#b91c1c" }} role="alert">{message}</RuntimeText>}
        {editable && <WebsiteAction appearance={presentation.primaryAction} environment={environment} className="mt-5" type="button" onClick={onEdit}>Update RSVP</WebsiteAction>}
      </>}
  </div>;
}

export function ChoiceGroup({ appearance, labelAppearance, environment, name, value, disabled, onChange }: { appearance: ChoiceAppearance; labelAppearance: RuntimeTextAppearance; environment: RsvpPresentationEnvironment; name: string; value: "attending" | "declined" | null; disabled?: boolean; onChange: (response: "attending" | "declined") => void }) {
  const direction = appearance.direction ?? "row";
  const choicePadding = { compact: ["0.5rem", "0.75rem"], normal: ["0.5rem", "0.75rem"], large: ["0.75rem", "1rem"] }[appearance.size ?? "normal"];
  const selectedPreview = useChoiceColorPreview(environment, "selected");
  const unselectedPreview = useChoiceColorPreview(environment, "unselected");
  return <div className="mt-3 min-w-0 max-w-full" data-rsvp-choice-layout={appearance.layout ?? "cards"} style={{ display: "flex", flexDirection: direction, gap: SPACING_PRESET_CSS[appearance.gap ?? "s"] }}>
    {(["attending", "declined"] as const).map((response) => {
      const selected = value === response;
      const state = selected ? appearance.selected : appearance.unselected;
      const colors = resolveChoiceColors(state, environment, selected ? selectedPreview : unselectedPreview);
      const emphasis = selected ? ({ normal: 400, semibold: 600, bold: 700 } as const)[appearance.selected?.emphasis ?? "semibold"] : undefined;
      return <label key={response} className="relative flex min-h-11 min-w-0 max-w-full flex-1 cursor-pointer items-center justify-center gap-2 whitespace-normal outline-none [overflow-wrap:anywhere] focus-within:ring-2 focus-within:ring-current focus-within:ring-offset-2 disabled:cursor-not-allowed" style={{ ...colors, width: direction === "column" ? "100%" : undefined, paddingBlock: choicePadding[0], paddingInline: choicePadding[1], borderStyle: "solid", borderWidth: WEBSITE_BORDER_WIDTH_CSS[appearance.borderWidth ?? "thin"], borderRadius: WEBSITE_RADIUS_CSS[appearance.radius ?? "soft"], opacity: disabled ? appearance.disabled?.opacity === "soft" ? .7 : .5 : 1 }} data-rsvp-choice={response} data-selected={selected || undefined}>
        <input className="sr-only" type="radio" name={name} value={response} checked={selected} disabled={disabled} onChange={() => onChange(response)} />
        <span className="grid size-4 shrink-0 place-items-center rounded-full border border-current" aria-hidden="true">{selected && <Check size={12} strokeWidth={3} />}</span>
        <RuntimeText as="span" kind="responseLabel" appearance={{ ...labelAppearance, fontWeight: emphasis ?? labelAppearance.fontWeight }} environment={environment}>{response === "attending" ? "Attending" : "Declined"}</RuntimeText>
      </label>;
    })}
  </div>;
}

export function WebsiteAction({ appearance, environment, className = "", danger = false, ...props }: { appearance: ActionAppearance; environment: RsvpPresentationEnvironment; className?: string; danger?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const textPreview = useRsvpColorPreview(environment, "rsvp:action:text-color");
  const backgroundPreview = useRsvpColorPreview(environment, "rsvp:action:background-color");
  const borderPreview = useRsvpColorPreview(environment, "rsvp:action:border-color");
  const typographyPreview = useRuntimeTextColorPreview(environment, "action-typography");
  const colors = resolveActionColors(appearance, environment, { color: textPreview, backgroundColor: backgroundPreview, borderColor: borderPreview });
  const padding = actionPadding(appearance);
  return <div className={`flex min-w-0 max-w-full ${className}`} style={{ width: appearance.width === "full" ? "100%" : undefined, justifyContent: { start: "flex-start", center: "center", end: "flex-end" }[appearance.alignment ?? "center"] }}>
    <button {...props} data-rsvp-action className={`inline-flex min-h-11 max-w-full items-center justify-center whitespace-normal outline-none [overflow-wrap:anywhere] focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${appearance.width === "full" ? "w-full" : "w-auto"} ${danger ? "brightness-90" : ""}`} style={{ ...runtimeTextStyle(appearance.typography ?? {}, environment, typographyPreview), ...colors, ...padding, borderStyle: "solid", borderWidth: WEBSITE_BORDER_WIDTH_CSS[appearance.borderWidth ?? "thin"], borderRadius: WEBSITE_RADIUS_CSS[appearance.radius ?? "soft"] }} />
  </div>;
}

export function RuntimeText({ as: Component = "span", appearance, environment, kind, className, style, ...props }: { as?: ElementType; appearance: RuntimeTextAppearance; environment: RsvpPresentationEnvironment; kind: "guestName" | "responseLabel" | "supportingText" | "statusHeading"; className?: string; style?: CSSProperties; [key: string]: unknown }) {
  const previewId = { guestName: "guest-name", responseLabel: "response-label", supportingText: "supporting", statusHeading: "status" }[kind];
  const preview = useRuntimeTextColorPreview(environment, previewId);
  return <Component {...props} data-rsvp-text={kind} className={className} style={{ ...runtimeTextStyle(appearance, environment, preview), ...style }} />;
}

function runtimeTextStyle(appearance: RuntimeTextAppearance, environment: RsvpPresentationEnvironment, preview: { color?: string; shadow?: string; glow?: string } = {}): CSSProperties {
  const library = environment.library;
  const resources = library ? resolveRuntimeTextResources(appearance, { templateKey: environment.templateKey ?? "", library, projectColors: environment.projectColors, context: environment.context }) : { fontFamily: "inherit", color: "inherit", supportsItalic: true, supportedWeights: [400, 600, 700] };
  const decorations = [appearance.underline && "underline", appearance.strikethrough && "line-through"].filter(Boolean).join(" ") || undefined;
  const textShadow = library ? resolveTextEffects(appearance.textShadow, preview.shadow ?? resolveWebsiteColor(appearance.textShadowColorId, library, environment.projectColors ?? []), appearance.glow, preview.glow ?? resolveWebsiteColor(appearance.glowColorId, library, environment.projectColors ?? [])) : undefined;
  return { fontFamily: resources.fontFamily, color: preview.color ?? resources.color, fontSize: elementFontSizes[appearance.fontSize ?? "m"], fontWeight: appearance.fontWeight ?? 400, fontStyle: appearance.italic && resources.supportsItalic ? "italic" : undefined, lineHeight: elementLineHeights[appearance.lineHeight ?? "normal"], letterSpacing: elementLetterSpacings[appearance.letterSpacing ?? "normal"], textAlign: appearance.alignment, textDecorationLine: decorations, textTransform: appearance.textTransform === "none" ? undefined : appearance.textTransform, textShadow };
}

function resolveChoiceColors(state: ChoiceAppearance["selected"], environment: RsvpPresentationEnvironment, preview: CSSProperties = {}): CSSProperties {
  if (!environment.library) return {};
  const project = environment.projectColors ?? [];
  return { color: preview.color ?? resolveWebsiteColor(state?.textColorId, environment.library, project), backgroundColor: preview.backgroundColor ?? resolveWebsiteColor(state?.backgroundColorId, environment.library, project), borderColor: preview.borderColor ?? resolveWebsiteColor(state?.borderColorId, environment.library, project) ?? "currentColor" };
}

function resolveActionColors(appearance: ActionAppearance, environment: RsvpPresentationEnvironment, preview: CSSProperties = {}): CSSProperties {
  if (!environment.library) return {};
  const project = environment.projectColors ?? [];
  const textColor = resolveWebsiteColor(appearance.textColorId, environment.library, project);
  const background = resolveWebsiteColor(appearance.backgroundColorId, environment.library, project);
  const border = resolveWebsiteColor(appearance.borderColorId, environment.library, project);
  return { color: preview.color ?? textColor, backgroundColor: appearance.variant === "filled" ? preview.backgroundColor ?? background : "transparent", borderColor: appearance.variant === "minimal" ? "transparent" : preview.borderColor ?? border ?? preview.color ?? textColor ?? "currentColor" };
}

function useRsvpColorPreview(environment: RsvpPresentationEnvironment, target: string) {
  return useEditorColorPreview(scopedColorPreviewTarget(environment.sectionId ?? "", target), environment.editor === true);
}

function useRuntimeTextColorPreview(environment: RsvpPresentationEnvironment, id: string) {
  return {
    color: useRsvpColorPreview(environment, `rsvp:${id}:color`),
    shadow: useRsvpColorPreview(environment, `rsvp:${id}:shadow-color`),
    glow: useRsvpColorPreview(environment, `rsvp:${id}:glow-color`),
  };
}

function useChoiceColorPreview(environment: RsvpPresentationEnvironment, state: "selected" | "unselected"): CSSProperties {
  return {
    color: useRsvpColorPreview(environment, `rsvp:choice:${state}:text-color`),
    backgroundColor: useRsvpColorPreview(environment, `rsvp:choice:${state}:background-color`),
    borderColor: useRsvpColorPreview(environment, `rsvp:choice:${state}:border-color`),
  };
}

function actionPadding(appearance: ActionAppearance): CSSProperties {
  const defaults = { compact: ["xs", "m"], normal: ["s", "l"], large: ["m", "xl"] } as const;
  const [vertical, horizontal] = defaults[appearance.size ?? "normal"];
  return { paddingBlock: SPACING_PRESET_CSS[appearance.paddingY ?? vertical], paddingInline: SPACING_PRESET_CSS[appearance.paddingX ?? horizontal] };
}

function statusLabel(status: RsvpProjection["status"]): string {
  return { pending: "Pending", partial: "Partial", complete: "Complete" }[status];
}

function responseLabel(response: RsvpProjection["guests"][number]["response"]): string {
  return response === "attending" ? "Attending" : response === "declined" ? "Declined" : "Pending";
}
