import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { WebsiteSection } from "../types";
import { SectionNavigator } from "./SectionNavigator";
import {
  resolveExpandedSectionId,
  resolveSelectionOwnerId,
  toggleExpandedSectionId,
} from "./sectionAccordion";

const childFlow = (groupId: string, childId: string) => ({
  elements: [{
    id: groupId,
    type: "compositionGroup" as const, editorName: "Group 1",
    children: [{ id: childId, type: "text" as const, editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: childId  }] }] }}],
  }],
  order: [
    { kind: "element" as const, id: groupId },
  ],
});

const sections = [
  { id: "section-a", type: "blank", displayName: "Section A", editorName: "Section A", isEnabled: true, content: { semantic: {}, compositions: { shared: { childFlow: childFlow("group-a", "child-a") } } } },
  { id: "section-b", type: "blank", displayName: "Section B", editorName: "Section B", isEnabled: false, content: { semantic: {}, compositions: { shared: { childFlow: childFlow("group-b", "nested-child-b") } } } },
] as unknown as WebsiteSection[];

const renderNavigator = (selectedId: string, childSectionId?: string, childId?: string) => renderToStaticMarkup(
  <SectionNavigator
    sections={sections}
    selectedId={selectedId}
    workingChildFlow={null}
    selectedChild={childSectionId && childId ? { sectionId: childSectionId, reference: { kind: "element", id: childId } } : null}
    genericChildTypesBySectionType={{ blank: ["text", "text", "date", "accordion", "divider", "media", "compositionGroup"] }}
    pending={false}
    onSelect={vi.fn()}
    onChildFlowChange={vi.fn(() => true)}
    onChildRenameSave={vi.fn(async () => null)}
    onChildSelect={vi.fn()}
    onToggle={vi.fn()}
    onMove={vi.fn()}
    onReorder={vi.fn()}
  />,
);

describe("Section Structure accordion", () => {
  it("keeps repeated Blank rows distinct and labels them by persisted editor name", () => {
    const blanks = [
      { ...sections[0], id: "blank-1", type: "blank", displayName: "Section", editorName: "Section 1", content: { semantic: {}, compositions: { shared: { childFlow: { elements: [], order: [] } } } } },
      { ...sections[0], id: "blank-2", type: "blank", displayName: "Section", editorName: "Travel notes", content: { semantic: {}, compositions: { shared: { childFlow: { elements: [], order: [] } } } } },
    ] as unknown as WebsiteSection[];
    const html = renderToStaticMarkup(<SectionNavigator {...{
      sections: blanks, selectedId: "blank-2", workingChildFlow: null, selectedChild: null, genericChildTypesBySectionType: { blank: ["text", "text", "date", "divider", "media", "compositionGroup"] }, pending: false,
      onSelect: vi.fn(), onChildFlowChange: vi.fn(() => true), onChildRenameSave: vi.fn(async () => null), onChildSelect: vi.fn(), onToggle: vi.fn(), onMove: vi.fn(), onReorder: vi.fn(), onCreate: vi.fn(),
    }} />);
    expect(html).toContain("Section 1");
    expect(html).toContain("Travel notes");
    expect(html).toContain("Add Section");
    expect(html).not.toContain(">blank<");
  });

  it("expanding Section B collapses Section A", () => {
    expect(toggleExpandedSectionId("section-a", "section-b", true)).toBe("section-b");
  });

  it("switches the expanded Section for canvas selection", () => {
    expect(resolveExpandedSectionId(["section-a", "section-b"], "section-b")).toBe("section-b");
    const html = renderNavigator("section-b");
    expect(html).toContain('aria-label="Expand Section A" aria-expanded="false"');
    expect(html).toContain('aria-label="Collapse Section B" aria-expanded="true"');
    expect(html).toContain('aria-label="Section B structure"');
    expect(html).not.toContain('aria-label="Section A structure"');
  });

  it("resolves a nested Group child to its top-level owning Section", () => {
    const owner = resolveSelectionOwnerId("section-a", "section-b");
    expect(owner).toBe("section-b");
    const html = renderNavigator(owner!, "section-b", "nested-child-b");
    expect(html).toContain('aria-label="Collapse Section B" aria-expanded="true"');
    expect(html).toContain('aria-label="Text block: Text 1"');
    expect(html).toContain('aria-current="true"');
    expect(html).toContain('aria-label="Collapse Group"');
  });

  it("keeps accordion state out of website data and does not mutate content, order, or visibility", () => {
    const snapshot = structuredClone(sections);
    const result = toggleExpandedSectionId("section-a", "section-b", true);
    expect(result).toBe("section-b");
    expect(sections).toEqual(snapshot);
    expect(sections.map(({ id }) => id)).toEqual(["section-a", "section-b"]);
    expect(sections.map(({ isEnabled }) => isEnabled)).toEqual([true, false]);
    expect(JSON.stringify(sections)).not.toContain("expanded");
  });

  it("uses one sensible default and permits explicitly collapsing the active Section", () => {
    expect(resolveExpandedSectionId(["section-a", "section-b"], null)).toBe("section-a");
    expect(toggleExpandedSectionId("section-a", "section-a", false)).toBeNull();
  });
});
