import { scopedColorPreviewTarget, useEditorColorPreview } from "../websiteEditor/colorPreview";
import { isElementRenderable } from "./elementRenderability";
import { useDecorativeSourceAvailability } from "./decorativeSourceAvailability";
import type { CSSProperties } from "react";
import type { ResolvedDesignContext, TemplateDesignLibrary } from "../websiteCapabilities/types";
import type { ProjectColor } from "../websiteColors/projectColors";
import { GROUP_DIVISION_TEMPLATES, INNER_SPACING_CSS, resolveGroupLayout } from "../websiteElements/group";
import type { CompositionGroup } from "../websiteElements/types";
import type { ResponsiveViewport } from "../websiteEditor/types";
import { WebsiteElementFrame } from "./WebsiteElementFrame";
import { WebsiteLeafElementRenderer } from "./WebsiteLeafElementRenderer";
import { DecorativeBackgroundLayers } from "./DecorativeBackgroundLayers";
import { resolveContainerBackgroundColor } from "./containerBackground";
import { elementInlineAlignmentOverride, resetElementInlineAlignment } from "./elementInlineAlignment";
import { BackgroundMediaLayer } from "./BackgroundMediaLayer";
import { heroContentPositionStyle } from "./heroContentPosition";
import { OuterSpacingWrapper } from "./OuterSpacingWrapper";

const spaces = INNER_SPACING_CSS;
const widths = { full: "100%", wide: "72rem", medium: "48rem", narrow: "32rem" } as const;
const shadows = { none: "none", soft: "0 4px 16px rgb(0 0 0 / .1)", medium: "0 10px 28px rgb(0 0 0 / .16)", strong: "0 18px 45px rgb(0 0 0 / .24)" } as const;
const childAlignment = { start: "flex-start", center: "center", end: "flex-end", stretch: "flex-start" } as const;

