import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Strikethrough,
  Underline,
} from "lucide-react";
import type {
  ResolvedDesignContext,
  TemplateDesignLibrary,
} from "../../websiteCapabilities/types";
import type { ProjectColor } from "../../websiteColors/projectColors";
import {
  changeTextFontFamily,
  resolveTextResponsiveAppearance,
  selectTextGlobalAppearanceProperty,
  selectTextResponsiveProperty,
  setTextFontWeight,
  setTextEffect,
  TEXT_ALIGNMENTS,
  TEXT_LETTER_SPACINGS,
  TEXT_LINE_HEIGHTS,
  TEXT_SIZES,
  TEXT_FONT_WEIGHTS,
  textFontCapabilities,
  type TextAppearance,
  type TextFontWeight,
} from "../../websiteElements/text";
import { applyTextStylePreset, curatedTextColors, resolveTextStyle, textStylePreset, TEXT_STYLE_IDS, type TextStyleId } from "../../websiteElements/textStylePresets";
import { Select } from "../../../components/ui/Select";
import type { TextElement } from "../../websiteElements/types";
import type { ResponsiveViewport } from "../types";
import { FontPicker } from "./FontPicker";
import { WebsiteColorSwatchControl } from "./WebsiteColorSwatchControl";
import { ElementEffectsControl } from "./ElementEffectsControl";
import {
  dispatchTextCommand,
  type TextCommand,
} from "../textCommands";

type Props = {
  element: TextElement;
  viewport: ResponsiveViewport;
  templateKey?: string;
  library: TemplateDesignLibrary;
  allowedFontIds: readonly string[];
  allowedColorIds: readonly string[];
  projectColors: readonly ProjectColor[];
  context?: ResolvedDesignContext | null;
  onAddColor: (value: string) => Promise<ProjectColor>;
  onAppearanceChange: (appearance: TextElement["appearance"]) => void;
};
const labels = (values: readonly string[]) =>
  values.map((value) => ({
    value,
    label: value[0].toUpperCase() + value.slice(1),
  }));

