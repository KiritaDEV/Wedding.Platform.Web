import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  Link2,
  Unlink2,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { IconButton } from "../../../components/ui/IconButton";
import { Select } from "../../../components/ui/Select";
import { Tooltip } from "../../../components/ui/Tooltip";
import { SelectableCard } from "../../../components/ui/SelectableCard";
import type {
  DesignOption,
  MediaSpacing,
  MediaSpacingValue,
  WebsiteSectionAppearance,
  ResponsiveViewport,
  WebsiteSectionResponsiveAppearance,
} from "../types";
import {
  controlCapability,
  controlDefault,
  controlForViewport,
  optionValues,
  presentationCapability,
  supportsControl,
} from "../../websiteCapabilities/lookup";
import type {
  AppearanceControlCapability,
  PresentationCapability,
  SectionCapability,
} from "../../websiteCapabilities/types";
import {
  canonicalizeResponsiveAppearance,
  pruneResponsiveAppearance,
  resolveSectionAppearanceForViewport,
} from "../responsiveAppearance";
import { PresentationPicker } from "./PresentationPicker";
import { InspectorResetAction, InspectorSection } from "./InspectorPrimitives";
import {
  resolveDecorativeDefaultStrength,
  resolveFrameDefaults,
} from "../../websiteRenderer/templateDecorativeAssets";
import type { ProjectColor } from "../../websiteColors/projectColors";
import type { TemplateDesignLibrary } from "../../websiteCapabilities/types";
import { WebsiteColorSwatchControl } from "./WebsiteColorSwatchControl";
import { NumericPercentageControl } from "./NumericPercentageControl";
import { applyFrameProperty } from "../frameAppearanceAuthoring";
import { DecorativeStrengthControl } from "./DecorativeStrengthControl";
import { decorativeLabel } from "./decorativeAppearanceOptions";
import {
  applySectionBackgroundColor,
  legacySectionBackgroundState,
} from "../sectionBackgroundAuthoring";
import {
  resolveHeroContentPosition,
  type HeroContentPosition,
} from "../../websiteRenderer/heroContentPosition";
import {
  resolveInnerSpacing,
  type InnerSpacing,
} from "../../websiteElements/group";
import { FourSidedSpacingControl as InnerSpacingControl } from "./FourSidedSpacingControl";
import type { SpacingChanges } from "./spacingControlModel";
import { ContentPositionControl } from "./ContentPositionControl";
import { HERO_MINIMUM_HEIGHT_MAX, HERO_MINIMUM_HEIGHT_MIN, HERO_MINIMUM_HEIGHT_STEP, setHeroHeightMode, setHeroMinimumHeight } from "../heroMinimumHeight";

