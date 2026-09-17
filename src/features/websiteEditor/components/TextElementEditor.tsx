import {
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
  textFontCapabilities,
  type TextAppearance,
  type TextFontWeight,
} from "../../websiteElements/text";
import {
  curatedTextColors,
  friendlyFontWeightOptions,
} from "../../websiteElements/textAppearance";
import { Select } from "../../../components/ui/Select";
import type { TextElement } from "../../websiteElements/types";
import type { ResponsiveViewport } from "../types";
import { FontPicker } from "./FontPicker";
import { WebsiteColorSwatchControl } from "./WebsiteColorSwatchControl";
import { ElementEffectsControl } from "./ElementEffectsControl";
import { dispatchTextCommand, type TextCommand } from "../textCommands";
import { FONT_SIZE_OPTIONS } from "./fontSizeOptions";

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
  const effectiveFontFamilyId =
    appearance.fontFamilyId ?? props.context?.bodyFontId;
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
  const effectiveResponsive = resolveTextResponsiveAppearance(
    appearance,
    props.viewport,
    { fontSize: "m", alignment: "start" },
  );
  const responsiveValue = (key: "fontSize" | "alignment") =>
    effectiveResponsive[key];
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
  const colors = curatedTextColors(
    props.library,
    props.allowedColorIds,
    props.context,
    appearance.colorId,
  );
  return (
    <div
      className="space-y-4 pt-5"
      data-text-element-editor
      data-editor-mode="appearance"
    >
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
        <Select
          aria-label="Font weight"
          value={String(appearance.fontWeight ?? 400)}
          options={friendlyFontWeightOptions(effectiveFontFamilyId)}
          onChange={(value) =>
            update(
              setTextFontWeight(
                appearance,
                effectiveFontFamilyId,
                Number(value) as TextFontWeight,
              ),
            )
          }
        />
      </Field>
      <Field label="Font size">
        <Select
          aria-label="Font size"
          value={responsiveValue("fontSize") ?? "m"}
          options={FONT_SIZE_OPTIONS}
          onChange={(value) => setResponsive("fontSize", value)}
        />
      </Field>
      <Field label="Line height">
        <Select
          aria-label="Line height"
          value={appearance.lineHeight ?? "normal"}
          options={TEXT_LINE_HEIGHTS.map((value) => ({
            value,
            label: labels([value])[0].label,
          }))}
          onChange={(value) =>
            update(
              selectTextGlobalAppearanceProperty(
                appearance,
                "lineHeight",
                value as TextAppearance["lineHeight"],
                "normal",
              ),
            )
          }
        />
      </Field>
      <Field label="Letter spacing">
        <Select
          aria-label="Letter spacing"
          value={appearance.letterSpacing ?? "normal"}
          options={TEXT_LETTER_SPACINGS.map((value) => ({
            value,
            label: labels([value])[0].label,
          }))}
          onChange={(value) =>
            update(
              selectTextGlobalAppearanceProperty(
                appearance,
                "letterSpacing",
                value as TextAppearance["letterSpacing"],
                "normal",
              ),
            )
          }
        />
      </Field>
      <Field label="Case">
        <Select
          aria-label="Text case"
          value={appearance.textTransform ?? "none"}
          options={[
            {
              value: "none",
              label: "Original case",
            },
            {
              value: "uppercase",
              label: "Uppercase",
            },
            {
              value: "lowercase",
              label: "Lowercase",
            },
            {
              value: "capitalize",
              label: "Capitalize",
            },
          ]}
          onChange={(value) =>
            update(
              selectTextGlobalAppearanceProperty(
                appearance,
                "textTransform",
                value as TextAppearance["textTransform"],
                "none",
              ),
            )
          }
        />
      </Field>
      <Field label="Alignment">
        <Select
          aria-label="Alignment"
          value={responsiveValue("alignment") ?? "start"}
          options={TEXT_ALIGNMENTS.map((value) => ({
            value,
            label: labels([value])[0].label,
          }))}
          onChange={(value) => setResponsive("alignment", value)}
        />
      </Field>
      <Field label="Color">
        <WebsiteColorSwatchControl
          key={props.element.id}
          previewTarget={`${props.element.id}:color`}
          label="Text color"
          colorId={appearance.colorId}
          allowedTemplateColorIds={colors.map(({ id }) => id)}
          templateColors={colors}
          projectColors={props.projectColors}
          inheritLabel={
            colors.find(({ id }) => id === props.context?.bodyColorId)
              ?.displayName ?? "Default"
          }
          onChange={(value) => setGlobal("colorId", value)}
          onAddColor={props.onAddColor}
        />
      </Field>
      <ElementEffectsControl
        elementId={props.element.id}
        shadowLabel="Text Shadow"
        state={{
          shadow: appearance.textShadow,
          shadowColorId: appearance.textShadowColorId,
          glow: appearance.glow,
          glowColorId: appearance.glowColorId,
        }}
        colors={colors}
        projectColors={props.projectColors}
        onAddColor={props.onAddColor}
        onEffectChange={(effect, value) =>
          update(
            setTextEffect(
              appearance,
              effect === "shadow" ? "textShadow" : "glow",
              value,
            ),
          )
        }
        onColorChange={(field, value) =>
          setGlobal(
            field === "shadowColorId" ? "textShadowColorId" : "glowColorId",
            value,
          )
        }
      />
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