export function TextElementEditor(props: Props) {
  const appearance = props.element.appearance ?? {};
  const templateKey = props.templateKey ?? "classic-filipiniana-v1";
  const effectiveFontFamilyId = appearance.fontFamilyId ?? props.context?.bodyFontId;
  const fontCapabilities = textFontCapabilities(effectiveFontFamilyId);
  const update = (next: TextAppearance) => {
    const allowed = {
      fontFamilyId: next.fontFamilyId,
      fontSize: next.fontSize,
      fontWeight: next.fontWeight,
      lineHeight: next.lineHeight,
      letterSpacing: next.letterSpacing,
      alignment: next.alignment,
      colorId: next.colorId,
      textShadow: next.textShadow,
      textShadowColorId: next.textShadowColorId,
      glow: next.glow,
      glowColorId: next.glowColorId,
      italic: next.italic,
      underline: next.underline,
      strikethrough: next.strikethrough,
      textTransform: next.textTransform,
      responsive: next.responsive,
    };
    const compact = Object.fromEntries(
      Object.entries(allowed).filter(([, value]) => value !== undefined),
    );
    props.onAppearanceChange(Object.keys(compact).length ? compact : undefined);
  };
  const setGlobal = (
    key:
      | "fontFamilyId"
      | "fontSize"
      | "fontWeight"
      | "lineHeight"
      | "letterSpacing"
      | "alignment"
      | "colorId"
      | "textShadowColorId"
      | "glowColorId",
    value?: string | number,
  ) => {
    const next = { ...appearance } as TextAppearance;
    if (value) Object.assign(next, { [key]: value });
    else delete next[key];
    update(next);
  };
  const effectiveResponsive = resolveTextResponsiveAppearance(appearance, props.viewport, { fontSize: "m", alignment: "start" });
  const responsiveValue = (key: "fontSize" | "alignment") => effectiveResponsive[key];
  const setResponsive = (key: "fontSize" | "alignment", value: string) =>
    props.viewport === "desktop"
      ? setGlobal(key, value)
      : update(
          selectTextResponsiveProperty(
            appearance,
            props.viewport,
            key,
            value as never,
          ),
        );
  const colors = curatedTextColors(props.library, props.allowedColorIds, props.context, appearance.colorId);
  const style = resolveTextStyle(appearance, templateKey, props.library, props.context, props.allowedColorIds);
  return (
    <div
      className="space-y-4"
      data-text-element-editor
      data-editor-mode="appearance"
    >
      <Field label="Text Style">
        <Select value={style} options={[...TEXT_STYLE_IDS.map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) })), { value: "custom", label: "Custom", disabled: true }]} onChange={(value) => update(applyTextStylePreset(appearance, textStylePreset(value as TextStyleId, templateKey, props.library, props.context, props.allowedColorIds)))} />
      </Field>
      <Field label="Font family">
        <FontPicker
          value={appearance.fontFamilyId ?? ""}
          role="body"
          library={{
            ...props.library,
            fontFamilies: props.library.fontFamilies.filter(({ id }) =>
              props.allowedFontIds.includes(id),
            ),
          }}
          onChange={(value) =>
            update(
              changeTextFontFamily(
                appearance,
                value || undefined,
                props.context?.bodyFontId,
              ),
            )
          }
        />
      </Field>
      <Field label="Font weight">
        <IconChoices label="Font weight" value={String(appearance.fontWeight ?? 400)} options={TEXT_FONT_WEIGHTS.filter((weight) => fontCapabilities.weights.includes(weight)).map((weight) => ({ value: String(weight), label: weight === 400 ? "Normal" : weight === 600 ? "Semi-bold" : "Bold", icon: <Bold size={15} /> }))} onChange={(value) => update(setTextFontWeight(appearance, effectiveFontFamilyId, Number(value) as TextFontWeight))} />
      </Field>
      <Field label="Font size">
        <IconChoices
          label="Font size"
          value={responsiveValue("fontSize") ?? "m"}
          options={TEXT_SIZES.map((value, index) => ({
            value,
            label: labels([value])[0].label,
            icon: (
              <span
                className="leading-none"
                style={{ fontSize: `${11 + index * 2}px` }}
              >
                A
              </span>
            ),
          }))}
          onChange={(value) => setResponsive("fontSize", value)}
        />
      </Field>
      <Field label="Line height">
        <IconChoices
          label="Line height"
          value={appearance.lineHeight ?? "normal"}
          options={TEXT_LINE_HEIGHTS.map((value) => ({
            value,
            label: labels([value])[0].label,
            icon: <LineHeightIcon value={value} />,
          }))}
          onChange={(value) => update(selectTextGlobalAppearanceProperty(appearance, "lineHeight", value as TextAppearance["lineHeight"], "normal"))}
        />
      </Field>
      <Field label="Letter spacing">
        <IconChoices
          label="Letter spacing"
          value={appearance.letterSpacing ?? "normal"}
          options={TEXT_LETTER_SPACINGS.map((value) => ({
            value,
            label: labels([value])[0].label,
            icon: (
              <span
                className="text-xs font-medium leading-none"
                style={{
                  letterSpacing:
                    value === "tight"
                      ? "-0.12em"
                      : value === "wide"
                        ? "0.22em"
                        : "0",
                }}
              >
                AV
              </span>
            ),
          }))}
          onChange={(value) => update(selectTextGlobalAppearanceProperty(appearance, "letterSpacing", value as TextAppearance["letterSpacing"], "normal"))}
        />
      </Field>
      <Field label="Case">
        <IconChoices label="Text case" value={appearance.textTransform ?? "none"} options={[
          { value: "none", label: "Original case", icon: <span className="text-sm leading-none">Aa</span> },
          { value: "uppercase", label: "Uppercase", icon: <span className="text-sm leading-none">AA</span> },
          { value: "lowercase", label: "Lowercase", icon: <span className="text-sm leading-none">aa</span> },
          { value: "capitalize", label: "Capitalize", icon: <span className="text-sm leading-none">Ab</span> },
        ]} onChange={(value) => update(selectTextGlobalAppearanceProperty(appearance, "textTransform", value as TextAppearance["textTransform"], "none"))} />
      </Field>
      <Field label="Alignment">
        <IconChoices
          label="Alignment"
          value={responsiveValue("alignment") ?? "start"}
          options={TEXT_ALIGNMENTS.map((value) => ({
            value,
            label: labels([value])[0].label,
            icon:
              value === "start" ? (
                <AlignLeft size={17} />
              ) : value === "center" ? (
                <AlignCenter size={17} />
              ) : (
                <AlignRight size={17} />
              ),
          }))}
          onChange={(value) => setResponsive("alignment", value)}
        />
      </Field>
      <Field label="Color">
        <WebsiteColorSwatchControl key={props.element.id} previewTarget={`${props.element.id}:color`}
          label="Text color"
          colorId={appearance.colorId}
          allowedTemplateColorIds={colors.map(({ id }) => id)}
          templateColors={colors}
          projectColors={props.projectColors}
          inheritLabel={colors.find(({ id }) => id === props.context?.bodyColorId)?.displayName ?? "Default"}
          onChange={(value) => setGlobal("colorId", value)}
          onAddColor={props.onAddColor}
        />
      </Field>
      <ElementEffectsControl elementId={props.element.id} shadowLabel="Text Shadow" state={{ shadow: appearance.textShadow, shadowColorId: appearance.textShadowColorId, glow: appearance.glow, glowColorId: appearance.glowColorId }} colors={colors} projectColors={props.projectColors} onAddColor={props.onAddColor} onEffectChange={(effect, value) => update(setTextEffect(appearance, effect === "shadow" ? "textShadow" : "glow", value))} onColorChange={(field, value) => setGlobal(field === "shadowColorId" ? "textShadowColorId" : "glowColorId", value)} />
      {props.viewport === "mobile" && (
        <>
          <Field label="Formatting">
            <div className="flex flex-wrap gap-2">
              <MobileTool
                elementId={props.element.id}
                command="bold"
                label="Bold"
                disabled={!fontCapabilities.weights.includes(700)}
              >
                <Bold size={16} />
              </MobileTool>
              <MobileTool
                elementId={props.element.id}
                command="italic"
                label="Italic"
                disabled={!fontCapabilities.italic}
              >
                <Italic size={16} />
              </MobileTool>
              <MobileTool
                elementId={props.element.id}
                command="underline"
                label="Underline"
              >
                <Underline size={16} />
              </MobileTool>
              <MobileTool
                elementId={props.element.id}
                command="strikeThrough"
                label="Strikethrough"
              >
                <Strikethrough size={16} />
              </MobileTool>
            </div>
          </Field>
        </>
      )}
    </div>
  );
}

