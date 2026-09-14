import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";
import { Select } from "../../../components/ui/Select";
import type { ResolvedDesignContext, TemplateDesignLibrary } from "../../websiteCapabilities/types";
import type { ProjectColor } from "../../websiteColors/projectColors";
import type { DateElement } from "../../websiteElements/types";
import { changeTextFontFamily, resolveTextResponsiveAppearance, selectTextGlobalAppearanceProperty, selectTextResponsiveProperty, setTextFontWeight, TEXT_ALIGNMENTS, TEXT_LETTER_SPACINGS, TEXT_LINE_HEIGHTS, TEXT_SIZES, type TextAppearance, type TextFontWeight } from "../../websiteElements/text";
import { applyTextStylePreset, curatedTextColors, friendlyFontWeightOptions, resolveTextStyle, textStylePreset, TEXT_STYLE_IDS, type TextStyleId } from "../../websiteElements/textStylePresets";
import type { ResponsiveViewport } from "../types";
import { FontPicker } from "./FontPicker";
import { InspectorSection } from "./InspectorPrimitives";
import { InspectorVisualChoiceGroup } from "./InspectorVisualChoice";
import { IconChoices, LineHeightIcon } from "./TextElementEditor";
import { WebsiteColorSwatchControl } from "./WebsiteColorSwatchControl";
import { setTextEffect, type TextEffectStrength } from "../../websiteElements/text";
import { ElementEffectsControl } from "./ElementEffectsControl";

type DateAppearance = NonNullable<DateElement["appearance"]>;
type Props = { element: DateElement; viewport: ResponsiveViewport; templateKey: string; library: TemplateDesignLibrary; allowedFontIds: readonly string[]; allowedColorIds: readonly string[]; projectColors: readonly ProjectColor[]; context?: ResolvedDesignContext | null; onAddColor: (value: string) => Promise<ProjectColor>; onChange: (element: DateElement) => void };

const styleLabels: Record<TextStyleId | "custom", string> = { heading: "Heading", subheading: "Subheading", eyebrow: "Eyebrow", body: "Body", caption: "Caption", custom: "Custom" };

