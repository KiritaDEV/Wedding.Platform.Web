import type { ProjectColor } from "../../websiteColors/projectColors";
import {
  TEXT_EFFECT_STRENGTHS,
  type TextEffectStrength,
} from "../../websiteElements/text";
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
  const options = TEXT_EFFECT_STRENGTHS.map((value) => ({
    value,
    label: value === "none" ? "None" : value[0].toUpperCase() + value.slice(1),
    icon: <span className="text-sm xl:text-xs! leading-none">A</span>,
  }));
  return (
    <div className="space-y-4 border-t border-border pt-4">
      <div className="text-sm xl:text-xs! font-semibold">Effects</div>
      <Field label={shadowLabel}>
        <IconChoices
          label={shadowLabel}
          value={state.shadow ?? "none"}
          options={options}
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
        <IconChoices
          label="Glow"
          value={state.glow ?? "none"}
          options={options}
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
function IconChoices({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string; icon: React.ReactNode }>;
  onChange: (value: string) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-label={option.label}
          title={option.label}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`grid size-10 place-items-center rounded-md border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/40 ${value === option.value ? "border-accent bg-accent text-accent-foreground" : "border-border bg-background text-foreground-muted hover:bg-surface-muted"}`}
        >
          {option.icon}
          <span className="sr-only">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
