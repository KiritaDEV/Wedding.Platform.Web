import { Italic, Underline, Strikethrough } from "lucide-react";
import { TextFormattingButton } from "./TextFormattingButton";
import { ElementEffectsControl } from "./ElementEffectsControl";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { Switch } from "../../../components/ui/Switch";
import type { CountdownElement } from "../../websiteElements/types";
import { COUNTDOWN_DEFAULT_LABELS, COUNTDOWN_UNITS } from "../../websiteElements/countdown";
import { utcToZonedLocal, zonedLocalToUtc } from "../../websiteElements/zonedDateTime";
import { InspectorSection } from "./InspectorPrimitives";
import type { TemplateDesignLibrary, ResolvedDesignContext } from "../../websiteCapabilities/types";
import type { ProjectColor } from "../../websiteColors/projectColors";
import type { ResponsiveViewport } from "../types";
import type { CanonicalRuntimeTextAppearance } from "../../websiteElements/textAppearanceContract";
import type { TextFontWeight } from "../../websiteElements/textAppearanceContract";
import { curatedTextColors, friendlyFontWeightOptions } from "../../websiteElements/textAppearance";
import { FONT_SIZE_OPTIONS } from "./fontSizeOptions";
import { WebsiteColorSwatchControl } from "./WebsiteColorSwatchControl";
import { FontPicker } from "./FontPicker";
import { changeTextFontFamily, resolveTextResponsiveAppearance, selectTextResponsiveProperty, setTextFontWeight, setTextEffect, textFontCapabilities, toggleTextItalic } from "../../websiteElements/text";
import { useState } from "react";