export function DateElementEditor({ element, viewport, templateKey, library, allowedFontIds, allowedColorIds, projectColors, context, onAddColor, onChange }: Props) {
  const appearance = element.appearance ?? {};
  const semanticStyle = appearance.textStyle === "display" ? "heading" : appearance.textStyle ?? "heading";
  const inheritedFontId = appearance.textStyle && appearance.textStyle !== "display" ? context?.bodyFontId : context?.headingFontId;
  const inheritedFontSize = semanticStyle === "body" ? "m" : "l";
  const effective = resolveTextResponsiveAppearance(appearance, viewport, { fontSize: inheritedFontSize, alignment: "start" });
  const effectiveFontId = appearance.fontFamilyId ?? inheritedFontId;
  const update = (nextAppearance: DateAppearance) => onChange(withDateAppearance(element, nextAppearance));
  const set = <K extends keyof DateAppearance>(key: K, value: DateAppearance[K] | undefined) => { const next = { ...appearance }; if (value === undefined || value === "") delete next[key]; else Object.assign(next, { [key]: value }); update(next); };
  const setResponsive = (key: "fontSize" | "alignment", value: string) => update(selectTextResponsiveProperty(appearance, viewport, key, value as never, { fontSize: inheritedFontSize, alignment: "start" }) as DateAppearance);
  const setWeight = (weight: TextFontWeight) => {
    const semanticDefault = semanticStyle === "body" ? 400 : 600;
    const next = setTextFontWeight(appearance, effectiveFontId, weight) as DateAppearance;
    if (weight === semanticDefault) delete next.fontWeight;
    else next.fontWeight = weight;
    update(next);
  };
  const curatedColors = curatedTextColors(library, allowedColorIds, context, appearance.colorId);
  const hasTypographyOverrides = ["fontSize", "fontWeight", "lineHeight", "letterSpacing", "alignment", "colorId", "textTransform"].some((key) => appearance[key as keyof DateAppearance] !== undefined);
  const resolvedStyle = appearance.textStyle === "display"
    ? "heading"
    : appearance.textStyle === undefined
      ? hasTypographyOverrides ? resolveTextStyle(appearance, templateKey, library, context, allowedColorIds) : "heading"
    : resolveTextStyle(appearance, templateKey, library, context, allowedColorIds) === appearance.textStyle
      ? appearance.textStyle
      : "custom";
  const selectStyle = (style: TextStyleId) => {
    const next = applyTextStylePreset(appearance, textStylePreset(style, templateKey, library, context, allowedColorIds)) as DateAppearance;
    next.textStyle = style;
    update(next);
  };
  return <div className="space-y-5" data-date-element-editor><InspectorSection title="Date appearance">
    <p className="text-xs text-foreground-muted">Uses the wedding date from Event settings. This block does not store a separate date.</p>
    <Field label="Format"><Select value={appearance.format ?? "long"} options={[{ value: "long", label: "Long" }, { value: "medium", label: "Medium" }, { value: "short", label: "Short" }, { value: "numeric", label: "Numeric" }]} onChange={(value) => set("format", value === "long" ? undefined : value as DateAppearance["format"])} /></Field>
    {(appearance.format ?? "long") === "long" && <Field label="Weekday"><InspectorVisualChoiceGroup label="Weekday" layout="stack" showIllustration={false} value={(appearance.showWeekday ?? true) ? "show" : "hide"} options={[{ value: "show", label: "Show", illustration: null }, { value: "hide", label: "Hide", illustration: null }]} onChange={(value) => set("showWeekday", value === "show" ? undefined : false)} /></Field>}
    <Field label="Text Style"><Select value={resolvedStyle} options={[...TEXT_STYLE_IDS.map((value) => ({ value, label: styleLabels[value] })), { value: "custom", label: styleLabels.custom, disabled: true }]} onChange={(value) => selectStyle(value as TextStyleId)} /></Field>
    <Field label="Font family"><FontPicker value={appearance.fontFamilyId ?? ""} role={appearance.textStyle ? "body" : "heading"} library={{ ...library, fontFamilies: library.fontFamilies.filter(({ id }) => allowedFontIds.includes(id)) }} onChange={(value) => update(changeTextFontFamily(appearance, value || undefined, inheritedFontId) as DateAppearance)} /></Field>
    <Field label="Font weight"><Select aria-label="Font weight" value={String(appearance.fontWeight ?? (semanticStyle === "body" ? 400 : 600))} options={friendlyFontWeightOptions(effectiveFontId)} onChange={(value) => setWeight(Number(value) as TextFontWeight)} /></Field>
    <Field label="Font size"><IconChoices label="Font size" value={effective.fontSize} options={TEXT_SIZES.map((value, index) => ({ value, label: title(value), icon: <span className="leading-none" style={{ fontSize: `${11 + index * 2}px` }}>A</span> }))} onChange={(value) => setResponsive("fontSize", value)} /></Field>
    <Field label="Line height"><IconChoices label="Line height" value={appearance.lineHeight ?? (semanticStyle === "body" ? "normal" : "tight")} options={TEXT_LINE_HEIGHTS.map((value) => ({ value, label: title(value), icon: <LineHeightIcon value={value} /> }))} onChange={(value) => update(selectTextGlobalAppearanceProperty(appearance, "lineHeight", value as TextAppearance["lineHeight"], semanticStyle === "body" ? "normal" : "tight") as DateAppearance)} /></Field>
    <Field label="Letter spacing"><IconChoices label="Letter spacing" value={appearance.letterSpacing ?? "normal"} options={TEXT_LETTER_SPACINGS.map((value) => ({ value, label: title(value), icon: <span className="text-xs font-medium leading-none" style={{ letterSpacing: value === "tight" ? "-0.12em" : value === "wide" ? "0.22em" : "0" }}>AV</span> }))} onChange={(value) => update(selectTextGlobalAppearanceProperty(appearance, "letterSpacing", value as TextAppearance["letterSpacing"], "normal") as DateAppearance)} /></Field>
    <Field label="Alignment"><IconChoices label="Alignment" value={effective.alignment} options={TEXT_ALIGNMENTS.map((value) => ({ value, label: title(value), icon: value === "start" ? <AlignLeft size={17} /> : value === "center" ? <AlignCenter size={17} /> : <AlignRight size={17} /> }))} onChange={(value) => setResponsive("alignment", value)} /></Field>
    <Field label="Color"><WebsiteColorSwatchControl key={element.id} previewTarget={`${element.id}:color`} label="Date color" colorId={appearance.colorId ?? context?.headingColorId} allowedTemplateColorIds={curatedColors.map(({ id }) => id)} templateColors={curatedColors} projectColors={projectColors} showInheritChoice={!context?.headingColorId} onChange={(value) => update(selectTextGlobalAppearanceProperty(appearance, "colorId", value, context?.headingColorId) as DateAppearance)} onAddColor={onAddColor} /></Field>
    <ElementEffectsControl elementId={element.id} shadowLabel="Text Shadow" state={{ shadow: appearance.textShadow, shadowColorId: appearance.textShadowColorId, glow: appearance.glow, glowColorId: appearance.glowColorId }} colors={curatedColors} projectColors={projectColors} onAddColor={onAddColor} onEffectChange={(effect, value) => update(setTextEffect(appearance, effect === "shadow" ? "textShadow" : "glow", value as TextEffectStrength) as DateAppearance)} onColorChange={(field, value) => set(field === "shadowColorId" ? "textShadowColorId" : "glowColorId", value)} />
  </InspectorSection></div>;
}

function withDateAppearance(element: DateElement, appearance: DateAppearance): DateElement { const next = { ...element }; if (Object.keys(appearance).length) next.appearance = appearance; else delete next.appearance; return next; }
const title = (value: string) => value[0].toUpperCase() + value.slice(1);
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5 text-xs font-medium"><div>{label}</div>{children}</div>; }