export function AppearancePanel({
  appearance,
  templateKey,
  sectionCapability,
  targetViewport,
  error,
  library,
  projectColors,
  onAddColor,
  onChange,
}: {
  appearance: WebsiteSectionAppearance;
  templateKey: string;
  sectionCapability: SectionCapability;
  targetViewport: ResponsiveViewport;
  error: string | null;
  library: TemplateDesignLibrary;
  projectColors: ProjectColor[];
  onAddColor: (value: string) => Promise<ProjectColor>;
  onChange: (appearance: WebsiteSectionAppearance) => void;
}) {
  const presentation =
    appearance.presentation ??
    sectionCapability.defaultPresentation ??
    undefined;
  const activePresentation = presentationCapability(
    sectionCapability,
    presentation,
  );
  const effectiveAppearance = resolveSectionAppearanceForViewport(
    appearance,
    targetViewport,
    sectionCapability,
  );
  const activeOverride =
    targetViewport === "desktop"
      ? undefined
      : appearance.responsive?.[targetViewport];
  const setResponsiveValue = (
    setting: keyof WebsiteSectionResponsiveAppearance,
    value: WebsiteSectionResponsiveAppearance[keyof WebsiteSectionResponsiveAppearance],
  ) => {
    if (targetViewport === "desktop")
      return onChange({ ...appearance, [setting]: value });
    const responsive = { ...appearance.responsive };
    const override = { ...responsive[targetViewport] };
    Object.assign(override, { [setting]: value });
    if (Object.keys(override).length > 0) responsive[targetViewport] = override;
    else delete responsive[targetViewport];
    onChange(
      canonicalizeResponsiveAppearance(
        { ...appearance, responsive },
        sectionCapability,
      ),
    );
  };
  const resetResponsive = () => {
    if (targetViewport === "desktop") return;
    const responsive = { ...appearance.responsive };
    delete responsive[targetViewport];
    onChange(pruneResponsiveAppearance({ ...appearance, responsive }));
  };
  if (sectionCapability.id === "blank" || sectionCapability.id === "hero") {
    return (
      <div className="space-y-5">
        {error && (
          <p
            className="rounded-xl bg-danger-muted p-3 text-sm text-danger"
            role="alert"
          >
            {error}
          </p>
        )}
        {sectionCapability.id === "hero" && (
          <HeroSurfaceControls
            appearance={appearance}
            targetViewport={targetViewport}
            onChange={onChange}
          />
        )}
        {sectionCapability.id === "blank" && (
          <BlankInnerSpacingControls
            appearance={appearance}
            targetViewport={targetViewport}
            onChange={onChange}
          />
        )}
        <SectionDecorativeAppearanceControls
          sectionLabel={sectionCapability.id === "hero" ? "Hero" : "Section"}
          templateKey={templateKey}
          sectionCapability={sectionCapability}
          appearance={appearance}
          library={library}
          projectColors={projectColors}
          onAddColor={onAddColor}
          onChange={onChange}
        />
      </div>
    );
  }
  return (
    <div className="space-y-5">
      {error && (
        <p
          className="rounded-xl bg-danger-muted p-3 text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      )}
      {targetViewport !== "desktop" && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-muted p-3">
          <div>
            <p className="text-sm font-semibold">
              Editing {targetViewport} layout
            </p>
            <p className="text-xs text-foreground-muted">
              {activeOverride
                ? "Custom overrides are active."
                : "Using Template defaults."}
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            type="button"
            disabled={!activeOverride}
            onClick={resetResponsive}
          >
            Restore {targetViewport} defaults
          </Button>
        </div>
      )}
      {sectionCapability.defaultPresentation && (
        <InspectorSection title="Layout">
          {supportsControl(sectionCapability, "presentation", presentation) && (
            <PresentationPicker
              capability={sectionCapability}
              value={
                appearance.presentation ??
                sectionCapability.defaultPresentation ??
                ""
              }
              onChange={(presentation) => {
                const controls =
                  presentationCapability(sectionCapability, presentation)
                    ?.appearanceControls ?? [];
                const next: WebsiteSectionAppearance = {
                  ...appearance,
                  presentation,
                };
                for (const key of [
                  "mediaPlacement",
                  "mediaSize",
                  "cornerStyle",
                  "shadowStyle",
                  "overlayStrength",
                  "foregroundColor",
                  "mediaSpacing",
                  "mediaContentGap",
                ] as const)
                  delete next[key];
                for (const control of controls)
                  Object.assign(next, {
                    [control.id]:
                      control.type === "spacing"
                        ? { ...control.default }
                        : control.default,
                  });
                onChange(
                  canonicalizeResponsiveAppearance(next, sectionCapability),
                );
              }}
            />
          )}
          <MediaStyleControls
            key={
              appearance.presentation ?? sectionCapability.defaultPresentation
            }
            sectionCapability={sectionCapability}
            presentation={activePresentation}
            appearance={effectiveAppearance}
            baseAppearance={appearance}
            targetViewport={targetViewport}
            activeOverride={activeOverride}
            onResponsiveChange={setResponsiveValue}
            onChange={onChange}
          />
        </InspectorSection>
      )}
      <InspectorSection title="Alignment">
        {(() => {
          const control = controlForViewport(
            controlCapability(
              sectionCapability,
              "headingAlignment",
              presentation,
            ),
            targetViewport,
          );
          if (control?.type !== "option") return null;
          return (
            <fieldset>
              <legend className="mb-2 flex items-center gap-2 text-sm font-semibold">
                Heading alignment{" "}
                {targetViewport !== "desktop" && (
                  <span className="text-[10px] font-medium uppercase tracking-wide text-foreground-muted">
                    {activeOverride?.headingAlignment === undefined
                      ? "Template default"
                      : "Override"}
                  </span>
                )}
              </legend>
              <OptionGrid
                options={control.options}
                value={effectiveAppearance.headingAlignment}
                onSelect={(headingAlignment) =>
                  setResponsiveValue("headingAlignment", headingAlignment)
                }
                alignment
              />
            </fieldset>
          );
        })()}
        {(() => {
          const control = controlForViewport(
            controlCapability(sectionCapability, "bodyAlignment", presentation),
            targetViewport,
          );
          if (control?.type !== "option") return null;
          return (
            <fieldset>
              <legend className="mb-2 flex items-center gap-2 text-sm font-semibold">
                Content alignment{" "}
                {targetViewport !== "desktop" && (
                  <span className="text-[10px] font-medium uppercase tracking-wide text-foreground-muted">
                    {activeOverride?.bodyAlignment === undefined
                      ? "Template default"
                      : "Override"}
                  </span>
                )}
              </legend>
              <OptionGrid
                options={control.options}
                value={effectiveAppearance.bodyAlignment}
                onSelect={(bodyAlignment) =>
                  setResponsiveValue("bodyAlignment", bodyAlignment)
                }
                alignment
              />
            </fieldset>
          );
        })()}
      </InspectorSection>
      <SectionAppearanceControls
        sectionCapability={sectionCapability}
        presentation={presentation}
        appearance={appearance}
        onChange={onChange}
      />
      <SectionDecorativeAppearanceControls
        sectionLabel="Section"
        templateKey={templateKey}
        sectionCapability={sectionCapability}
        appearance={appearance}
        library={library}
        projectColors={projectColors}
        onAddColor={onAddColor}
        onChange={onChange}
      />
    </div>
  );
}

function BlankInnerSpacingControls({
  appearance,
  onChange,
}: {
  appearance: WebsiteSectionAppearance;
  targetViewport: ResponsiveViewport;
  onChange: (appearance: WebsiteSectionAppearance) => void;
}) {
  const effectiveSpacing = resolveInnerSpacing(
    appearance.innerSpacing,
    undefined,
  );
  const setSpacing = (changes: SpacingChanges) => {
    const next = structuredClone(appearance);
    const owner = next;
    const innerSpacing = { ...owner.innerSpacing };
    for (const [side, value] of Object.entries(changes)) {
      if (value === "none") delete innerSpacing[side as keyof InnerSpacing];
      else innerSpacing[side as keyof InnerSpacing] = value!;
    }
    if (Object.keys(innerSpacing).length) owner.innerSpacing = innerSpacing;
    else delete owner.innerSpacing;
    onChange(pruneResponsiveAppearance(next));
  };
  return (
    <InspectorSection title="Layout">
      <fieldset>
        <legend className="mb-2 text-sm xl:text-xs! font-semibold">
          Inner spacing
        </legend>
        <InnerSpacingControl spacing={effectiveSpacing} onChange={setSpacing} />
      </fieldset>
    </InspectorSection>
  );
}

function HeroSurfaceControls({
  appearance,
  targetViewport,
  onChange,
}: {
  appearance: WebsiteSectionAppearance;
  targetViewport: ResponsiveViewport;
  onChange: (appearance: WebsiteSectionAppearance) => void;
}) {
  const heightMode = appearance.height ? "custom" : "automatic";
  const setHeightMode = (mode: "automatic" | "custom") => onChange(setHeroHeightMode(appearance, mode));
  const setHeightValue = (value: number) => onChange(setHeroMinimumHeight(appearance, value));
  const setOpacity = (value: number) => {
    const next = { ...appearance };
    if (value === 100) delete next.backgroundImageOpacity;
    else next.backgroundImageOpacity = value;
    onChange(next);
  };
  const effectivePosition = resolveHeroContentPosition(
    appearance,
    targetViewport,
  );
  const activePosition =
    targetViewport === "desktop"
      ? appearance.contentPosition
      : appearance.responsive?.[targetViewport]?.contentPosition;
  const setPosition = (contentPosition: HeroContentPosition) => {
    if (targetViewport === "desktop") {
      const next = { ...appearance };
      if (contentPosition === "center") delete next.contentPosition;
      else next.contentPosition = contentPosition;
      return onChange(next);
    }
    const responsive = { ...appearance.responsive };
    const override = { ...responsive[targetViewport] };
    if (contentPosition === (appearance.contentPosition ?? "center"))
      delete override.contentPosition;
    else override.contentPosition = contentPosition;
    if (Object.keys(override).length) responsive[targetViewport] = override;
    else delete responsive[targetViewport];
    onChange(pruneResponsiveAppearance({ ...appearance, responsive }));
  };
  const resetPosition = () => {
    if (targetViewport === "desktop") return setPosition("center");
    const responsive = { ...appearance.responsive };
    const override = { ...responsive[targetViewport] };
    delete override.contentPosition;
    if (Object.keys(override).length) responsive[targetViewport] = override;
    else delete responsive[targetViewport];
    onChange(pruneResponsiveAppearance({ ...appearance, responsive }));
  };
  const effectiveSpacing = resolveInnerSpacing(
    appearance.innerSpacing,
    undefined,
  );
  return (
    <InspectorSection title="Hero">
      <fieldset>
        <legend className="mb-2 text-sm xl:text-xs! font-semibold">
          Minimum height
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {(["automatic", "custom"] as const).map((value) => (
            <Button
              key={value}
              size="sm"
              variant="secondary"
              type="button"
              aria-pressed={heightMode === value}
              className={
                heightMode === value
                  ? "border-accent! border-2 bg-surface-muted"
                  : ""
              }
              onClick={() => setHeightMode(value)}
            >
              {value === "automatic" ? "Automatic" : "Custom"}
            </Button>
          ))}
        </div>
        {appearance.height ? <div className="mt-3">
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs font-medium" htmlFor="hero-minimum-height">Minimum</label>
            <span className="text-xs tabular-nums text-foreground-muted">{appearance.height.value}svh</span>
          </div>
          <input id="hero-minimum-height" aria-label="Hero minimum height" className="mt-2 w-full cursor-pointer accent-accent" type="range" min={HERO_MINIMUM_HEIGHT_MIN} max={HERO_MINIMUM_HEIGHT_MAX} step={HERO_MINIMUM_HEIGHT_STEP} value={appearance.height.value} onChange={(event) => setHeightValue(Number(event.target.value))} />
          <div className="mt-1 flex items-center justify-between gap-2 text-xs text-foreground-muted">
            <span>25svh</span>
            <Button type="button" size="sm" variant="ghost" onClick={() => setHeightValue(100)}>100svh · Full screen</Button>
            <span>150svh</span>
          </div>
          <p className="mt-2 text-xs text-foreground-muted">The Hero grows if its content needs more space.</p>
        </div> : <p className="mt-2 text-xs text-foreground-muted">Height follows the Hero content.</p>}
      </fieldset>
      <fieldset>
        <div className="mb-2 flex items-center justify-between gap-2">
          <legend className="text-sm xl:text-xs! font-semibold">
            Content position
          </legend>
          {activePosition !== undefined && (
            <InspectorResetAction onClick={resetPosition} />
          )}
        </div>
        <ContentPositionControl
          value={effectivePosition}
          onChange={setPosition}
        />
        {targetViewport !== "desktop" && (
          <p className="mt-2 text-xs text-foreground-muted">
            {activePosition === undefined
              ? "Using Desktop position"
              : `${targetViewport[0].toUpperCase() + targetViewport.slice(1)} override`}
          </p>
        )}
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Inner spacing</legend>
        <InnerSpacingControl
          spacing={effectiveSpacing}
          onChange={(changes) => {
            const next = structuredClone(appearance);
            const owner = next;
            const innerSpacing = { ...owner.innerSpacing };
            for (const [side, value] of Object.entries(changes)) {
              if (value === "none")
                delete innerSpacing[side as keyof InnerSpacing];
              else innerSpacing[side as keyof InnerSpacing] = value!;
            }
            if (Object.keys(innerSpacing).length)
              owner.innerSpacing = innerSpacing;
            else delete owner.innerSpacing;
            onChange(pruneResponsiveAppearance(next));
          }}
        />
      </fieldset>
      <fieldset>
        <div className="flex items-center justify-between gap-3">
          <legend className="text-sm font-semibold">Image opacity</legend>
          <span className="text-xs tabular-nums text-foreground-muted">
            {appearance.backgroundImageOpacity ?? 100}%
          </span>
        </div>
        <input
          className="mt-2 w-full cursor-pointer accent-accent"
          type="range"
          aria-label="Background image opacity"
          min={0}
          max={100}
          step={5}
          value={appearance.backgroundImageOpacity ?? 100}
          onChange={(event) => setOpacity(Number(event.target.value))}
        />
      </fieldset>
    </InspectorSection>
  );
}

export function SectionDecorativeAppearanceControls({
  sectionLabel,
  templateKey,
  sectionCapability,
  appearance,
  library,
  projectColors,
  onAddColor,
  onChange,
}: {
  sectionLabel: string;
  templateKey: string;
  sectionCapability: SectionCapability;
  appearance: WebsiteSectionAppearance;
  library: TemplateDesignLibrary;
  projectColors: ProjectColor[];
  onAddColor: (value: string) => Promise<ProjectColor>;
  onChange: (appearance: WebsiteSectionAppearance) => void;
}) {
  const decorative = sectionCapability.decorativeAppearance;
  if (!decorative) return null;
  const label = decorativeLabel;
  const updateDecoration = (
    group: "background" | "frame",
    field: "texture" | "pattern" | "overlay" | "style",
    value?: string,
  ) => {
    const next = structuredClone(appearance);
    const decorativeAppearance = { ...next.decorativeAppearance };
    const current = { ...(decorativeAppearance[group] ?? {}) };
    if (value === undefined) delete current[field as keyof typeof current];
    else Object.assign(current, { [field]: value });
    if (Object.keys(current).length)
      Object.assign(decorativeAppearance, { [group]: current });
    else delete decorativeAppearance[group];
    if (Object.keys(decorativeAppearance).length)
      next.decorativeAppearance = decorativeAppearance;
    else delete next.decorativeAppearance;
    onChange(next);
  };
  const choice = (
    title: string,
    group: "background" | "frame",
    field: "texture" | "pattern" | "overlay" | "style",
    values: readonly string[],
  ) => {
    if (values.length === 0) return null;
    const value =
      group === "background"
        ? appearance.decorativeAppearance?.background?.[
            field as "texture" | "pattern" | "overlay"
          ]
        : appearance.decorativeAppearance?.frame?.style;
    return (
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-xs font-medium">{title}</p>
          {value !== undefined && (
            <InspectorResetAction
              onClick={() => updateDecoration(group, field)}
            />
          )}
        </div>
        <Select
          aria-label={`${sectionLabel} ${title.toLowerCase()}`}
          value={value ?? values[0] ?? ""}
          options={values.map((option) => ({
            value: option,
            label: label(option),
          }))}
          onChange={(next) => updateDecoration(group, field, next)}
        />
      </div>
    );
  };
  const updateStrength = (
    field: "textureStrength" | "patternStrength",
    value?: number,
  ) => {
    const next = structuredClone(appearance);
    const decorativeAppearance = { ...next.decorativeAppearance };
    const background = { ...(decorativeAppearance.background ?? {}) };
    if (value === undefined) delete background[field];
    else
      background[field] = Math.min(
        100,
        Math.max(10, Math.round(value / 5) * 5),
      );
    if (Object.keys(background).length)
      decorativeAppearance.background = background;
    else delete decorativeAppearance.background;
    if (Object.keys(decorativeAppearance).length)
      next.decorativeAppearance = decorativeAppearance;
    else delete next.decorativeAppearance;
    onChange(next);
  };
  const updateFrameProperty = (
    field: "size" | "strength" | "colorId",
    value?: number | string,
  ) => {
    onChange(applyFrameProperty(appearance, field, value));
  };
  const texture =
    appearance.decorativeAppearance?.background?.texture ?? "none";
  const pattern =
    appearance.decorativeAppearance?.background?.pattern ?? "none";
  const frameStyle = appearance.decorativeAppearance?.frame?.style ?? "none";
  const frameDefaults = resolveFrameDefaults(templateKey, frameStyle);
  const backgroundColorId =
    appearance.decorativeAppearance?.background?.colorId;
  const legacyBackground = legacySectionBackgroundState(appearance);
  const updateBackgroundColor = (colorId?: string) => {
    onChange(applySectionBackgroundColor(appearance, colorId));
  };
  return (
    <div className="space-y-5">
      <InspectorSection title="Background">
        <div>
          <p className="mb-1.5 text-xs font-medium">Background Color</p>
          <WebsiteColorSwatchControl
            label={`${sectionLabel} background color`}
            inheritLabel={
              sectionLabel === "Section" ? "No surface color" : "Use Template"
            }
            colorId={backgroundColorId}
            inheritSelected={appearance.backgroundTreatment === "inherit"}
            showUnresolvedWarning={!legacyBackground}
            allowedTemplateColorIds={decorative.backgroundColorIds}
            templateColors={library.colors}
            projectColors={projectColors}
            onChange={updateBackgroundColor}
            onAddColor={onAddColor}
          />
          {legacyBackground && (
            <div
              className="mt-2 flex items-center gap-2 rounded-md border border-border bg-surface-muted px-2.5 py-2 text-xs text-foreground-muted"
              role="status"
            >
              <span
                className="size-5 shrink-0 rounded-full border border-border bg-surface"
                style={
                  legacyBackground.color
                    ? { backgroundColor: legacyBackground.color }
                    : undefined
                }
                aria-hidden="true"
              />
              <span>
                <span className="font-medium text-foreground">
                  Current saved background
                </span>
                <span className="ml-1.5">{legacyBackground.label}</span>
              </span>
            </div>
          )}
        </div>
        {decorative &&
          choice("Texture", "background", "texture", decorative.textures)}
        {decorative && texture !== "none" && (
          <DecorativeStrengthControl
            label="Texture Strength"
            value={appearance.decorativeAppearance?.background?.textureStrength}
            defaultValue={resolveDecorativeDefaultStrength(
              templateKey,
              "texture",
              texture,
            )}
            onChange={(value) => updateStrength("textureStrength", value)}
          />
        )}
        {decorative &&
          choice("Pattern", "background", "pattern", decorative.patterns)}
        {decorative && pattern !== "none" && (
          <DecorativeStrengthControl
            label="Pattern Strength"
            value={appearance.decorativeAppearance?.background?.patternStrength}
            defaultValue={resolveDecorativeDefaultStrength(
              templateKey,
              "pattern",
              pattern,
            )}
            onChange={(value) => updateStrength("patternStrength", value)}
          />
        )}
        {decorative &&
          choice("Overlay", "background", "overlay", decorative.overlays)}
      </InspectorSection>
      {decorative && decorative.frames.length > 0 && (
        <InspectorSection title="Decoration">
          {choice("Frame", "frame", "style", decorative.frames)}
          {frameStyle !== "none" && (
            <>
              <NumericPercentageControl
                label="Frame Size"
                subject="frame size"
                value={appearance.decorativeAppearance?.frame?.size}
                defaultValue={frameDefaults.size}
                minimum={50}
                maximum={200}
                step={5}
                defaultLabel="Theme"
                onChange={(value) => updateFrameProperty("size", value)}
              />
              <NumericPercentageControl
                label="Frame Strength"
                subject="frame strength"
                value={appearance.decorativeAppearance?.frame?.strength}
                defaultValue={frameDefaults.strength}
                minimum={0}
                maximum={100}
                step={5}
                defaultLabel="Theme"
                onChange={(value) => updateFrameProperty("strength", value)}
              />
              <div>
                <p className="mb-1.5 text-xs font-medium">Frame Color</p>
                <WebsiteColorSwatchControl
                  previewTarget="frameColor"
                  label={`${sectionLabel} frame color`}
                  colorId={appearance.decorativeAppearance?.frame?.colorId}
                  inheritLabel="Theme"
                  inheritColor={frameDefaults.tint}
                  allowedTemplateColorIds={decorative.frameColorIds}
                  templateColors={library.colors}
                  projectColors={projectColors}
                  onChange={(value) => updateFrameProperty("colorId", value)}
                  onAddColor={onAddColor}
                />
              </div>
            </>
          )}
        </InspectorSection>
      )}
    </div>
  );
}

function SectionAppearanceControls({
  sectionCapability,
  presentation,
  appearance,
  onChange,
}: {
  sectionCapability: SectionCapability;
  presentation: string | undefined;
  appearance: WebsiteSectionAppearance;
  onChange: (appearance: WebsiteSectionAppearance) => void;
}) {
  const background = controlCapability(
    sectionCapability,
    "backgroundTreatment",
    presentation,
  );
  const emphasis = controlCapability(
    sectionCapability,
    "emphasis",
    presentation,
  );
  if (background?.type !== "option" && emphasis?.type !== "option") return null;
  return (
    <InspectorSection title="Section">
      {background?.type === "option" && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Background</legend>
          <OptionGrid
            options={background.options}
            value={appearance.backgroundTreatment}
            onSelect={(backgroundTreatment) =>
              onChange({
                ...appearance,
                backgroundTreatment:
                  backgroundTreatment as WebsiteSectionAppearance["backgroundTreatment"],
              })
            }
          />
        </fieldset>
      )}
      {emphasis?.type === "option" && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Emphasis</legend>
          <OptionGrid
            options={emphasis.options}
            value={appearance.emphasis}
            onSelect={(emphasisValue) =>
              onChange({
                ...appearance,
                emphasis: emphasisValue as WebsiteSectionAppearance["emphasis"],
              })
            }
          />
        </fieldset>
      )}
    </InspectorSection>
  );
}

