import { Select } from "../../../components/ui/Select";
import { Italic, Strikethrough, Underline } from "lucide-react";
import type { ResolvedDesignContext, TemplateDesignLibrary } from "../../websiteCapabilities/types";
import type { ProjectColor } from "../../websiteColors/projectColors";
import { SPACING_PRESETS } from "../../websiteElements/spacing";
import type { RuntimeTextAppearance } from "../../websitePresentation/runtimeTextAppearance";
import { TEXT_ALIGNMENTS, TEXT_EFFECT_STRENGTHS, TEXT_LETTER_SPACINGS, TEXT_LINE_HEIGHTS, TEXT_TRANSFORMS } from "../../websiteElements/textAppearanceContract";
import type { ChoiceAppearance } from "../../websitePresentation/choiceAppearance";
import type { ActionAppearance } from "../../websitePresentation/actionAppearance";
import { WEBSITE_BORDER_WIDTHS, WEBSITE_CONTROL_SIZES, WEBSITE_RADII } from "../../websitePresentation/tokens";
import type { RsvpRuntimeAppearance } from "../../websitePresentation/rsvpThemePresentation";
import type { ResolvedRsvpPresentation } from "../../websiteRenderer/rsvpPresentationResolution";
import type { ResponsiveViewport } from "../types";
import { FONT_SIZE_OPTIONS } from "./fontSizeOptions";
import { FontPicker } from "./FontPicker";
import { TextFormattingButton } from "./TextFormattingButton";
import { WebsiteColorSwatchControl } from "./WebsiteColorSwatchControl";
import { updateActionColor, updateChoiceColor, updateRuntimeTextColor, updateRuntimeTextEffect } from "../rsvpAppearanceUpdates";
import { textFontCapabilities } from "../../websiteElements/text";
import { friendlyFontWeightOptions } from "../../websiteElements/textAppearance";

type Props = {
  value: RsvpRuntimeAppearance;
  resolved: ResolvedRsvpPresentation;
  viewport: ResponsiveViewport;
  library: TemplateDesignLibrary;
  allowedFontIds: readonly string[];
  allowedColorIds: readonly string[];
  projectColors: readonly ProjectColor[];
  context?: ResolvedDesignContext | null;
  onAddColor: (value: string) => Promise<ProjectColor>;
  onChange: (value: RsvpRuntimeAppearance) => void;
};

const options = (values: readonly string[]) => values.map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }));
const compact = <T extends object>(value: T): T => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && (!(typeof item === "object" && item !== null) || Object.keys(item).length))) as T;

export function RsvpRuntimeAppearanceEditor(props: Props) {
  const setRole = <K extends keyof RsvpRuntimeAppearance>(role: K, value: RsvpRuntimeAppearance[K]) => props.onChange(compact({ ...props.value, [role]: value && Object.keys(value).length ? value : undefined }));
  return <div className="space-y-3 pb-6" data-rsvp-runtime-appearance-editor>
    <InspectorGroup title="Runtime text">
      <TextRole {...props} title="Status" id="status" authored={props.value.status ?? {}} resolved={props.resolved.statusHeading} onChange={(value) => setRole("status", value)} />
      <TextRole {...props} title="Guest names" id="guest-name" authored={props.value.guestName ?? {}} resolved={props.resolved.guestName} onChange={(value) => setRole("guestName", value)} />
      <TextRole {...props} title="Supporting text" id="supporting" authored={props.value.supporting ?? {}} resolved={props.resolved.supportingText} onChange={(value) => setRole("supporting", value)} />
    </InspectorGroup>
    <InspectorGroup title="Choices">
      <TextRole {...props} title="Response labels" id="response-label" authored={props.value.responseLabel ?? {}} resolved={props.resolved.responseLabel} onChange={(value) => setRole("responseLabel", value)} />
      <ChoiceEditor {...props} authored={props.value.choice ?? {}} resolved={props.resolved.choice} onChange={(value) => setRole("choice", value)} />
    </InspectorGroup>
    <InspectorGroup title="Actions">
      <ActionEditor {...props} authored={props.value.action ?? {}} resolved={props.resolved.primaryAction} onChange={(value) => setRole("action", value)} />
    </InspectorGroup>
  </div>;
}

function InspectorGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <details open className="rounded-lg border border-border px-3 py-2"><summary className="cursor-pointer text-sm font-semibold">{title}</summary><div className="mt-3 space-y-3">{children}</div></details>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-medium"><span className="mb-1 block">{label}</span>{children}</label>;
}

function ColorField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0"><span className="mb-1 block text-xs font-medium">{label}</span>{children}</div>;
}

function TextRole(props: Omit<Props, "resolved" | "onChange"> & { title: string; id: string; authored: RuntimeTextAppearance; resolved: RuntimeTextAppearance; onChange: (value: RuntimeTextAppearance) => void }) {
  const setGlobal = (key: keyof RuntimeTextAppearance, value: unknown) => props.onChange(compact({ ...props.authored, [key]: value || undefined }));
  const setColor = (key: "colorId" | "textShadowColorId" | "glowColorId", value?: string) => props.onChange(updateRuntimeTextColor(props.authored, key, value));
  const setEffect = (effect: "textShadow" | "glow", value: string) => props.onChange(updateRuntimeTextEffect(props.authored, effect, value as RuntimeTextAppearance["textShadow"]));
  const setResponsive = (key: "fontSize" | "alignment", value: string) => props.viewport === "desktop"
    ? setGlobal(key, value)
    : props.onChange(compact({ ...props.authored, responsive: compact({ ...props.authored.responsive, [props.viewport]: compact({ ...props.authored.responsive?.[props.viewport], [key]: value }) }) }));
  const responsive = props.viewport === "desktop" ? props.resolved : { ...props.resolved, ...props.authored.responsive?.[props.viewport] };
  const effectiveFontFamilyId = props.authored.fontFamilyId ?? props.resolved.fontFamilyId;
  const formatting = [
    { key: "italic" as const, label: "Italic", icon: <Italic size={16} />, disabled: !textFontCapabilities(effectiveFontFamilyId).italic },
    { key: "underline" as const, label: "Underline", icon: <Underline size={16} /> },
    { key: "strikethrough" as const, label: "Strikethrough", icon: <Strikethrough size={16} /> },
  ];
  return <details className="rounded-md bg-surface-muted/40 px-3 py-2"><summary className="cursor-pointer text-xs font-semibold">{props.title}</summary><div className="mt-3 space-y-3">
    <Field label="Font family"><FontPicker value={props.authored.fontFamilyId ?? props.resolved.fontFamilyId ?? ""} role="body" library={{ ...props.library, fontFamilies: props.library.fontFamilies.filter(({ id }) => props.allowedFontIds.includes(id)) }} onChange={(value) => setGlobal("fontFamilyId", value)} /></Field>
    <Field label="Font size"><Select aria-label={`${props.title} font size`} value={responsive.fontSize ?? "m"} options={FONT_SIZE_OPTIONS} onChange={(value) => setResponsive("fontSize", value)} /></Field>
    <Field label="Font weight"><Select aria-label={`${props.title} font weight`} value={String(props.authored.fontWeight ?? props.resolved.fontWeight ?? 400)} options={friendlyFontWeightOptions(effectiveFontFamilyId)} onChange={(value) => setGlobal("fontWeight", Number(value))} /></Field>
    <Field label="Line height"><Select aria-label={`${props.title} line height`} value={props.authored.lineHeight ?? props.resolved.lineHeight ?? "normal"} options={options(TEXT_LINE_HEIGHTS)} onChange={(value) => setGlobal("lineHeight", value)} /></Field>
    <Field label="Letter spacing"><Select aria-label={`${props.title} letter spacing`} value={props.authored.letterSpacing ?? props.resolved.letterSpacing ?? "normal"} options={options(TEXT_LETTER_SPACINGS)} onChange={(value) => setGlobal("letterSpacing", value)} /></Field>
    <Field label="Alignment"><Select aria-label={`${props.title} alignment`} value={responsive.alignment ?? "start"} options={options(TEXT_ALIGNMENTS)} onChange={(value) => setResponsive("alignment", value)} /></Field>
    <Field label="Case"><Select aria-label={`${props.title} case`} value={props.authored.textTransform ?? props.resolved.textTransform ?? "none"} options={options(TEXT_TRANSFORMS)} onChange={(value) => setGlobal("textTransform", value)} /></Field>
    <Field label="Formatting"><div className="flex flex-wrap gap-2">{formatting.map(({ key, label, icon, disabled }) => {
      const pressed = props.authored[key] ?? props.resolved[key] ?? false;
      return <TextFormattingButton key={key} label={`${props.title} ${label.toLowerCase()}`} pressed={pressed} disabled={disabled} onClick={() => setGlobal(key, pressed ? undefined : true)}>{icon}</TextFormattingButton>;
    })}</div></Field>
    <ColorField label="Text color"><WebsiteColorSwatchControl previewTarget={`rsvp:${props.id}:color`} label={`${props.title} text color`} colorId={props.authored.colorId} allowedTemplateColorIds={props.allowedColorIds} templateColors={props.library.colors} projectColors={props.projectColors} inheritLabel="Use Theme" onChange={(value) => setColor("colorId", value)} onAddColor={props.onAddColor} /></ColorField>
    <Field label="Text shadow"><Select aria-label={`${props.title} text shadow`} value={props.authored.textShadow ?? props.resolved.textShadow ?? "none"} options={options(TEXT_EFFECT_STRENGTHS)} onChange={(value) => setEffect("textShadow", value)} /></Field>
    {(props.authored.textShadow ?? props.resolved.textShadow ?? "none") !== "none" && <ColorField label="Shadow color"><WebsiteColorSwatchControl previewTarget={`rsvp:${props.id}:shadow-color`} label={`${props.title} shadow color`} colorId={props.authored.textShadowColorId} allowedTemplateColorIds={props.allowedColorIds} templateColors={props.library.colors} projectColors={props.projectColors} inheritLabel="Use Theme" onChange={(value) => setColor("textShadowColorId", value)} onAddColor={props.onAddColor} /></ColorField>}
    <Field label="Glow"><Select aria-label={`${props.title} glow`} value={props.authored.glow ?? props.resolved.glow ?? "none"} options={options(TEXT_EFFECT_STRENGTHS)} onChange={(value) => setEffect("glow", value)} /></Field>
    {(props.authored.glow ?? props.resolved.glow ?? "none") !== "none" && <ColorField label="Glow color"><WebsiteColorSwatchControl previewTarget={`rsvp:${props.id}:glow-color`} label={`${props.title} glow color`} colorId={props.authored.glowColorId} allowedTemplateColorIds={props.allowedColorIds} templateColors={props.library.colors} projectColors={props.projectColors} inheritLabel="Use Theme" onChange={(value) => setColor("glowColorId", value)} onAddColor={props.onAddColor} /></ColorField>}
  </div></details>;
}

