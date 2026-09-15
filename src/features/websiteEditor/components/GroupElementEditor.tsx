import { Button } from "../../../components/ui/Button";
import { Select } from "../../../components/ui/Select";
import {
  GROUP_ALIGNMENTS,
  GROUP_DIVISIONS,
  GROUP_DIRECTIONS,
  GROUP_GAPS,
  GROUP_SHADOWS,
  GROUP_WIDTHS,
  resolveGroupLayout,
  selectGroupLayoutProperty,
  selectGroupPaddingSide,
  setGroupBackgroundColor,
  setGroupBackgroundImageOpacity,
  setGroupBackgroundMedia,
  setGroupDecoration,
  setGroupShadow,
  setGroupLayoutProperty,
  type GroupLayout,
} from "../../websiteElements/group";
import type { CompositionGroup } from "../../websiteElements/types";
import type { ResponsiveViewport } from "../types";
import type {
  SectionCapability,
  TemplateDesignLibrary,
} from "../../websiteCapabilities/types";
import type { ProjectColor } from "../../websiteColors/projectColors";
import { InspectorResetAction, InspectorSection } from "./InspectorPrimitives";
import {
  InspectorVisualChoiceGroup,
  type InspectorVisualChoiceOption,
} from "./InspectorVisualChoice";
import { WebsiteColorSwatchControl } from "./WebsiteColorSwatchControl";
import { DecorativeStrengthControl } from "./DecorativeStrengthControl";
import {
  decorativeHelpers,
  decorativeLabel,
} from "./decorativeAppearanceOptions";
import { resolveDecorativeDefaultStrength } from "../../websiteRenderer/templateDecorativeAssets";
import type { ResolvedWebsiteMedia } from "../types";
import { BackgroundMediaEditor } from "./BackgroundMediaEditor";
import { FourSidedSpacingControl as InnerSpacingControl } from "./FourSidedSpacingControl";
import { ContentPositionControl } from "./ContentPositionControl";
import type { HeroContentPosition } from "../../websiteRenderer/heroContentPosition";
import {
  resolveFourSidedSpacing,
  type FourSidedSpacing,
  type SpacingPreset,
} from "../../websiteElements/spacing";

const label = (value: string) =>
  value === "none"
    ? "None"
    : value === "stretch"
      ? "Fill"
      : value
          .replace("50-50", "50 / 50")
          .replace("40-60", "40 / 60")
          .replace("60-40", "60 / 40")
          .replace("thirds", "Thirds")
          .replace(/^./, (letter) => letter.toUpperCase());
const options = (values: readonly string[]) =>
  values.map((value) => ({ value, label: label(value) }));