type Props = { onAddColor: (value: string) => Promise<ProjectColor>; element: CountdownElement; eventTimeZone?: string | null; viewport: ResponsiveViewport; library: TemplateDesignLibrary; allowedFontIds: readonly string[]; allowedColorIds: readonly string[]; projectColors: readonly ProjectColor[]; context?: ResolvedDesignContext | null; onChange: (element: CountdownElement) => void };
export function CountdownElementEditor({ element, eventTimeZone, viewport, library, allowedFontIds, allowedColorIds, projectColors, context, onAddColor, onChange }: Props) {
  const [targetError, setTargetError] = useState<string | null>(null);
  const custom = element.target.source === "custom" ? utcToZonedLocal(element.target.instant, element.target.timeZone) : null;
  const customTarget = element.target.source === "custom" ? element.target : null;
  const updateTarget = (date: string, time: string, timeZone: string) => {
    const instant = zonedLocalToUtc(date, time, timeZone);
    if (!instant) { setTargetError("That local date and time does not exist in the selected time zone."); return; }
    setTargetError(null);
    onChange({ ...element, target: { source: "custom", instant, timeZone } });
  };
  const timeZones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [eventTimeZone || "UTC"];
  const visibleUnitCount = COUNTDOWN_UNITS.filter((unit) => element.units?.[unit] !== false).length;
  const layoutAppearance = viewport === "desktop" ? element.appearance : { ...element.appearance, ...element.appearance?.responsive?.[viewport] };
  const setLayout = (key: "direction" | "alignment" | "gap", value: string, defaultValue: string) => {
    const appearance = { ...element.appearance };
    if (viewport === "desktop") {
      if (value === defaultValue) delete appearance[key]; else Object.assign(appearance, { [key]: value });
    } else {
      const responsive = { ...appearance.responsive };
      const branch = { ...responsive[viewport] };
      if (value === (appearance[key] ?? defaultValue)) delete branch[key]; else Object.assign(branch, { [key]: value });
      if (Object.keys(branch).length) responsive[viewport] = branch; else delete responsive[viewport];
      if (Object.keys(responsive).length) appearance.responsive = responsive; else delete appearance.responsive;
    }
    onChange({ ...element, appearance });
  };
  return <div className="space-y-5 pt-5" data-countdown-element-editor>
    <InspectorSection title="Countdown target">
      <Field label="Source"><Select value={element.target.source} options={[{ value: "event", label: "Event date and time" }, { value: "custom", label: "Custom date and time" }]} onChange={(source) => source === "event" ? onChange({ ...element, target: { source: "event" } }) : onChange({ ...element, target: { source: "custom", instant: new Date(Date.now() + 86_400_000).toISOString().replace(".000Z", "Z"), timeZone: eventTimeZone || "UTC" } })} /></Field>
      {customTarget && custom && <><Field label="Date"><Input type="date" value={custom.date} onChange={(event) => updateTarget(event.target.value, custom.time, customTarget.timeZone)} /></Field><Field label="Time"><Input type="time" value={custom.time} onChange={(event) => updateTarget(custom.date, event.target.value, customTarget.timeZone)} /></Field><Field label="Time zone"><Select value={customTarget.timeZone} options={timeZones.map((value) => ({ value, label: value }))} onChange={(zone) => updateTarget(custom.date, custom.time, zone)} /></Field></>}
      {targetError && <p role="alert" className="text-xs text-danger">{targetError}</p>}
    </InspectorSection>
    <InspectorSection title="Visible units">
      {COUNTDOWN_UNITS.map((unit) => {
        const checked = element.units?.[unit] !== false;
        const label = COUNTDOWN_DEFAULT_LABELS[unit];
        return <div key={unit} className="flex items-center justify-between gap-3 text-sm"><span>{label}</span><Switch aria-label={label} checked={checked} disabled={checked && visibleUnitCount === 1} onCheckedChange={(nextChecked) => { const units = { ...element.units }; if (nextChecked) delete units[unit]; else units[unit] = false; if (COUNTDOWN_UNITS.some((candidate) => units[candidate] !== false)) onChange({ ...element, ...(Object.keys(units).length ? { units } : { units: undefined }) }); }} /></div>;
      })}
    </InspectorSection>
    <InspectorSection title="Labels">
      {COUNTDOWN_UNITS.map((unit) => <Field key={unit} label={COUNTDOWN_DEFAULT_LABELS[unit]}><Input maxLength={40} placeholder={COUNTDOWN_DEFAULT_LABELS[unit]} value={element.labels?.[unit] ?? ""} onChange={(event) => { const value = event.target.value.trimStart().slice(0, 40); const labels = { ...element.labels }; if (value) labels[unit] = value; else delete labels[unit]; onChange({ ...element, ...(Object.keys(labels).length ? { labels } : { labels: undefined }) }); }} /></Field>)}
    </InspectorSection>
    <TypographyRole elementId={element.id} projectColors={projectColors} onAddColor={onAddColor} title="Numbers" value={element.appearance?.numbers} semanticSize="4xl" semanticWeight={700} viewport={viewport} library={library} allowedFontIds={allowedFontIds} colorIds={[...allowedColorIds, ...projectColors.map(({ id }) => id)]} context={context} onChange={(numbers) => onChange({ ...element, appearance: { ...element.appearance, ...(Object.keys(numbers).length ? { numbers } : { numbers: undefined }) } })} />
    <TypographyRole elementId={element.id} projectColors={projectColors} onAddColor={onAddColor} title="Labels" value={element.appearance?.labels} semanticSize="s" semanticWeight={400} viewport={viewport} library={library} allowedFontIds={allowedFontIds} colorIds={[...allowedColorIds, ...projectColors.map(({ id }) => id)]} context={context} onChange={(labels) => onChange({ ...element, appearance: { ...element.appearance, ...(Object.keys(labels).length ? { labels } : { labels: undefined }) } })} />
    <InspectorSection title="Countdown layout">
      <Field label="Direction"><Select value={layoutAppearance?.direction ?? "horizontal"} options={[{ value: "horizontal", label: "Horizontal" }, { value: "vertical", label: "Vertical" }]} onChange={(value) => setLayout("direction", value, "horizontal")} /></Field>
      <Field label="Alignment"><Select value={layoutAppearance?.alignment ?? "center"} options={["start", "center", "end"].map((value) => ({ value, label: title(value) }))} onChange={(value) => setLayout("alignment", value, "center")} /></Field>
      <Field label="Gap"><Select value={layoutAppearance?.gap ?? "m"} options={["xs", "s", "m", "l", "xl"].map((value) => ({ value, label: value.toUpperCase() }))} onChange={(value) => setLayout("gap", value, "m")} /></Field>
    </InspectorSection>
  </div>;
}
const title = (value: string) => value[0].toUpperCase() + value.slice(1);
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5 text-xs font-medium"><div>{label}</div>{children}</div>; }