export function GroupElementRenderer({ group, sectionId, mode, viewport, templateKey, library, projectColors, media = {}, eventDate = null, context, selectedElementId, onElementSelect, onElementEdit }: {
  group: CompositionGroup; sectionId: string; mode: "editor" | "public"; viewport: ResponsiveViewport; templateKey: string; library: TemplateDesignLibrary; projectColors: readonly ProjectColor[]; media?: import("../websiteEditor/types").WebsiteDraft["media"]; eventDate?: string | null; context?: ResolvedDesignContext | null; selectedElementId?: string | null; onElementSelect?: (sectionId: string, elementId: string) => void; onElementEdit?: (sectionId: string, elementId: string) => void;
}) {
  useDecorativeSourceAvailability();
  const layout = resolveGroupLayout(group.layout, viewport);
  const visibleChildren = group.children.filter((child) => isElementRenderable(child, templateKey, mode, media ?? {}, eventDate));
  const direction = layout.direction ?? "vertical";
  const alignment = layout.alignment ?? "stretch";
  const division = layout.division ?? "50-50";
  const contentPosition = layout.contentPosition ?? "center";
  const positionStyle = heroContentPositionStyle(contentPosition);
  const padding = layout.padding ?? {};
  const previewColor = useEditorColorPreview(scopedColorPreviewTarget(sectionId, `${group.id}:backgroundColor`), mode === "editor");
  const backgroundColor = previewColor ?? resolveContainerBackgroundColor(group.appearance?.backgroundColorId, library, projectColors);
  const hasDecoration = Boolean(group.appearance?.decorativeAppearance?.background);
  const style: CSSProperties = {
    ...resetElementInlineAlignment(),
    display: direction === "horizontal" ? "grid" : "flex", flexDirection: "column",
    gridTemplateColumns: direction === "horizontal" ? GROUP_DIVISION_TEMPLATES[division] : undefined,
    gap: spaces[layout.gap ?? "none"], alignItems: direction === "horizontal" ? alignment : "stretch",
    justifyContent: direction === "vertical" ? positionStyle.justifyContent : positionStyle.alignItems,
    alignContent: direction === "horizontal" ? positionStyle.justifyContent : undefined,
    paddingTop: spaces[padding.top ?? "none"], paddingRight: spaces[padding.right ?? "none"], paddingBottom: spaces[padding.bottom ?? "none"], paddingLeft: spaces[padding.left ?? "none"],
    boxSizing: "border-box", minWidth: 0,
    width: "100%", maxWidth: widths[layout.width ?? "full"],
    minHeight: mode === "editor" && visibleChildren.length === 0 ? "2.5rem" : undefined,
    backgroundColor,
    boxShadow: group.appearance?.shadow ? shadows[group.appearance.shadow] : undefined,
  };
  const groupClassName = [
    mode === "editor" && "editor-group-boundary",
    (mode === "editor" || hasDecoration || group.backgroundMedia) && "relative",
    (hasDecoration || group.backgroundMedia) && "isolate",
  ].filter(Boolean).join(" ") || undefined;
  return <div data-website-element="group" data-group-content-position={contentPosition} data-editor-group={mode === "editor" ? "true" : undefined} className={groupClassName} style={style}>
    <BackgroundMediaLayer ownerId={group.id} kind="group" reference={group.backgroundMedia} media={media} viewport={viewport} opacity={group.appearance?.backgroundImageOpacity} />
    {hasDecoration && <DecorativeBackgroundLayers templateKey={templateKey} appearance={group.appearance?.decorativeAppearance?.background} viewport={viewport} />}
    {mode === "editor" && visibleChildren.length === 0 && <span className="pointer-events-none absolute inset-0 grid place-items-center px-3 text-center text-xs text-foreground-muted" data-empty-group>Empty Group · add children in Structure</span>}
    {visibleChildren.map((element) => {
    const childSelected = selectedElementId === element.id;
    const frame = <OuterSpacingWrapper element={element} viewport={viewport} sectionId={sectionId} selected={childSelected} onSelect={onElementSelect} onEdit={element.type === "text" ? onElementEdit : undefined}><WebsiteElementFrame mode={mode} sectionId={sectionId} elementId={element.id} elementType={element.type === "compositionGroup" ? "Group" : element.type === "media" ? "Media" : element.type} selected={childSelected} onSelect={onElementSelect} onEdit={element.type === "text" ? onElementEdit : undefined}>
      {element.type === "compositionGroup"
        ? <GroupElementRenderer media={media} eventDate={eventDate} group={element} sectionId={sectionId} mode={mode} viewport={viewport} templateKey={templateKey} library={library} projectColors={projectColors} context={context} selectedElementId={selectedElementId} onElementSelect={onElementSelect} onElementEdit={onElementEdit} />
        : <WebsiteLeafElementRenderer media={media} eventDate={eventDate} element={element} mode={mode} sectionId={sectionId} selected={childSelected} viewport={viewport} templateKey={templateKey} library={library} projectColors={projectColors} context={context} />}
    </WebsiteElementFrame></OuterSpacingWrapper>;
    const className = hasDecoration || group.backgroundMedia ? "relative z-10 min-w-0 max-w-full [overflow-wrap:anywhere]" : "min-w-0 max-w-full [overflow-wrap:anywhere]";
    if (direction === "horizontal") return <div key={element.id} className={className}>{frame}</div>;
    return <div key={element.id} data-group-child-containment data-group-child-alignment={alignment} className={className} style={{ display: "flex", justifyContent: childAlignment[alignment], width: "100%", minWidth: 0, maxWidth: "100%" }}><div data-group-rendered-child className="min-w-0 max-w-full [overflow-wrap:anywhere]" style={{ width: "100%", maxWidth: "100%", flex: "0 1 auto", ...elementInlineAlignmentOverride(alignment === "stretch" ? undefined : childAlignment[alignment]) }}>{frame}</div></div>;
  })}</div>;
}