function MediaStyleControls({
  sectionCapability,
  presentation,
  appearance,
  baseAppearance,
  targetViewport,
  activeOverride,
  onResponsiveChange,
  onChange,
}: {
  sectionCapability: SectionCapability;
  presentation: PresentationCapability | undefined;
  appearance: WebsiteSectionAppearance;
  baseAppearance: WebsiteSectionAppearance;
  targetViewport: ResponsiveViewport;
  activeOverride?: WebsiteSectionResponsiveAppearance;
  onResponsiveChange: (
    setting: keyof WebsiteSectionResponsiveAppearance,
    value: WebsiteSectionResponsiveAppearance[keyof WebsiteSectionResponsiveAppearance],
  ) => void;
  onChange: (appearance: WebsiteSectionAppearance) => void;
}) {
  if (!presentation || presentation.appearanceControls.length === 0)
    return null;
  const capability = (id: AppearanceControlCapability["id"]) =>
    controlForViewport(
      controlCapability(sectionCapability, id, presentation.id),
      targetViewport,
    );
  const groups = [
    ["Media placement", "mediaPlacement", capability("mediaPlacement")],
    ["Media size", "mediaSize", capability("mediaSize")],
    ["Corners", "cornerStyle", capability("cornerStyle")],
    ["Shadow", "shadowStyle", capability("shadowStyle")],
  ] as const;
  return (
    <div className="space-y-4 border-y border-border py-4">
      {groups.map(
        ([label, setting, control]) =>
          control?.type === "option" && (
            <fieldset key={setting}>
              <legend className="mb-2 flex items-center gap-2 text-sm font-semibold">
                {label}
                {control.scope === "responsive" &&
                  targetViewport !== "desktop" && (
                    <span className="text-[10px] font-medium uppercase tracking-wide text-foreground-muted">
                      {activeOverride?.[
                        setting as keyof WebsiteSectionResponsiveAppearance
                      ] === undefined
                        ? "Template default"
                        : "Override"}
                    </span>
                  )}
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {control.options.map((option) => {
                  const selected =
                    (appearance[setting] ?? control.default) === option.key;
                  const classicShadow =
                    setting === "shadowStyle" &&
                    control.options.some((item) => item.key === "elevated");
                  const modernShadow =
                    setting === "shadowStyle" &&
                    control.options.some((item) => item.key === "dramatic");
                  const change = () =>
                    control.scope === "responsive"
                      ? onResponsiveChange(
                          setting as keyof WebsiteSectionResponsiveAppearance,
                          option.key,
                        )
                      : onChange({ ...baseAppearance, [setting]: option.key });
                  return (
                    <Button
                      className={`justify-start ${selected ? "border-accent! border-2 bg-surface-muted" : ""}`}
                      key={option.key}
                      size="sm"
                      variant="secondary"
                      type="button"
                      aria-pressed={selected}
                      onClick={change}
                    >
                      {classicShadow && (
                        <ClassicShadowPreview shadow={option.key} />
                      )}
                      {modernShadow && (
                        <ModernShadowPreview shadow={option.key} />
                      )}
                      {option.displayName}
                    </Button>
                  );
                })}
              </div>
            </fieldset>
          ),
      )}
      {capability("mediaSpacing")?.type === "spacing" && (
        <MediaSpacingControl
          capability={
            capability("mediaSpacing") as Extract<
              AppearanceControlCapability,
              { type: "spacing" }
            >
          }
          appearance={appearance}
          inherited={
            targetViewport !== "desktop" &&
            activeOverride?.mediaSpacing === undefined
          }
          onChange={(spacing) => onResponsiveChange("mediaSpacing", spacing)}
        />
      )}
      {capability("mediaContentGap")?.type === "option" && (
        <fieldset>
          <legend className="mb-2 flex items-center gap-2 text-sm font-semibold">
            Gap between media and content
            {targetViewport !== "desktop" && (
              <span className="text-[10px] font-medium uppercase tracking-wide text-foreground-muted">
                {activeOverride?.mediaContentGap === undefined
                  ? "Template default"
                  : "Override"}
              </span>
            )}
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {optionValues(capability("mediaContentGap")).map((option) => {
              const selected =
                (appearance.mediaContentGap ??
                  controlDefault(capability("mediaContentGap"))) === option.key;
              return (
                <Button
                  className={
                    selected ? "border-accent! border-2 bg-surface-muted" : ""
                  }
                  key={option.key}
                  size="sm"
                  variant="secondary"
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    onResponsiveChange("mediaContentGap", option.key)
                  }
                >
                  {option.displayName}
                </Button>
              );
            })}
          </div>
        </fieldset>
      )}
      {(() => {
        const control = capability("overlayStrength");
        return (
          control?.type === "number" && (
            <fieldset>
              <div className="flex items-center justify-between gap-3">
                <legend className="text-sm font-semibold">
                  Overlay strength
                </legend>
                <span className="text-xs tabular-nums text-foreground-muted">
                  {Math.round(
                    (appearance.overlayStrength ?? control.default) * 100,
                  )}
                  %
                </span>
              </div>
              <input
                className="mt-2 w-full cursor-pointer accent-accent"
                type="range"
                aria-label="Overlay strength"
                min={control.minimum}
                max={control.maximum}
                step={control.step}
                value={baseAppearance.overlayStrength ?? control.default}
                onChange={(event) =>
                  onChange({
                    ...baseAppearance,
                    overlayStrength: Number(event.target.value),
                  })
                }
              />
            </fieldset>
          )
        );
      })()}
      {capability("foregroundColor")?.type === "option" && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Text color</legend>
          <div className="grid grid-cols-2 gap-2">
            {optionValues(capability("foregroundColor")).map((option) => {
              const selected =
                (baseAppearance.foregroundColor ??
                  controlDefault(capability("foregroundColor"))) === option.key;
              return (
                <Button
                  className={
                    selected ? "border-accent! border-2 bg-surface-muted" : ""
                  }
                  key={option.key}
                  size="sm"
                  variant="secondary"
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    onChange({ ...baseAppearance, foregroundColor: option.key })
                  }
                >
                  <span
                    className="size-4 rounded-full border border-border"
                    style={{ backgroundColor: option.key }}
                  />
                  {option.displayName}
                </Button>
              );
            })}
          </div>
        </fieldset>
      )}
    </div>
  );
}

