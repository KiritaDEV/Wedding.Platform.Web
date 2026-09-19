import { Children, isValidElement, type ReactNode, type ReactElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Select } from "../../../components/ui/Select";
import { GalleryAppearanceControls } from "./GalleryAppearanceControls";
import { InspectorResetAction } from "./InspectorPrimitives";
import { AppearancePanel } from "./AppearancePanel";
import { createCustomSectionPresentation, removeCustomSectionPresentation } from "../compositionLifecycle";
import { mergeScopedSectionAppearance, resolveSectionAppearance } from "../sectionAppearance";
import { resolveGalleryGridAppearance } from "../../websiteRenderer/galleryGridAppearance";
import { resolveEditorCompositionTarget, sameCompositionScope } from "../editorComposition";
import { accessiblePreviewViewports, editorDeviceCategory } from "../responsiveViewport";
import { assertPairedSectionPresentation } from "../sectionAppearance";
import type { WebsiteSection, WebsiteSectionAppearance, WebsiteSectionAppearanceEnvelope, ResponsiveViewport } from "../types";

const base: WebsiteSectionAppearance = { headingAlignment: "inherit", bodyAlignment: "inherit", backgroundTreatment: "inherit", emphasis: "inherit" };
function nodes(node: ReactNode): ReactElement[] {
  if (!isValidElement(node)) return Array.isArray(node) ? node.flatMap(nodes) : [];
  return [node, ...Children.toArray((node.props as { children?: ReactNode }).children).flatMap(nodes)];
}
function selects(appearance = base, viewport: ResponsiveViewport = "desktop", onChange = vi.fn()) {
  return nodes(GalleryAppearanceControls({ appearance, viewport, onChange })).filter(node => node.type === Select) as ReactElement<ComponentProps<typeof Select>>[];
}