export function GroupElementEditor({
  group,
  viewport,
  onChange,
  onUngroup,
  templateKey,
  capability,
  library,
  projectColors = [],
  onAddColor,
  resolvedMedia = {},
  onMediaResolved,
}: {
  group: CompositionGroup;
  viewport: ResponsiveViewport;
  onChange: (group: CompositionGroup) => void;
  onUngroup: () => void;
  templateKey?: string;
  capability?: NonNullable<SectionCapability["decorativeAppearance"]>;
  library?: TemplateDesignLibrary;
  projectColors?: readonly ProjectColor[];
  onAddColor?: (value: string) => Promise<ProjectColor>;
  resolvedMedia?: Record<string, ResolvedWebsiteMedia>;
  onMediaResolved?: (media: ResolvedWebsiteMedia) => void;
}) {
  const layout = group.layout ?? {};
  const effective = resolveGroupLayout(layout, viewport);
  const set = <
    K extends
      | "width"
      | "direction"
      | "gap"
      | "alignment"
      | "division"
      | "contentPosition",
  >(
    key: K,
    value: GroupLayout[K] | undefined,
  ) =>
    onChange({
      ...group,
      layout:
        value === undefined
          ? setGroupLayoutProperty(layout, viewport, key, undefined)
          : selectGroupLayoutProperty(layout, viewport, key, value as never),
    });
  const effectiveDirection = effective.direction ?? "vertical";
  const appearance = group.appearance ?? {};
  const effectiveOuterSpacing = resolveFourSidedSpacing(
    appearance.outerSpacing,
    viewport === "desktop"
      ? undefined
      : appearance.responsive?.[viewport]?.outerSpacing,
  );
  const updateOuterSpacing = (
    changes: Partial<Record<keyof FourSidedSpacing, SpacingPreset>>,
  ) => {
    const nextAppearance = structuredClone(appearance);
    for (const [sideKey, value] of Object.entries(changes)) {
      const side = sideKey as keyof FourSidedSpacing;
      if (viewport === "desktop") {
        const spacing = { ...nextAppearance.outerSpacing };
        if (value === "none") delete spacing[side];
        else spacing[side] = value;
        if (Object.keys(spacing).length) nextAppearance.outerSpacing = spacing;
        else delete nextAppearance.outerSpacing;
      } else {
        const responsive = { ...nextAppearance.responsive };
        const branch = { ...responsive[viewport] };
        const spacing = { ...branch.outerSpacing };
        if (value === (nextAppearance.outerSpacing?.[side] ?? "none"))
          delete spacing[side];
        else spacing[side] = value;
        if (Object.keys(spacing).length) branch.outerSpacing = spacing;
        else delete branch.outerSpacing;
        if (Object.keys(branch).length) responsive[viewport] = branch;
        else delete responsive[viewport];
        if (Object.keys(responsive).length)
          nextAppearance.responsive = responsive;
        else delete nextAppearance.responsive;
      }
    }
    const next = { ...group };
    if (Object.keys(nextAppearance).length) next.appearance = nextAppearance;
    else delete next.appearance;
    onChange(next);
  };
  const updatePadding = (
    changes: Partial<
      Record<"top" | "right" | "bottom" | "left", SpacingPreset>
    >,
  ) => {
    let nextLayout = layout;
    for (const [side, value] of Object.entries(changes))
      nextLayout = selectGroupPaddingSide(
        nextLayout,
        viewport,
        side as "top" | "right" | "bottom" | "left",
        value!,
      );
    onChange({
      ...group,
      layout: nextLayout,
    });
  };

  return (
    <div className="space-y-5" data-group-element-editor>
      <InspectorSection title="Size & spacing">
        <Field label="Width">
          <Select
            value={effective.width ?? "full"}
            options={options(GROUP_WIDTHS)}
            onChange={(width) =>
              set("width", width ? (width as GroupLayout["width"]) : undefined)
            }
          />
        </Field>
        <Field label="Outer spacing">
          <InnerSpacingControl
            kind="Outer"
            spacing={effectiveOuterSpacing}
            onChange={updateOuterSpacing}
          />
        </Field>
        <Field label="Inner spacing">
          <InnerSpacingControl
            spacing={effective.padding}
            onChange={updatePadding}
          />
        </Field>
      </InspectorSection>
      <InspectorSection title="Layout">
        <CompactField
          label="Direction"
          value={effective.direction ?? "vertical"}
          options={GROUP_DIRECTIONS.map((value) => ({
            value,
            label: label(value),
            content: label(value),
          }))}
          onChange={(value) =>
            set(
              "direction",
              value ? (value as GroupLayout["direction"]) : undefined,
            )
          }
        />
        <Field label="Content position">
          <ContentPositionControl
            value={
              (effective.contentPosition ?? "center") as HeroContentPosition
            }
            onChange={(contentPosition) =>
              set("contentPosition", contentPosition)
            }
          />
        </Field>
        <CompactField
          label="Child alignment"
          value={effective.alignment ?? "stretch"}
          options={GROUP_ALIGNMENTS.map((value) => ({
            value,
            label: label(value),
            content: label(value),
          }))}
          onChange={(value) =>
            set(
              "alignment",
              value ? (value as GroupLayout["alignment"]) : undefined,
            )
          }
        />
        <CompactField
          label="Gap"
          value={effective.gap ?? "none"}
          options={GROUP_GAPS.map((value) => ({
            value,
            label: label(value),
            content: value === "none" ? "None" : value.toUpperCase(),
          }))}
          onChange={(value) =>
            set("gap", value ? (value as GroupLayout["gap"]) : undefined)
          }
        />
        {effectiveDirection === "horizontal" && (
          <VisualField
            label="Division"
            value={effective.division ?? "50-50"}
            columns={2}
            options={[
              ...GROUP_DIVISIONS.map((value) => ({
                value,
                label: label(value),
                illustration: <ColumnsDiagram value={value} />,
                ariaLabel: `${label(value)} division`,
              })),
            ]}
            onChange={(value) =>
              set(
                "division",
                value ? (value as GroupLayout["division"]) : undefined,
              )
            }
          />
        )}
      </InspectorSection>
      <InspectorSection title="Appearance">
        <Field label="Shadow">
          <Select
            value={group.appearance?.shadow ?? "none"}
            options={options(GROUP_SHADOWS)}
            onChange={(shadow) =>
              onChange(
                setGroupShadow(
                  group,
                  shadow as NonNullable<
                    CompositionGroup["appearance"]
                  >["shadow"],
                ),
              )
            }
          />
        </Field>
      </InspectorSection>
      {onMediaResolved && (
        <InspectorSection title="Background Image">
          <BackgroundMediaEditor
            title="Background Image"
            ownerId={group.id}
            viewport={viewport}
            media={group.backgroundMedia}
            resolvedMedia={resolvedMedia}
            onMediaResolved={onMediaResolved}
            onChange={(backgroundMedia) =>
              onChange(setGroupBackgroundMedia(group, backgroundMedia))
            }
          />
          {group.backgroundMedia && (
            <Field label="Image Opacity">
              <div className="flex items-center gap-3">
                <input
                  aria-label="Group background image opacity"
                  className="w-full accent-accent"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={group.appearance?.backgroundImageOpacity ?? 100}
                  onChange={(event) =>
                    onChange(
                      setGroupBackgroundImageOpacity(
                        group,
                        Number(event.target.value),
                      ),
                    )
                  }
                />
                <span className="w-10 text-right tabular-nums">
                  {group.appearance?.backgroundImageOpacity ?? 100}%
                </span>
              </div>
            </Field>
          )}
        </InspectorSection>
      )}
      {templateKey && capability && library && onAddColor && (
        <InspectorSection title="Background">
          <div>
            <p className="mb-1.5 text-xs font-medium">Background Color</p>
            <WebsiteColorSwatchControl
              key={group.id}
              previewTarget={`${group.id}:backgroundColor`}
              label="Group background color"
              inheritLabel="No Background"
              colorId={group.appearance?.backgroundColorId}
              allowedTemplateColorIds={capability.backgroundColorIds}
              templateColors={library.colors}
              projectColors={projectColors}
              onChange={(colorId) =>
                onChange(setGroupBackgroundColor(group, colorId))
              }
              onAddColor={onAddColor}
            />
          </div>
          {(["texture", "pattern"] as const).map((kind) => {
            const background =
              group.appearance?.decorativeAppearance?.background;
            const value = background?.[kind] ?? "";
            const strengthField =
              kind === "texture" ? "textureStrength" : "patternStrength";
            const strength = background?.[strengthField];
            const decorationOptions =
              capability[kind === "texture" ? "textures" : "patterns"];
            return (
              <div key={kind} className="space-y-3">
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="text-xs font-medium">
                      {decorativeLabel(kind)}
                    </p>
                    {background?.[kind] !== undefined && (
                      <InspectorResetAction
                        onClick={() =>
                          onChange(setGroupDecoration(group, kind))
                        }
                      />
                    )}
                  </div>
                  <InspectorVisualChoiceGroup
                    label={`Group ${kind}`}
                    layout="stack"
                    showIllustration={false}
                    value={value}
                    options={decorationOptions.map((option) => ({
                      value: option,
                      label: decorativeLabel(option),
                      helper: decorativeHelpers[kind][option],
                      illustration: null,
                    }))}
                    onChange={(next) =>
                      onChange(setGroupDecoration(group, kind, next))
                    }
                  />
                </div>
                {value && value !== "none" && (
                  <DecorativeStrengthControl
                    label={
                      kind === "texture"
                        ? "Texture Strength"
                        : "Pattern Strength"
                    }
                    value={strength}
                    defaultValue={resolveDecorativeDefaultStrength(
                      templateKey,
                      kind,
                      value,
                    )}
                    onChange={(next) =>
                      onChange(setGroupDecoration(group, strengthField, next))
                    }
                  />
                )}
              </div>
            );
          })}
        </InspectorSection>
      )}
      <Button type="button" variant="ghost" size="sm" onClick={onUngroup}>
        Ungroup
      </Button>
    </div>
  );
}