export function IconChoices({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string; icon: React.ReactNode }>; onChange: (value: string) => void }) {
  return <div role="group" aria-label={label} className="flex flex-wrap gap-2">{options.map((option) => <button key={option.value || "inherit"} type="button" aria-label={option.label} title={option.label} aria-pressed={value === option.value} onClick={() => onChange(option.value)} className={`grid size-10 place-items-center rounded-md border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/40 ${value === option.value ? "border-accent bg-accent text-accent-foreground" : "border-border bg-background text-foreground-muted hover:bg-surface-muted"}`}>{option.icon}<span className="sr-only">{option.label}</span></button>)}</div>;
}

export function LineHeightIcon({ value }: { value: string }) {
  const gap = value === "tight" ? 2 : value === "relaxed" ? 6 : 4;
  return <span aria-hidden="true" className="flex w-5 flex-col" style={{ gap }}>{[16, 20, 14].map((width, index) => <span key={index} className="block h-px bg-current" style={{ width }} />)}</span>;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5 text-xs font-medium">
      <div>{label}</div>
      {children}
    </div>
  );
}
function MobileTool({
  elementId,
  command,
  label,
  disabled,
  children,
}: {
  elementId: string;
  command: TextCommand;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onPointerDown={(event) => {
        event.preventDefault();
        if (!disabled) dispatchTextCommand(elementId, command);
      }}
      className="grid size-10 place-items-center rounded-md border border-border text-foreground-muted outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      {children}
    </button>
  );
}