function TypographyRole({ elementId, projectColors, onAddColor, title: heading, value = {}, semanticSize, semanticWeight, viewport, library, allowedFontIds, colorIds, context, onChange }: { elementId: string; projectColors: readonly ProjectColor[]; onAddColor: (value: string) => Promise<ProjectColor>; title: string; value?: CanonicalRuntimeTextAppearance; semanticSize: CanonicalRuntimeTextAppearance["fontSize"]; semanticWeight: number; viewport: ResponsiveViewport; library: TemplateDesignLibrary; allowedFontIds: readonly string[]; colorIds: readonly string[]; context?: ResolvedDesignContext | null; onChange: (value: CanonicalRuntimeTextAppearance) => void }) {
  const effective = resolveTextResponsiveAppearance(value, viewport, { fontSize: semanticSize ?? "m", alignment: "center" });
  const set = (key: keyof CanonicalRuntimeTextAppearance, nextValue: unknown, defaultValue?: unknown) => { const next = { ...value }; if (nextValue === undefined || nextValue === defaultValue || nextValue === false) delete next[key]; else Object.assign(next, { [key]: nextValue }); onChange(next); };
  const responsive = (key: "fontSize" | "alignment", nextValue: string) => onChange(selectTextResponsiveProperty(value, viewport, key, nextValue as never, { fontSize: semanticSize ?? "m", alignment: "center" }));
  const colors = curatedTextColors(library, colorIds, context, value.colorId);
  const fontId = value.fontFamilyId ?? context?.bodyFontId;
  const setWeight = (weight: TextFontWeight) => {
    const next = setTextFontWeight(value, fontId, weight);
    if (weight === semanticWeight) delete next.fontWeight;
    else next.fontWeight = weight;
    onChange(next);
  };
  return <InspectorSection title={heading}>
    <Field label="Font family"><FontPicker value={value.fontFamilyId ?? ""} role="body" library={{ ...library, fontFamilies: library.fontFamilies.filter(({ id }) => allowedFontIds.includes(id)) }} onChange={(fontFamilyId) => onChange(changeTextFontFamily(value, fontFamilyId || undefined, context?.bodyFontId))} /></Field>
    <Field label="Font weight"><Select aria-label={`${heading} font weight`} value={String(value.fontWeight ?? semanticWeight)} options={friendlyFontWeightOptions(fontId)} onChange={(weight) => setWeight(Number(weight) as TextFontWeight)} /></Field>
    <Field label="Font size"><Select value={effective.fontSize} options={FONT_SIZE_OPTIONS} onChange={(fontSize) => responsive("fontSize", fontSize)} /></Field>
    <Field label="Line height"><Select value={value.lineHeight ?? "normal"} options={["tight", "normal", "relaxed"].map((item) => ({ value: item, label: title(item) }))} onChange={(lineHeight) => set("lineHeight", lineHeight, "normal")} /></Field>
    <Field label="Letter spacing"><Select value={value.letterSpacing ?? "normal"} options={["tight", "normal", "wide"].map((item) => ({ value: item, label: title(item) }))} onChange={(letterSpacing) => set("letterSpacing", letterSpacing, "normal")} /></Field>
    <Field label="Alignment"><Select value={effective.alignment} options={["start", "center", "end"].map((item) => ({ value: item, label: title(item) }))} onChange={(alignment) => responsive("alignment", alignment)} /></Field>
    <Field label="Color"><WebsiteColorSwatchControl key={`${elementId}:${heading}`} previewTarget={`${elementId}:${heading.toLowerCase()}:color`} label={`${heading} color`} colorId={value.colorId} allowedTemplateColorIds={colors.map(({ id }) => id)} templateColors={colors} projectColors={projectColors} inheritLabel={colors.find(({ id }) => id === context?.bodyColorId)?.displayName ?? "Default"} onChange={(colorId) => set("colorId", colorId)} onAddColor={onAddColor} /></Field>
    {heading !== "Numbers" && <Field label="Text transform"><Select value={value.textTransform ?? "none"} options={["none", "uppercase", "lowercase", "capitalize"].map((item) => ({ value: item, label: title(item) }))} onChange={(textTransform) => set("textTransform", textTransform, "none")} /></Field>}
    <Field label="Formatting">
      <div className="flex flex-wrap gap-2">
        <TextFormattingButton label="Italic" pressed={value.italic ?? false} disabled={!textFontCapabilities(fontId).italic} onClick={() => onChange(toggleTextItalic(value, fontId))}><Italic size={16} /></TextFormattingButton>
        <TextFormattingButton label="Underline" pressed={value.underline ?? false} onClick={() => set("underline", !value.underline)}><Underline size={16} /></TextFormattingButton>
        <TextFormattingButton label="Strikethrough" pressed={value.strikethrough ?? false} onClick={() => set("strikethrough", !value.strikethrough)}><Strikethrough size={16} /></TextFormattingButton>
      </div>
    </Field>
    <ElementEffectsControl
      elementId={`${elementId}:${heading.toLowerCase()}`}
      shadowLabel="Text Shadow"
      state={{ shadow: value.textShadow, shadowColorId: value.textShadowColorId, glow: value.glow, glowColorId: value.glowColorId }}
      colors={colors}
      projectColors={projectColors}
      onAddColor={onAddColor}
      onEffectChange={(effect, strength) => onChange(setTextEffect(value, effect === "shadow" ? "textShadow" : "glow", strength))}
      onColorChange={(field, colorId) => set(field === "shadowColorId" ? "textShadowColorId" : "glowColorId", colorId)}
    />
  </InspectorSection>;
}