function MediaSpacingControl({
  capability,
  appearance,
  inherited,
  onChange,
}: {
  capability: Extract<AppearanceControlCapability, { type: "spacing" }>;
  appearance: WebsiteSectionAppearance;
  inherited: boolean;
  onChange: (spacing: MediaSpacing) => void;
}) {
  const spacing = appearance.mediaSpacing ?? capability.default;
  const [linked, setLinked] = useState(
    () => new Set(Object.values(spacing)).size === 1,
  );
  const sides = ["top", "right", "bottom", "left"] as const;
  const update = (side: keyof MediaSpacing, value: string) => {
    const next = linked
      ? (Object.fromEntries(sides.map((item) => [item, value])) as MediaSpacing)
      : { ...spacing, [side]: value as MediaSpacingValue };
    onChange(next);
  };
  const toggleLinked = () => {
    if (linked) return setLinked(false);
    onChange(
      Object.fromEntries(
        sides.map((side) => [side, spacing.top]),
      ) as MediaSpacing,
    );
    setLinked(true);
  };

  return (
    <fieldset>
      <div className="mb-2 flex items-center justify-between gap-2">
        <legend className="flex items-center gap-2 text-sm font-semibold">
          Media spacing
          {inherited && (
            <span className="text-[10px] font-medium uppercase tracking-wide text-foreground-muted">
              Template default
            </span>
          )}
        </legend>
        <Tooltip label={linked ? "Unlink spacing sides" : "Link spacing sides"}>
          <IconButton
            size="sm"
            type="button"
            aria-label={linked ? "Unlink spacing sides" : "Link spacing sides"}
            aria-pressed={linked}
            onClick={toggleLinked}
          >
            {linked ? <Link2 size={15} /> : <Unlink2 size={15} />}
          </IconButton>
        </Tooltip>
      </div>
      <div className="grid grid-cols-[3.25rem_3.25rem_3.25rem] items-center justify-center gap-2 rounded-md border border-border bg-surface-muted p-3">
        <div className="col-start-2">
          <MediaSpacingSideControl
            side="top"
            value={spacing.top}
            options={capability.options}
            onChange={(value) => update("top", value)}
          />
        </div>
        <div className="col-start-1 row-start-2">
          <MediaSpacingSideControl
            side="left"
            value={spacing.left}
            options={capability.options}
            onChange={(value) => update("left", value)}
          />
        </div>
        <div className="col-start-2 row-start-2 grid h-16 place-items-center border border-dashed border-foreground-muted/50 bg-background text-[10px] font-semibold uppercase tracking-widest text-foreground-muted">
          Media
        </div>
        <div className="col-start-3 row-start-2">
          <MediaSpacingSideControl
            side="right"
            value={spacing.right}
            options={capability.options}
            onChange={(value) => update("right", value)}
          />
        </div>
        <div className="col-start-2 row-start-3">
          <MediaSpacingSideControl
            side="bottom"
            value={spacing.bottom}
            options={capability.options}
            onChange={(value) => update("bottom", value)}
          />
        </div>
      </div>
    </fieldset>
  );
}