function Field({
  label: fieldLabel,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5 text-xs font-medium">
      <div>{fieldLabel}</div>
      {children}
    </div>
  );
}

function VisualField({
  label: fieldLabel,
  value,
  options: fieldOptions,
  onChange,
  columns,
  layout,
}: {
  label: string;
  value: string;
  options: InspectorVisualChoiceOption<string>[];
  onChange: (value: string) => void;
  columns?: 2 | 3;
  layout?: "grid" | "inline";
}) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium">{fieldLabel}</div>
      <InspectorVisualChoiceGroup
        label={fieldLabel}
        value={value}
        options={fieldOptions}
        onChange={onChange}
        columns={columns}
        layout={layout}
      />
    </div>
  );
}

function CompactField({
  label: fieldLabel,
  value,
  options: fieldOptions,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string; content: React.ReactNode }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="text-xs font-medium">
      <div className="mb-1.5">{fieldLabel}</div>
      <div
        role="group"
        aria-label={fieldLabel}
        className="flex flex-wrap gap-2"
      >
        {fieldOptions.map((option) => (
          <button
            key={option.value || "default"}
            type="button"
            aria-label={option.label}
            title={option.label}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={`grid min-h-10 min-w-10 place-items-center rounded-sm border px-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/40 ${value === option.value ? "border-accent bg-accent text-accent-foreground" : "border-border bg-background text-foreground-muted hover:bg-surface-muted"}`}
          >
            {option.content}
          </button>
        ))}
      </div>
    </div>
  );
}

