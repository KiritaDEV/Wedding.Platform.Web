import { Select } from "../../../components/ui/Select";
import type {
  ResolvedDesignContext,
  TemplateDesignLibrary,
} from "../../websiteCapabilities/types";
import type { ProjectColor } from "../../websiteColors/projectColors";
import type { DateElement } from "../../websiteElements/types";
import {
  changeTextFontFamily,
  resolveTextResponsiveAppearance,
  selectTextGlobalAppearanceProperty,
  selectTextResponsiveProperty,
  setTextFontWeight,
  TEXT_ALIGNMENTS,
  TEXT_LETTER_SPACINGS,
  TEXT_LINE_HEIGHTS,
  type TextAppearance,
  type TextFontWeight,
} from "../../websiteElements/text";
import {
  curatedTextColors,
  friendlyFontWeightOptions,
} from "../../websiteElements/textAppearance";
import type { ResponsiveViewport } from "../types";
import { FontPicker } from "./FontPicker";
import { InspectorSection } from "./InspectorPrimitives";
import { InspectorVisualChoiceGroup } from "./InspectorVisualChoice";
import { WebsiteColorSwatchControl } from "./WebsiteColorSwatchControl";
import {
  setTextEffect,
  type TextEffectStrength,
} from "../../websiteElements/text";
import { ElementEffectsControl } from "./ElementEffectsControl";
import { FONT_SIZE_OPTIONS } from "./fontSizeOptions";

type DateAppearance = NonNullable<DateElement["appearance"]>;
type Props = {
  element: DateElement;
  viewport: ResponsiveViewport;
  templateKey: string;
  library: TemplateDesignLibrary;
  allowedFontIds: readonly string[];
  allowedColorIds: readonly string[];
  projectColors: readonly ProjectColor[];
  context?: ResolvedDesignContext | null;
  onAddColor: (value: string) => Promise<ProjectColor>;
  onChange: (element: DateElement) => void;
};