function ChoiceEditor(props: Omit<Props, "resolved" | "onChange"> & { authored: ChoiceAppearance; resolved: ChoiceAppearance; onChange: (value: ChoiceAppearance) => void }) {
  const set = (key: keyof ChoiceAppearance, value: unknown) => props.onChange(compact({ ...props.authored, [key]: value || undefined }));
  const setResponsive = (key: "direction" | "size", value: string) => props.viewport === "desktop" ? set(key, value) : props.onChange(compact({ ...props.authored, responsive: compact({ ...props.authored.responsive, [props.viewport]: compact({ ...props.authored.responsive?.[props.viewport], [key]: value }) }) }));
  const stateColor = (state: "selected" | "unselected", key: "textColorId" | "backgroundColorId" | "borderColorId", value?: string) => props.onChange(updateChoiceColor(props.authored, state, key, value));
  return <div className="space-y-3">
    <Field label="Presentation"><Select aria-label="Choice presentation" value={props.authored.layout ?? props.resolved.layout ?? "cards"} options={options(["cards", "segmented"])} onChange={(value) => set("layout", value)} /></Field>
    <Field label="Direction"><Select aria-label="Choice direction" value={(props.viewport === "desktop" ? props.authored.direction : props.authored.responsive?.[props.viewport]?.direction) ?? props.resolved.direction ?? "row"} options={options(["row", "column"])} onChange={(value) => setResponsive("direction", value)} /></Field>
    <Field label="Size"><Select aria-label="Choice size" value={(props.viewport === "desktop" ? props.authored.size : props.authored.responsive?.[props.viewport]?.size) ?? props.resolved.size ?? "normal"} options={options(WEBSITE_CONTROL_SIZES)} onChange={(value) => setResponsive("size", value)} /></Field>
    <Field label="Gap"><Select aria-label="Choice gap" value={props.authored.gap ?? props.resolved.gap ?? "s"} options={options(SPACING_PRESETS)} onChange={(value) => set("gap", value)} /></Field>
    <Field label="Radius"><Select aria-label="Choice radius" value={props.authored.radius ?? props.resolved.radius ?? "soft"} options={options(WEBSITE_RADII)} onChange={(value) => set("radius", value)} /></Field>
    <Field label="Selected emphasis"><Select aria-label="Selected choice emphasis" value={props.authored.selected?.emphasis ?? props.resolved.selected?.emphasis ?? "semibold"} options={options(["normal", "semibold", "bold"])} onChange={(value) => props.onChange(compact({ ...props.authored, selected: compact({ ...props.authored.selected, emphasis: value as "normal" | "semibold" | "bold" }) }))} /></Field>
    <Field label="Disabled treatment"><Select aria-label="Choice disabled treatment" value={props.authored.disabled?.opacity ?? props.resolved.disabled?.opacity ?? "muted"} options={options(["soft", "muted"])} onChange={(value) => props.onChange(compact({ ...props.authored, disabled: { opacity: value as "soft" | "muted" } }))} /></Field>
    {(["selected", "unselected"] as const).map((state) => <div key={state} className="space-y-3 rounded-md border border-border/70 p-3">
      <h4 className="text-xs font-semibold">{state === "selected" ? "Selected" : "Unselected"}</h4>
      <Field label="Border width"><Select aria-label={`${state === "selected" ? "Selected" : "Unselected"} choice border width`} value={props.authored[state]?.borderWidth ?? props.resolved[state]?.borderWidth ?? "thin"} options={options(WEBSITE_BORDER_WIDTHS)} onChange={(value) => props.onChange(compact({ ...props.authored, [state]: compact({ ...props.authored[state], borderWidth: value }) }))} /></Field>
      {(["textColorId", "backgroundColorId", "borderColorId"] as const).map((key) => {
        const field = key === "textColorId" ? "Text color" : key === "backgroundColorId" ? "Background color" : "Border color";
        const accessibleLabel = `${state === "selected" ? "Selected" : "Unselected"} ${field.toLowerCase()}`;
        return <ColorField key={key} label={field}><WebsiteColorSwatchControl previewTarget={`rsvp:choice:${state}:${key === "textColorId" ? "text-color" : key === "backgroundColorId" ? "background-color" : "border-color"}`} label={accessibleLabel} colorId={props.authored[state]?.[key]} allowedTemplateColorIds={props.allowedColorIds} templateColors={props.library.colors} projectColors={props.projectColors} inheritLabel="Use Theme" onChange={(value) => stateColor(state, key, value)} onAddColor={props.onAddColor} /></ColorField>;
      })}
    </div>)}
  </div>;
}