export function InnerSpacingDiagram({
  padding,
  onCycle,
  subject = "Group",
}: {
  padding: GroupLayout["padding"];
  onCycle: (side: "top" | "right" | "bottom" | "left", value: string) => void;
  subject?: string;
}) {
  type Side = "top" | "right" | "bottom" | "left";
  const values = [...GROUP_GAPS];
  const current = (side: Side) => padding?.[side] ?? "none";
  const display = (side: Side) => label(current(side));
  const cycle = (side: Side) => {
    const index = values.indexOf(current(side));
    onCycle(side, values[(index + 1) % values.length]);
  };
  const control = (side: Side, className: string) => (
    <button
      type="button"
      className={`flex items-center justify-center rounded-sm border border-border bg-surface text-[10px] font-semibold uppercase tracking-wide text-foreground-muted outline-none transition-colors hover:border-accent/50 hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-accent/40 ${className}`}
      aria-label={`${label(side)} inner spacing: ${display(side)}. Click to use next value.`}
      title={`${label(side)}: ${display(side)} · Click to cycle`}
      onClick={() => cycle(side)}
    >
      <span>
        <span className="block">{label(side)}</span>
        <span className="block text-[9px] font-normal normal-case tracking-normal opacity-75">
          {display(side)}
        </span>
      </span>
    </button>
  );
  return (
    <div
      className="grid grid-cols-[4.5rem_minmax(7rem,1fr)_4.5rem] grid-rows-[3rem_6rem_3rem] gap-2"
      aria-label="Inner spacing sides"
    >
      {control("top", "col-start-2 row-start-1")}
      {control("left", "col-start-1 row-start-2")}
      <div className="col-start-2 row-start-2 grid place-items-center rounded-sm border-2 border-foreground-muted/45 bg-foreground-muted/10 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground-muted">
        {subject}
      </div>
      {control("right", "col-start-3 row-start-2")}
      {control("bottom", "col-start-2 row-start-3")}
    </div>
  );
}

function ColumnsDiagram({ value }: { value: string }) {
  const widths =
    value === "40-60"
      ? [2, 3]
      : value === "60-40"
        ? [3, 2]
        : value === "thirds"
          ? [1, 1, 1]
          : [1, 1];
  return (
    <span className="flex h-full items-center gap-1">
      {widths.map((width, index) => (
        <span
          key={index}
          className="h-7 rounded-[2px] bg-foreground-muted/40"
          style={{ flex: width }}
        />
      ))}
    </span>
  );
}