export function DateElementEditor({
  element,
  viewport,
  library,
  allowedFontIds,
  allowedColorIds,
  projectColors,
  context,
  onAddColor,
  onChange,
}: Props) {
  const appearance = element.appearance ?? {};
  const inheritedFontId = context?.headingFontId;
  const inheritedFontSize = "l";
  const effective = resolveTextResponsiveAppearance(appearance, viewport, {
    fontSize: inheritedFontSize,
    alignment: "start",
  });
  const effectiveFontId = appearance.fontFamilyId ?? inheritedFontId;
  const update = (nextAppearance: DateAppearance) =>
    onChange(withDateAppearance(element, nextAppearance));
  const set = <K extends keyof DateAppearance>(
    key: K,
    value: DateAppearance[K] | undefined,
  ) => {
    const next = { ...appearance };
    if (value === undefined || value === "") delete next[key];
    else Object.assign(next, { [key]: value });
    update(next);
  };
  const setResponsive = (key: "fontSize" | "alignment", value: string) =>
    update(
      selectTextResponsiveProperty(appearance, viewport, key, value as never, {
        fontSize: inheritedFontSize,
        alignment: "start",
      }) as DateAppearance,
    );
  const setWeight = (weight: TextFontWeight) => {
    const semanticDefault = 600;
    const next = setTextFontWeight(
      appearance,
      effectiveFontId,
      weight,
    ) as DateAppearance;
    if (weight === semanticDefault) delete next.fontWeight;
    else next.fontWeight = weight;
    update(next);
  };
  const curatedColors = curatedTextColors(
    library,
    allowedColorIds,
    context,
    appearance.colorId,
  );
  return (
    <div className="space-y-5 pt-5" data-date-element-editor>
      <InspectorSection title="Date appearance">
        <p className="text-xs text-foreground-muted">
          Uses the wedding date from Event settings. This block does not store a
          separate date.
        </p>
        <Field label="Format">
          <Select
            value={appearance.format ?? "long"}
            options={[
              { value: "long", label: "Long" },
              { value: "medium", label: "Medium" },
              { value: "short", label: "Short" },
              { value: "numeric", label: "Numeric" },
            ]}
            onChange={(value) =>
              set(
                "format",
                value === "long"
                  ? undefined
                  : (value as DateAppearance["format"]),
              )
            }
          />
        </Field>
        {(appearance.format ?? "long") === "long" && (
          <Field label="Weekday">
            <InspectorVisualChoiceGroup
              label="Weekday"
              layout="stack"
              showIllustration={false}
              value={(appearance.showWeekday ?? true) ? "show" : "hide"}
              options={[
                { value: "show", label: "Show", illustration: null },
                { value: "hide", label: "Hide", illustration: null },
              ]}
              onChange={(value) =>
                set("showWeekday", value === "show" ? undefined : false)
              }
            />
          </Field>
        )}
        <Field label="Font family">
          <FontPicker
            value={appearance.fontFamilyId ?? ""}
            role="heading"
            library={{
              ...library,
              fontFamilies: library.fontFamilies.filter(({ id }) =>
                allowedFontIds.includes(id),
              ),
            }}
            onChange={(value) =>
              update(
                changeTextFontFamily(
                  appearance,
                  value || undefined,
                  inheritedFontId,
                ) as DateAppearance,
              )
            }
          />
        </Field>
        <Field label="Font weight">
          <Select
            aria-label="Font weight"
            value={String(appearance.fontWeight ?? 600)}
            options={friendlyFontWeightOptions(effectiveFontId)}
            onChange={(value) => setWeight(Number(value) as TextFontWeight)}
          />
        </Field>
        <Field label="Font size">
          <Select
            aria-label="Font size"
            value={effective.fontSize}
            options={FONT_SIZE_OPTIONS}
            onChange={(value) => setResponsive("fontSize", value)}
          />
        </Field>
        <Field label="Line height">
          <Select
            aria-label="Line height"
            value={appearance.lineHeight ?? "tight"}
            options={TEXT_LINE_HEIGHTS.map((value) => ({
              value,
              label: title(value),
            }))}
            onChange={(value) =>
              update(
                selectTextGlobalAppearanceProperty(
                  appearance,
                  "lineHeight",
                  value as TextAppearance["lineHeight"],
                  "tight",
                ) as DateAppearance,
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
              label: title(value),
            }))}
            onChange={(value) =>
              update(
                selectTextGlobalAppearanceProperty(
                  appearance,
                  "letterSpacing",
                  value as TextAppearance["letterSpacing"],
                  "normal",
                ) as DateAppearance,
              )
            }
          />
        </Field>
        <Field label="Alignment">
          <Select
            aria-label="Alignment"
            value={effective.alignment}
            options={TEXT_ALIGNMENTS.map((value) => ({
              value,
              label: title(value),
            }))}
            onChange={(value) => setResponsive("alignment", value)}
          />
        </Field>
        <Field label="Color">
          <WebsiteColorSwatchControl
            key={element.id}
            previewTarget={`${element.id}:color`}
            label="Date color"
            colorId={appearance.colorId ?? context?.headingColorId}
            allowedTemplateColorIds={curatedColors.map(({ id }) => id)}
            templateColors={curatedColors}
            projectColors={projectColors}
            showInheritChoice={!context?.headingColorId}
            onChange={(value) =>
              update(
                selectTextGlobalAppearanceProperty(
                  appearance,
                  "colorId",
                  value,
                  context?.headingColorId,
                ) as DateAppearance,
              )
            }
            onAddColor={onAddColor}
          />
        </Field>
        <ElementEffectsControl
          elementId={element.id}
          shadowLabel="Text Shadow"
          state={{
            shadow: appearance.textShadow,
            shadowColorId: appearance.textShadowColorId,
            glow: appearance.glow,
            glowColorId: appearance.glowColorId,
          }}
          colors={curatedColors}
          projectColors={projectColors}
          onAddColor={onAddColor}
          onEffectChange={(effect, value) =>
            update(
              setTextEffect(
                appearance,
                effect === "shadow" ? "textShadow" : "glow",
                value as TextEffectStrength,
              ) as DateAppearance,
            )
          }
          onColorChange={(field, value) =>
            set(
              field === "shadowColorId" ? "textShadowColorId" : "glowColorId",
              value,
            )
          }
        />
      </InspectorSection>
    </div>
  );
}

function withDateAppearance(
  element: DateElement,
  appearance: DateAppearance,
): DateElement {
  const next = { ...element };
  if (Object.keys(appearance).length) next.appearance = appearance;
  else delete next.appearance;
  return next;
}
const title = (value: string) => value[0].toUpperCase() + value.slice(1);
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