describe("Gallery layout authoring", () => {
  it.each([[320, "mobile", ["mobile"]], [768, "tablet", ["tablet", "mobile"]], [1280, "desktop", ["desktop", "tablet", "mobile"]]] as const)("preserves host-derived initial authoring and access at %spx", (width, device, accessible) => {
    expect(editorDeviceCategory(width)).toBe(device);
    expect(accessiblePreviewViewports(device)).toEqual(accessible);
  });
  it("uses the existing scope-change gate and scoped save/discard data for Gallery", () => {
    const content = { semantic: { items: [] }, compositions: { shared: { childFlow: { elements: [], order: [{ kind: "specialized" as const, key: "content" as const }] } } } };
    const paired = createCustomSectionPresentation(content, { shared: base }, "mobile");
    const section = { id: "gallery", type: "gallery", ...paired } as WebsiteSection;
    assertPairedSectionPresentation(section);
    const desktop = resolveEditorCompositionTarget(section, "desktop"), tablet = resolveEditorCompositionTarget(section, "tablet"), mobile = resolveEditorCompositionTarget(section, "mobile");
    expect(sameCompositionScope(desktop.scope, tablet.scope)).toBe(true);
    expect(sameCompositionScope(desktop.scope, mobile.scope)).toBe(false);
    // The page prompts only when dirty and crossing an owner; a scoped save
    // preserves the sibling owner, while discard returns to the stored envelope.
    const working = { ...base, columns: 6, gap: "large" as const, aspectRatio: "landscape" as const };
    const saved = mergeScopedSectionAppearance(paired.appearance, resolveSectionAppearance(paired.appearance, "mobile").scope, working);
    expect(saved.shared).toEqual(base);
    expect(saved.custom?.mobile).toEqual(working);
    expect(resolveSectionAppearance(paired.appearance, "mobile").appearance).toEqual(base);
    expect(section.content).toEqual(paired.content);
    const orphan = structuredClone(section);delete (orphan.appearance as WebsiteSectionAppearanceEnvelope).custom;
    expect(() => assertPairedSectionPresentation(orphan)).toThrow("mismatched mobile");
  });
  it.each([["mobile", "1"], ["tablet", "2"], ["desktop", "3"]] as const)("shows %s defaults without materializing authored properties", (viewport, expected) => {
    const onChange = vi.fn();
    const controls = selects(base, viewport, onChange);
    expect(controls.map(control => control.props.value)).toEqual([expected, "medium", "portrait"]);
    expect(onChange).not.toHaveBeenCalled();
    expect(base).not.toHaveProperty("columns");
  });
  it.each([1, 2, 3, 4, 5, 6])("explicitly persists columns %s, even when equal to the default", columns => {
    const onChange = vi.fn();
    selects(base, "desktop", onChange)[0].props.onChange(String(columns));
    expect(onChange).toHaveBeenCalledWith({ ...base, columns });
  });
  it.each(["small", "medium", "large"])("persists gap token %s", gap => {
    const onChange = vi.fn();selects(base, "mobile", onChange)[1].props.onChange(gap);
    expect(onChange).toHaveBeenCalledWith({ ...base, gap });
  });
  it.each(["square", "portrait", "landscape"])("persists aspect ratio token %s", aspectRatio => {
    const onChange = vi.fn();selects(base, "tablet", onChange)[2].props.onChange(aspectRatio);
    expect(onChange).toHaveBeenCalledWith({ ...base, aspectRatio });
  });
  it.each(["columns", "gap", "aspectRatio"] as const)("removes only %s on per-control reset", key => {
    const authored: WebsiteSectionAppearance = { ...base, columns: 3, gap: "medium", aspectRatio: "portrait", decorativeAppearance: { background: { texture: "grain" } } };
    const onChange = vi.fn();
    const actions = nodes(GalleryAppearanceControls({ appearance: authored, viewport: "mobile", onChange })).filter(node => node.type === InspectorResetAction) as ReactElement<ComponentProps<typeof InspectorResetAction>>[];
    actions[["columns", "gap", "aspectRatio"].indexOf(key)].props.onClick();
    const expected = { ...authored };delete expected[key];expect(onChange).toHaveBeenCalledWith(expected);
  });
  it("uses complete exact-device owners with no shared-property or device cascade", () => {
    const envelope = { shared: { ...base, columns: 6, gap: "large" as const, aspectRatio: "landscape" as const }, custom: { desktop: { ...base, columns: 4 }, tablet: { ...base, columns: 2, gap: "small" as const, aspectRatio: "square" as const }, mobile: base } };
    expect(resolveGalleryGridAppearance(resolveSectionAppearance(envelope, "desktop").appearance, "desktop")).toMatchObject({ columns: 4, gapToken: "medium", aspectRatioToken: "portrait" });
    expect(resolveGalleryGridAppearance(resolveSectionAppearance(envelope, "tablet").appearance, "tablet")).toMatchObject({ columns: 2, gapToken: "small", aspectRatioToken: "square" });
    expect(resolveGalleryGridAppearance(resolveSectionAppearance(envelope, "mobile").appearance, "mobile")).toMatchObject({ columns: 1, gapToken: "medium", aspectRatioToken: "portrait" });
  });
  it.each(["desktop", "tablet", "mobile"] as const)("creates, edits, reloads and resets %s using the existing paired lifecycle", viewport => {
    const content = { semantic: { items: [{ id: "photo", type: "image", mediaId: "asset", focalPoint: { x: .2, y: .8 }, zoom: 2.3 }] }, compositions: { shared: { childFlow: { elements: [], order: [{ kind: "specialized" as const, key: "content" as const }] } } } };
    const custom = createCustomSectionPresentation(content, { shared: base }, viewport);
    const edited = mergeScopedSectionAppearance(custom.appearance, { kind: "custom", viewport }, { ...base, columns: 5, gap: "small", aspectRatio: "square" });
    const saved = JSON.parse(JSON.stringify({ ...custom, appearance: edited }));
    expect(resolveSectionAppearance(saved.appearance, viewport).appearance).toEqual({ ...base, columns: 5, gap: "small", aspectRatio: "square" });
    expect(saved.content.semantic).toEqual(content.semantic);expect(saved.content.compositions).toEqual(custom.content.compositions);
    const reset = removeCustomSectionPresentation(saved.content, saved.appearance, viewport);
    expect(reset.appearance).toEqual({ shared: base });expect(reset.content).toEqual(content);
  });
  it("keeps the Gallery group separate from generic surface controls and available when empty", () => {
    const html = renderToStaticMarkup(<AppearancePanel appearance={base} targetViewport="mobile" templateKey="classic-filipiniana-v1" sectionCapability={{ id: "gallery", appearanceControls: [], presentations: [], defaultPresentation: null, contextDefaults: { typography: [], colors: [] }, decorativeAppearance: { textures: [], patterns: [], overlays: [], frames: [], backgroundColorIds: [], frameColorIds: [] } } as never} library={{ colors: [], fontFamilies: [], palettePresets: [], typographyPresets: [] } as never} projectColors={[]} error={null} onAddColor={async () => { throw Error(); }} onChange={() => {}} />);
    for (const label of ["Gallery", 'aria-label="Columns"', 'aria-label="Gap"', 'aria-label="Aspect ratio"']) expect(html).toContain(label);
    expect(html).not.toContain("Restore mobile defaults");expect(html).not.toContain("Natural");expect(html).not.toContain("Contain");
  });
});
