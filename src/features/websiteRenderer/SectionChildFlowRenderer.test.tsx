import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SectionChildFlowRenderer } from "./SectionChildFlowRenderer";
import { sectionChildWidth } from "./sectionChildWidth";
import { WebsiteElementFrame } from "./WebsiteElementFrame";

// These callback tests inspect the returned element tree without mounting React.
// Source subscriptions are exercised separately by the availability tests.
vi.mock("./decorativeSourceAvailability", async (importOriginal) => ({
  ...await importOriginal<typeof import("./decorativeSourceAvailability")>(),
  useDecorativeSourceAvailability: () => undefined,
}));

const props = {
  sectionId: "date-section",
  flow: { elements: [{ id: "text-1", type: "text" as const, editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Click me"  }] }] }}], order: [{ kind: "specialized" as const, key: "content" as const }, { kind: "element" as const, id: "text-1" }] },
  specialized: <div>Section content</div>, viewport: "desktop" as const, templateKey: "classic-filipiniana-v1",
  library: { colors: [], fontFamilies: [], fontRecommendations: { heading: [], body: [], accent: [] }, palettePresets: [], typographyPresets: [] } as never,
  projectColors: [], context: null,
};

describe("SectionChildFlowRenderer canvas selection", () => {
  it("classifies intrinsic text-like children separately from container-sized children", () => {
    expect(sectionChildWidth(props.flow.elements[0])).toBe("intrinsic");
    expect(sectionChildWidth({ id: "date", type: "date", editorName: "Date 1" })).toBe("intrinsic");
    expect(sectionChildWidth({ id: "divider", type: "divider", editorName: "Divider 1" })).toBe("container");
    expect(sectionChildWidth({ id: "group", type: "compositionGroup", editorName: "Group 1", children: [] })).toBe("container");
    expect(sectionChildWidth({ id: "media", type: "media", editorName: "Media 1", items: [] })).toBe("container");
  });

  it("applies semantic child widths only when the containing renderer opts in", () => {
    const intrinsic = renderToStaticMarkup(<SectionChildFlowRenderer {...props} specialized={null} mode="public" semanticChildWidths inlineAlignment="center" />);
    expect(intrinsic).toContain('data-section-root-flow="true" class="flex flex-col" style="align-items:center"');
    expect(intrinsic).toContain('data-section-child-width="intrinsic"');
    expect(intrinsic).toContain('width:fit-content');

    const unchangedDefault = renderToStaticMarkup(<SectionChildFlowRenderer {...props} specialized={null} mode="public" />);
    expect(unchangedDefault).toContain('data-section-child-width="container"');
    expect(unchangedDefault).toContain('width:100%');
  });

  it("omits empty and unresolved root Media frames publicly but keeps editor affordances", () => {
    const flow = {
      elements: [
        { id: "before", type: "text" as const, editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Before"  }] }] }},
        { id: "empty", type: "media" as const, editorName: "Media 1", items: [] },
        { id: "missing", type: "media" as const, editorName: "Media 2", items: [{ id: "image", type: "image" as const, mediaId: "01J00000000000000000000000", alt: "Missing" }] },
        { id: "after", type: "text" as const, editorName: "Text 2", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "After"  }] }] }},
      ],
      order: [{ kind: "element" as const, id: "before" }, { kind: "element" as const, id: "empty" }, { kind: "element" as const, id: "missing" }, { kind: "element" as const, id: "after" }],
    };
    const published = renderToStaticMarkup(<SectionChildFlowRenderer {...props} flow={flow} specialized={null} mode="public" />);
    expect(published).toContain("Before");
    expect(published).toContain("After");
    expect(published).not.toContain('data-section-child-element="empty"');
    expect(published).not.toContain('data-section-child-element="missing"');
    expect(published).not.toContain("Media unavailable");

    const editor = renderToStaticMarkup(<SectionChildFlowRenderer {...props} flow={flow} specialized={null} mode="editor" />);
    expect(editor).toContain('data-section-child-element="empty"');
    expect(editor).toContain("data-media-empty");
    expect(editor).toContain("Media unavailable");
  });

  it("uses the first click to select the element without entering edit mode", () => {
    const onElementSelect = vi.fn();
    const onElementEdit = vi.fn();
    const stopPropagation = vi.fn();
    const tree = SectionChildFlowRenderer({ ...props, mode: "editor", onElementSelect, onElementEdit }) as ReactElement<{ children: ReactElement[] }>;
    const frame = tree.props.children[1] as ReactElement;
    const renderFrame = frame.type as (props: unknown) => ReactElement<{ onPointerDown: (event: { stopPropagation: () => void }) => void }>;
    const elementWrapper = renderFrame(frame.props);
    elementWrapper.props.onPointerDown({ stopPropagation });
    expect(stopPropagation).toHaveBeenCalledOnce();
    expect(onElementSelect).toHaveBeenCalledWith("date-section", "text-1");
    expect(onElementEdit).not.toHaveBeenCalled();
  });

  it("uses a click anywhere on the selected element to enter edit mode", () => {
    const onElementSelect = vi.fn();
    const onElementEdit = vi.fn();
    const stopPropagation = vi.fn();
    const tree = SectionChildFlowRenderer({ ...props, mode: "editor", selectedElementId: "text-1", onElementSelect, onElementEdit }) as ReactElement<{ children: ReactElement[] }>;
    const frame = tree.props.children[1] as ReactElement;
    const renderFrame = frame.type as (props: unknown) => ReactElement<{ onPointerDown: (event: { stopPropagation: () => void }) => void }>;
    const elementWrapper = renderFrame(frame.props);
    elementWrapper.props.onPointerDown({ stopPropagation });
    expect(stopPropagation).toHaveBeenCalledOnce();
    expect(onElementEdit).toHaveBeenCalledWith("date-section", "text-1");
    expect(onElementSelect).not.toHaveBeenCalled();
  });

  it("shows a no-layout-shift outline only in editor mode", () => {
    const selected = renderToStaticMarkup(<SectionChildFlowRenderer {...props} mode="editor" selectedElementId="text-1" />);
    expect(selected).toContain('data-editor-selected="true"');
    expect(selected).toContain("editor-selection-target");
    expect(selected).toContain("w-full");
    expect(selected).toContain("editor-selection-frame");
    const publicMarkup = renderToStaticMarkup(<SectionChildFlowRenderer {...props} mode="public" selectedElementId="text-1" />);
    expect(publicMarkup).not.toContain("data-editor-selected");
    expect(publicMarkup).not.toContain("editor-selection-target");
    expect(publicMarkup).not.toContain("editor-selection-frame");
    expect(publicMarkup).toContain("w-full");
  });

  it("shows friendly, editor-only selection badges for every element type", () => {
    const text = renderToStaticMarkup(<WebsiteElementFrame mode="editor" sectionId="date-section" elementId="text" elementType="text" selected={false}><span /></WebsiteElementFrame>);
    const divider = renderToStaticMarkup(<WebsiteElementFrame mode="editor" sectionId="date-section" elementId="divider" elementType="divider" selected={false}><span /></WebsiteElementFrame>);
    const group = renderToStaticMarkup(<WebsiteElementFrame mode="editor" sectionId="date-section" elementId="group" elementType="Group" selected={false}><span /></WebsiteElementFrame>);
    const published = renderToStaticMarkup(<WebsiteElementFrame mode="public" sectionId="date-section" elementId="text" elementType="text" selected={false}><span /></WebsiteElementFrame>);

    expect(text).toContain('aria-label="Select Text"');
    expect(divider).toContain('aria-label="Select Divider"');
    expect(divider).toContain('aria-label="Edit Divider"');
    expect(divider).toContain("w-full");
    expect(group).toContain('aria-label="Select Group"');
    expect(published).not.toContain("Select Text");
  });

  it("keeps the Divider frame full-width so percentage sizing works inside aligned Groups", () => {
    const editor = renderToStaticMarkup(<WebsiteElementFrame mode="editor" sectionId="date-section" elementId="divider" elementType="divider" selected={false}><span /></WebsiteElementFrame>);
    const published = renderToStaticMarkup(<WebsiteElementFrame mode="public" sectionId="date-section" elementId="divider" elementType="divider" selected={false}><span /></WebsiteElementFrame>);
    expect(editor).toContain("w-full");
    expect(published).toContain("w-full");
  });

  it("omits hidden top-level generic elements in editor preview and public output", () => {
    const hiddenProps = { ...props, flow: { ...props.flow, elements: [{ ...props.flow.elements[0], text: "Do not render", isHidden: true }] } };
    for (const mode of ["editor", "public"] as const) {
      const html = renderToStaticMarkup(<SectionChildFlowRenderer {...hiddenProps} mode={mode} />);
      expect(html).not.toContain("Do not render");
      expect(html).not.toContain('data-section-child-element="text-1"');
    }
  });
});