function ActionEditor(props: Omit<Props, "resolved" | "onChange"> & { authored: ActionAppearance; resolved: ActionAppearance; onChange: (value: ActionAppearance) => void }) {
  const set = (key: keyof ActionAppearance, value: unknown) => props.onChange(compact({ ...props.authored, [key]: value || undefined }));
  const setResponsive = (key: "size" | "width" | "alignment", value: string) => props.viewport === "desktop" ? set(key, value) : props.onChange(compact({ ...props.authored, responsive: compact({ ...props.authored.responsive, [props.viewport]: compact({ ...props.authored.responsive?.[props.viewport], [key]: value }) }) }));
  const setColor = (key: "textColorId" | "backgroundColorId" | "borderColorId", value?: string) => props.onChange(updateActionColor(props.authored, key, value));
  return <div className="space-y-3">
    <TextRole {...props} title="Action typography" id="action-typography" authored={props.authored.typography ?? {}} resolved={props.resolved.typography ?? {}} onChange={(typography) => set("typography", typography)} />
    <Field label="Variant"><Select aria-label="Action variant" value={props.authored.variant ?? props.resolved.variant ?? "filled"} options={options(["filled", "outline", "minimal"])} onChange={(value) => set("variant", value)} /></Field>
    <Field label="Size"><Select aria-label="Action size" value={(props.viewport === "desktop" ? props.authored.size : props.authored.responsive?.[props.viewport]?.size) ?? props.resolved.size ?? "normal"} options={options(WEBSITE_CONTROL_SIZES)} onChange={(value) => setResponsive("size", value)} /></Field>
    <Field label="Width"><Select aria-label="Action width" value={(props.viewport === "desktop" ? props.authored.width : props.authored.responsive?.[props.viewport]?.width) ?? props.resolved.width ?? "intrinsic"} options={options(["intrinsic", "full"])} onChange={(value) => setResponsive("width", value)} /></Field>
    <Field label="Alignment"><Select aria-label="Action alignment" value={(props.viewport === "desktop" ? props.authored.alignment : props.authored.responsive?.[props.viewport]?.alignment) ?? props.resolved.alignment ?? "center"} options={options(TEXT_ALIGNMENTS)} onChange={(value) => setResponsive("alignment", value)} /></Field>
    <Field label="Radius"><Select aria-label="Action radius" value={props.authored.radius ?? props.resolved.radius ?? "soft"} options={options(WEBSITE_RADII)} onChange={(value) => set("radius", value)} /></Field>
    <Field label="Border width"><Select aria-label="Action border width" value={props.authored.borderWidth ?? props.resolved.borderWidth ?? "thin"} options={options(WEBSITE_BORDER_WIDTHS)} onChange={(value) => set("borderWidth", value)} /></Field>
    <Field label="Horizontal padding"><Select aria-label="Action horizontal padding" value={props.authored.paddingX ?? props.resolved.paddingX ?? "l"} options={options(SPACING_PRESETS)} onChange={(value) => set("paddingX", value)} /></Field>
    <Field label="Vertical padding"><Select aria-label="Action vertical padding" value={props.authored.paddingY ?? props.resolved.paddingY ?? "s"} options={options(SPACING_PRESETS)} onChange={(value) => set("paddingY", value)} /></Field>
    <div className="space-y-3 rounded-md border border-border/70 p-3">
      <h4 className="text-xs font-semibold">Colors</h4>
      {(["textColorId", "backgroundColorId", "borderColorId"] as const).map((key) => {
        const field = key === "textColorId" ? "Text color" : key === "backgroundColorId" ? "Background color" : "Border color";
        return <ColorField key={key} label={field}><WebsiteColorSwatchControl previewTarget={`rsvp:action:${key === "textColorId" ? "text-color" : key === "backgroundColorId" ? "background-color" : "border-color"}`} label={`Action ${field.toLowerCase()}`} colorId={props.authored[key]} allowedTemplateColorIds={props.allowedColorIds} templateColors={props.library.colors} projectColors={props.projectColors} inheritLabel="Use Theme" onChange={(value) => setColor(key, value)} onAddColor={props.onAddColor} /></ColorField>;
      })}
    </div>
  </div>;
}
