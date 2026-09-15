import { useDecorativeSourceAvailability } from "../../websiteRenderer/decorativeSourceAvailability";
import { Select } from "../../../components/ui/Select";
import { resolveDividerColors } from "../../websiteElements/dividerColor";
import type {
  ResolvedDesignContext,
  TemplateDesignLibrary,
} from "../../websiteCapabilities/types";
import type { ProjectColor } from "../../websiteColors/projectColors";
import {
  DIVIDER_OPACITY_DEFAULT,
  DIVIDER_OPACITY_MAX,
  DIVIDER_OPACITY_MIN,
  DIVIDER_WIDTH_DEFAULT,
  DIVIDER_WIDTHS,
  dividerAssetsForTemplate,
  dividerRegistryForTemplate,
  resolveDividerAsset,
} from "../../websiteElements/divider";
import type { DividerElement } from "../../websiteElements/types";
import { InspectorSection } from "./InspectorPrimitives";
import { InspectorVisualChoiceGroup } from "./InspectorVisualChoice";
import { WebsiteColorSwatchControl } from "./WebsiteColorSwatchControl";
import { ElementEffectsControl } from "./ElementEffectsControl";
import type { TextEffectStrength } from "../../websiteElements/text";

export function DividerElementEditor({
  element,
  templateKey,
  library,
  allowedColorIds,
  projectColors,
  context,
  onAddColor,
  onChange,
}: {
  element: DividerElement;
  context?: ResolvedDesignContext | null;
  templateKey: string;
  library: TemplateDesignLibrary;
  allowedColorIds: readonly string[];
  projectColors: readonly ProjectColor[];
  onAddColor: (value: string) => Promise<ProjectColor>;
  onChange: (element: DividerElement) => void;
}) {
  useDecorativeSourceAvailability();
  const appearance = element.appearance ?? {};
  const colors = resolveDividerColors(
    appearance.colorId,
    context,
    library,
    projectColors,
  );
  const assets = dividerAssetsForTemplate(templateKey);
  const registry = dividerRegistryForTemplate(templateKey);
  const asset = resolveDividerAsset(templateKey, appearance.assetId);
  const set = (
    key: keyof NonNullable<DividerElement["appearance"]>,
    value: unknown,
  ) => {
    const next = { ...appearance, [key]: value };
    if (value === undefined) delete next[key];
    onChange({
      ...element,
      appearance: Object.keys(next).length ? next : undefined,
    });
  };
  if (!asset)
    return (
      <div
        className="p-4 text-xs text-foreground-muted"
        data-divider-element-editor
      >
        No Divider assets are available for this template.
      </div>
    );
  const width = appearance.width ?? registry.defaultWidth;
  const opacity = appearance.opacity ?? DIVIDER_OPACITY_DEFAULT;
  const selectedAssetId =
    appearance.assetId && assets.some(({ id }) => id === appearance.assetId)
      ? appearance.assetId
      : asset.id;

  return (
    <div className="space-y-5 pt-5" data-divider-element-editor>
      <InspectorSection title="Divider appearance">
        <Field label="Style">
          <Select
            value={selectedAssetId}
            options={assets.map((item) => ({
              value: item.id,
              label: item.label,
            }))}
            onChange={(value) => set("assetId", value)}
          />
        </Field>
        <Field label="Color">
          <WebsiteColorSwatchControl
            key={element.id}
            previewTarget={`${element.id}:color`}
            label="Divider color"
            colorId={colors.authoredColor ? appearance.colorId : undefined}
            allowedTemplateColorIds={allowedColorIds}
            templateColors={library.colors}
            projectColors={projectColors}
            inheritLabel="Default"
            inheritColor={colors.defaultColor}
            showUnresolvedWarning={false}
            onChange={(value) => set("colorId", value)}
            onAddColor={onAddColor}
          />
          {appearance.colorId && !colors.authoredColor && (
            <p role="status" className="mt-2 text-xs text-foreground-muted">
              The selected color is unavailable. Default is shown.
            </p>
          )}
        </Field>
        <Field label="Width">
          <Select
            value={width}
            options={DIVIDER_WIDTHS.map((value) => ({
              value,
              label: value[0].toUpperCase() + value.slice(1),
            }))}
            onChange={(value) =>
              set("width", value === DIVIDER_WIDTH_DEFAULT ? undefined : value)
            }
          />
        </Field>
        <Field label="Alignment">
          <InspectorVisualChoiceGroup
            label="Alignment"
            layout="stack"
            showIllustration={false}
            value={appearance.alignment ?? "center"}
            options={[
              { value: "start", label: "Left", illustration: null },
              { value: "center", label: "Center", illustration: null },
              { value: "end", label: "Right", illustration: null },
            ]}
            onChange={(value) => set("alignment", value)}
          />
        </Field>
        <Field label="Opacity" value={`${opacity}%`}>
          <ContinuousSlider
            ariaLabel="Divider opacity"
            value={opacity}
            min={DIVIDER_OPACITY_MIN}
            max={DIVIDER_OPACITY_MAX}
            startLabel={`${DIVIDER_OPACITY_MIN}%`}
            endLabel={`${DIVIDER_OPACITY_MAX}%`}
            onChange={(value) =>
              set(
                "opacity",
                value === DIVIDER_OPACITY_DEFAULT ? undefined : value,
              )
            }
          />
        </Field>
        <ElementEffectsControl
          elementId={element.id}
          shadowLabel="Shadow"
          state={{
            shadow: appearance.shadow,
            shadowColorId: appearance.shadowColorId,
            glow: appearance.glow,
            glowColorId: appearance.glowColorId,
          }}
          colors={library.colors.filter(({ id }) =>
            allowedColorIds.includes(id),
          )}
          projectColors={projectColors}
          onAddColor={onAddColor}
          onEffectChange={(effect, value) => {
            const key = effect === "shadow" ? "shadow" : "glow";
            const colorKey =
              effect === "shadow" ? "shadowColorId" : "glowColorId";
            const next = { ...appearance };
            if (value === "none") {
              delete next[key];
              delete next[colorKey];
            } else next[key] = value as TextEffectStrength;
            onChange({
              ...element,
              appearance: Object.keys(next).length ? next : undefined,
            });
          }}
          onColorChange={(field, value) => set(field, value)}
        />
      </InspectorSection>
    </div>
  );
}

function Field({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-medium">
        <span>{label}</span>
        {value && (
          <span className="text-[10px] text-foreground-muted">{value}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function ContinuousSlider({
  ariaLabel,
  value,
  min,
  max,
  startLabel,
  endLabel,
  onChange,
}: {
  ariaLabel: string;
  value: number;
  min: number;
  max: number;
  startLabel: string;
  endLabel: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        aria-label={ariaLabel}
        aria-valuetext={`${value}% between ${startLabel} and ${endLabel}`}
        className="h-2 w-full cursor-pointer accent-accent"
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="flex justify-between text-[10px] text-foreground-muted">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
    </div>
  );
}
