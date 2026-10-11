import type { ProjectColor } from "../../websiteColors/projectColors";
import {
  TEXT_EFFECT_STRENGTHS,
  type TextEffectStrength,
} from "../../websiteElements/text";
import { Select } from "../../../components/ui/Select";
import { WebsiteColorSwatchControl } from "./WebsiteColorSwatchControl";
type EffectState = {
  shadow?: TextEffectStrength;
  shadowColorId?: string;
  glow?: TextEffectStrength;
  glowColorId?: string;
};
export function ElementEffectsControl({
  elementId,
  shadowLabel,
  state,
  colors,
  projectColors,
  onAddColor,
  onEffectChange,
  onColorChange,
}: {
  elementId: string;
  shadowLabel: "Text Shadow" | "Shadow";
  state: EffectState;
  colors: readonly { id: string; displayName: string; value: string }[];
  projectColors: readonly ProjectColor[];
  onAddColor: (value: string) => Promise<ProjectColor>;
  onEffectChange: (
    effect: "shadow" | "glow",
    value: TextEffectStrength,
  ) => void;
  onColorChange: (
    field: "shadowColorId" | "glowColorId",
    value?: string,
  ) => void;
}) {
  const selectOptions = TEXT_EFFECT_STRENGTHS.map((value) => ({
    value,
    label: value === "none" ? "None" : value[0].toUpperCase() + value.slice(1),
  }));
  return (
    <div className="space-y-4 border-t border-border pt-4">
      <div className="text-sm xl:text-xs! font-semibold">Effects</div>
      <Field label={shadowLabel}>
        <Select
          aria-label={shadowLabel}
          value={state.shadow ?? "none"}
          options={selectOptions}
          onChange={(value) =>
            onEffectChange("shadow", value as TextEffectStrength)
          }
        />
      </Field>
      {(state.shadow ?? "none") !== "none" && (
        <Field label="Shadow Color">
          <WebsiteColorSwatchControl
            key={`${elementId}:shadow`}
            previewTarget={`${elementId}:${shadowLabel === "Text Shadow" ? "textShadowColor" : "shadowColor"}`}
            label="Shadow Color"
            colorId={state.shadowColorId}
            allowedTemplateColorIds={colors.map(({ id }) => id)}
            templateColors={colors}
            projectColors={projectColors}
            inheritLabel="Default shadow"
            onChange={(value) => onColorChange("shadowColorId", value)}
            onAddColor={onAddColor}
          />
        </Field>
      )}
      <Field label="Glow">
        <Select
          aria-label="Glow"
          value={state.glow ?? "none"}
          options={selectOptions}
          onChange={(value) =>
            onEffectChange("glow", value as TextEffectStrength)
          }
        />
      </Field>
      {(state.glow ?? "none") !== "none" && (
        <Field label="Glow Color">
          <WebsiteColorSwatchControl
            key={`${elementId}:glow`}
            previewTarget={`${elementId}:glowColor`}
            label="Glow Color"
            colorId={state.glowColorId}
            allowedTemplateColorIds={colors.map(({ id }) => id)}
            templateColors={colors}
            projectColors={projectColors}
            inheritLabel="Default glow"
            onChange={(value) => onColorChange("glowColorId", value)}
            onAddColor={onAddColor}
          />
        </Field>
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