function MediaSpacingSideControl({
  side,
  value,
  options,
  onChange,
}: {
  side: keyof MediaSpacing;
  value: MediaSpacingValue;
  options: DesignOption[];
  onChange: (value: MediaSpacingValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const sideLabel = side[0].toUpperCase() + side.slice(1);
  const selectedLabel =
    options.find((option) => option.key === value)?.displayName ?? value;

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div
      className="relative"
      ref={rootRef}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <button
        className="flex min-h-10 w-full cursor-pointer items-center justify-center rounded-md border border-border bg-background px-1.5 py-1 text-foreground transition-colors hover:border-foreground-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        type="button"
        aria-label={`${sideLabel} media spacing: ${selectedLabel}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((current) => !current)}
      >
        <MediaSpacingPreview side={side} value={value} />
      </button>
      {open && (
        <div
          className={`absolute z-40 mt-1 grid w-32 grid-cols-2 gap-1.5 rounded-md border border-border bg-surface p-2 shadow-[var(--shadow-dialog)] ${side === "right" ? "right-0" : side === "left" ? "left-0" : "left-1/2 -translate-x-1/2"}`}
          id={listboxId}
          role="listbox"
          aria-label={`${sideLabel} media spacing options`}
        >
          {options.map((option) => {
            const optionValue = option.key as MediaSpacingValue;
            const selected = optionValue === value;
            return (
              <SelectableCard
                className="flex h-12 items-center justify-center p-1.5"
                key={option.key}
                role="option"
                aria-label={`${sideLabel} media spacing: ${option.displayName}`}
                aria-selected={selected}
                selected={selected}
                onClick={() => onChange(optionValue)}
              >
                <MediaSpacingPreview side={side} value={optionValue} />
              </SelectableCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MediaSpacingPreview({
  side,
  value,
}: {
  side: keyof MediaSpacing;
  value: MediaSpacingValue;
}) {
  const mediaClass =
    side === "left"
      ? value === "none"
        ? "bottom-0 left-0 right-0 top-0"
        : value === "small"
          ? "bottom-0 left-1 right-0 top-0"
          : value === "medium"
            ? "bottom-0 left-2 right-0 top-0"
            : "bottom-0 left-3 right-0 top-0"
      : side === "right"
        ? value === "none"
          ? "bottom-0 left-0 right-0 top-0"
          : value === "small"
            ? "bottom-0 left-0 right-1 top-0"
            : value === "medium"
              ? "bottom-0 left-0 right-2 top-0"
              : "bottom-0 left-0 right-3 top-0"
        : side === "top"
          ? value === "none"
            ? "bottom-0 left-0 right-0 top-0"
            : value === "small"
              ? "bottom-0 left-0 right-0 top-1"
              : value === "medium"
                ? "bottom-0 left-0 right-0 top-2"
                : "bottom-0 left-0 right-0 top-3"
          : value === "none"
            ? "bottom-0 left-0 right-0 top-0"
            : value === "small"
              ? "bottom-1 left-0 right-0 top-0"
              : value === "medium"
                ? "bottom-2 left-0 right-0 top-0"
                : "bottom-3 left-0 right-0 top-0";
  return (
    <span
      className="relative block h-5 w-8 overflow-hidden rounded-[2px] border border-foreground-muted/40 bg-surface-muted"
      aria-hidden="true"
    >
      <span
        className={`absolute border border-accent/60 bg-accent/30 ${mediaClass}`}
      />
    </span>
  );
}

function ClassicShadowPreview({ shadow }: { shadow: string }) {
  const shadowClass =
    shadow === "subtle"
      ? "shadow-[0_1px_3px_rgb(44_31_23/25%)]"
      : shadow === "soft"
        ? "shadow-[0_4px_8px_-1px_rgb(44_31_23/32%)]"
        : shadow === "elevated"
          ? "shadow-[0_7px_12px_-2px_rgb(44_31_23/42%)]"
          : "";
  return (
    <span
      className="grid h-7 w-9 shrink-0 place-items-center"
      aria-hidden="true"
    >
      <span
        className={`h-4 w-6 rounded-[2px] border border-border bg-background ${shadowClass}`}
      />
    </span>
  );
}

function ModernShadowPreview({ shadow }: { shadow: string }) {
  const shadowClass =
    shadow === "subtle"
      ? "shadow-[0_2px_3px_-1px_rgb(15_23_42/30%)]"
      : shadow === "soft"
        ? "shadow-[0_5px_8px_-2px_rgb(15_23_42/38%)]"
        : shadow === "elevated"
          ? "shadow-[0_8px_13px_-3px_rgb(15_23_42/46%),0_2px_4px_-1px_rgb(15_23_42/30%)]"
          : "";
  return (
    <span
      className="grid h-7 w-9 shrink-0 place-items-center"
      aria-hidden="true"
    >
      <span
        className={`h-4 w-6 border border-foreground-muted/60 bg-background ${shadowClass}`}
      />
    </span>
  );
}

function OptionGrid({
  options,
  value,
  onSelect,
  alignment = false,
}: {
  options: DesignOption[];
  value: string;
  onSelect: (key: string) => void;
  alignment?: boolean;
}) {
  return (
    <div
      className={
        alignment
          ? "flex flex-wrap items-center gap-2"
          : "grid grid-cols-2 gap-2"
      }
    >
      {options.map((option) => {
        const selected = option.key === value;
        const Icon =
          option.key === "left"
            ? AlignLeft
            : option.key === "right"
              ? AlignRight
              : option.key === "center"
                ? AlignCenter
                : null;
        if (alignment && Icon) {
          const label = `Align ${option.key}`;
          return (
            <Tooltip key={option.key} label={label}>
              <IconButton
                className="border border-border border-2 aria-pressed:border-accent aria-pressed:bg-surface-muted aria-pressed:text-foreground xl:size-9!"
                size="md"
                type="button"
                aria-label={label}
                aria-pressed={selected}
                onClick={() => onSelect(option.key)}
              >
                <Icon size={16} aria-hidden="true" />
              </IconButton>
            </Tooltip>
          );
        }

        return (
          <Button
            className={`min-h-11 gap-1.5 px-3 py-2 font-normal! xl:min-h-9 xl:py-1.5 ${alignment ? "min-w-28" : "px-2"} ${selected ? "border-accent! border-2 bg-surface-muted" : ""}`}
            key={option.key}
            size="sm"
            variant="secondary"
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(option.key)}
          >
            <span>{option.displayName}</span>
            {selected && !alignment && (
              <Check size={13} className="text-accent" />
            )}
          </Button>
        );
      })}
    </div>
  );
}
