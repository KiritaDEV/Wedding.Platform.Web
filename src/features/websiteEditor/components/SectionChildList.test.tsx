import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { CompositionGroup } from "../../websiteElements/types";
import type { SectionChildFlow } from "../sectionChildFlow";
import { GroupDisclosure, SectionChildList } from "./SectionChildList";
import { addToGroup, applyStructureElementDrop, deleteGroupChild, duplicateGroupChild, groupAddKinds, reorderGroupChildInFlow, reorderGroupChildren, reorderRootSectionElement } from "./sectionChildListHelpers";
import { findSectionElement, genericTextSectionChildFlowSchema } from "../sectionChildFlow";

const nestedGroup: CompositionGroup = {
  id: "nested-group",
  type: "compositionGroup", editorName: "A deeply nested Group name that must truncate without displacing its actions",
  isHidden: true,
  children: [{ id: "hidden-child", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Hidden child" }] }] }, isHidden: true }],
  layout: {},
};

const topGroup: CompositionGroup = {
  id: "top-group",
  type: "compositionGroup", editorName: "Group 1",
  children: [
    nestedGroup as CompositionGroup["children"][number],
    { id: "long-label", type: "text", editorName: "A very long editor name that must remain available after visual truncation", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Content must not become the label"  }] }] }},
    { id: "rich", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Copy" }] }] } },
    { id: "date", type: "date", editorName: "Date 1" },
    { id: "media", type: "media", editorName: "Media 1", items: [] },
    { id: "divider", type: "divider", editorName: "Divider 1" },
  ],
  layout: {},
};

const flow: SectionChildFlow = {
  elements: [topGroup],
  order: [
    { kind: "specialized", key: "content" },
    { kind: "element", id: topGroup.id },
  ],
};

const renderList = (selectedId?: string) => renderToStaticMarkup(
  <SectionChildList
    sectionLabel="Date"
    flow={flow}
    selected={selectedId ? { kind: "element", id: selectedId } : null}
    onSelect={vi.fn()}
    onChange={vi.fn()}
    onRenameSave={vi.fn(async () => null)}
    onDuplicate={vi.fn()}
    onDelete={vi.fn()}
  />,
);

describe("SectionChildList dense Group hierarchy", () => {
  it("labels the modal action Save to reflect immediate persistence", () => {
    const html = renderList();
    expect(html).toContain("Rename block");
    expect(html).toContain(">Cancel</button>");
    expect(html).toContain(">Save</button>");
  });

  it("exposes keyboard Move actions and requires a destination in the Move dialog", () => {
    const html = renderList();
    expect(html).toContain('id="move-block-title">Move block</h2>');
    expect(html).toContain('<legend class="mb-2 text-xs font-medium">Move to</legend>');
    expect(html).toContain('type="submit" disabled="">Move</button>');
  });

  it("renders top-level and nested Groups expanded with row-local disclosure and add-child controls", () => {
    const html = renderList();
    expect(html).toContain('data-structure-row="group"');
    expect(html).toContain('data-structure-row="nested-group"');
    expect(html.match(/aria-label="Collapse Group"/g)).toHaveLength(2);
    expect(html.match(/aria-label="Add child to Group"/g)).toHaveLength(2);
    expect(html).toContain('data-group-children="top-group"');
    expect(html).toContain('data-group-children="nested-group"');
    expect(html).not.toContain("ml-5");
  });

  it("supports the collapsed and expanded disclosure states at both Group depths", () => {
    const expanded = renderToStaticMarkup(<GroupDisclosure expanded onToggle={vi.fn()} />);
    const collapsed = renderToStaticMarkup(<GroupDisclosure expanded={false} onToggle={vi.fn()} />);
    expect(expanded).toContain('aria-expanded="true"');
    expect(expanded).toContain('aria-label="Collapse Group"');
    expect(collapsed).toContain('aria-expanded="false"');
    expect(collapsed).toContain('aria-label="Expand Group"');
    expect(collapsed).toContain("-rotate-90");
  });

  it("keeps hidden state compact on the child row and preserves the full long label", () => {
    const html = renderList();
    expect(html).toContain('data-element-hidden="true"');
    expect(html).not.toContain('role="img" aria-label="Hidden"');
    expect(html).toContain('title="A very long editor name that must remain available after visual truncation"');
    expect(html).not.toContain("Content must not become the label");
    expect(html).toContain("block truncate text-xs");
  });

  it("keeps root and nested Group names visible while reserving bounded action space", () => {
    const html = renderList();
    expect(html).toContain('title="Group 1"');
    expect(html).toContain('title="A deeply nested Group name that must truncate without displacing its actions"');
    expect(html).toContain('class="min-w-12 basis-12 flex-1');
    expect(html).toContain('class="ml-auto flex shrink-0 items-center gap-0.5"');
    expect(html).toContain('class="group/structure-row flex w-full min-w-0 max-w-full');
    expect(html).not.toContain('class="ml-3 space-y-0.5');
  });

  it("keeps the hidden nested Group label, Add control, and context menu in the same bounded row", () => {
    const html = renderList();
    expect(html).toContain('data-structure-row="nested-group"');
    expect(html).toContain('data-element-hidden="true"');
    expect(html).toContain('aria-label="Add child to Group"');
    expect(html).toContain('aria-label="Group block: A deeply nested Group name that must truncate without displacing its actions, hidden"');
    expect(html).toContain('aria-label="Group block: A deeply nested Group name that must truncate without displacing its actions, hidden actions"');
    expect(html).toContain('text-foreground-muted opacity-50');
    expect(html).toContain('text-foreground-muted opacity-60');
    expect(html).not.toContain('group/structure-row opacity-');
    expect(html.match(/data-structure-actions="true"/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("uses the shared bounded icon, name, and action layout for every generic leaf row", () => {
    const html = renderList();
    for (const label of ["Text block", "Text block", "Date block", "Media block", "Divider block"]) {
      expect(html).toContain(`${label}:`);
    }
    for (const icon of ["lucide-type", "lucide-calendar-days", "lucide-images", "lucide-minus"]) {
      expect(html).toContain(icon);
    }
    expect(html.match(/data-structure-label="true"/g)?.length).toBeGreaterThanOrEqual(6);
    expect(html.match(/data-structure-actions="true"/g)?.length).toBeGreaterThanOrEqual(6);
  });

  it("strengthens row actions for selection while retaining context menus and drag handles", () => {
    const html = renderList("nested-group");
    expect(html).toContain('aria-current="true"');
    expect(html).toContain('aria-label="Group block: A deeply nested Group name that must truncate without displacing its actions, hidden actions"');
    expect(html).toContain('aria-label="Drag Group block: A deeply nested Group name that must truncate without displacing its actions, hidden"');
    expect(html).toContain("lucide-group");
    expect(html).toContain("lucide-type");
    expect(html).toContain("group-hover/structure-row:opacity-100");
    expect(html).toContain('class="relative shrink-0"');
  });

  it("preserves nested drag/reorder behavior", () => {
    expect(reorderGroupChildren(topGroup, 0, 1).map(({ id }) => id)).toEqual(["long-label", "nested-group", "rich", "date", "media", "divider"]);
    expect(topGroup.children.map(({ id }) => id)).toEqual(["nested-group", "long-label", "rich", "date", "media", "divider"]);
  });

  it("reorders Text, Media, nested Group, and Divider siblings in a Blank Group without changing state", () => {
    const children: CompositionGroup["children"] = [
      { id: "text-child", type: "text", editorName: "Welcome", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Keep copy" }] }] }, isHidden: true, appearance: { fontSize: "l" } },
      { id: "media-child", type: "media", editorName: "Portrait", items: [{ id: "media-item", type: "image", mediaId: "01M0Q08NQ9XJB9A7B5SGC45YD9", alt: "Portrait" }] },
      { id: "nested-child", type: "compositionGroup", editorName: "Nested details", children: [{ id: "descendant", type: "text", editorName: "Descendant", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Preserved"  }] }] }}], layout: { gap: "m" } },
      { id: "divider-child", type: "divider", editorName: "Divider", appearance: { width: "large" } },
    ] as CompositionGroup["children"];
    const blank: SectionChildFlow = {
      elements: [{ id: "blank-group", type: "compositionGroup", editorName: "Group", children, layout: { gap: "l" } }],
      order: [{ kind: "element", id: "blank-group" }],
    };
    const originalElements = structuredClone(blank.elements);

    const firstToLast = reorderGroupChildInFlow(blank, "blank-group", "text-child", 3);
    expect((findSectionElement(firstToLast, "blank-group") as CompositionGroup).children.map(({ id }) => id)).toEqual(["media-child", "nested-child", "divider-child", "text-child"]);
    const lastToFirst = reorderGroupChildInFlow(firstToLast, "blank-group", "text-child", 0);
    expect((findSectionElement(lastToFirst, "blank-group") as CompositionGroup).children.map(({ id }) => id)).toEqual(["text-child", "media-child", "nested-child", "divider-child"]);
    const nestedBeforeLeaf = reorderGroupChildInFlow(lastToFirst, "blank-group", "nested-child", 1);
    expect((findSectionElement(nestedBeforeLeaf, "blank-group") as CompositionGroup).children.map(({ id }) => id)).toEqual(["text-child", "nested-child", "media-child", "divider-child"]);
    const repeated = reorderGroupChildInFlow(nestedBeforeLeaf, "blank-group", "divider-child", 0);
    const reloaded = genericTextSectionChildFlowSchema.parse(JSON.parse(JSON.stringify(repeated)));
    expect((findSectionElement(reloaded, "blank-group") as CompositionGroup).children.map(({ id }) => id)).toEqual(["divider-child", "text-child", "nested-child", "media-child"]);
    expect(reloaded.order).toEqual(blank.order);
    expect(reloaded.elements).toEqual([
      {
        ...(originalElements[0] as CompositionGroup),
        children: [children[3], children[0], children[2], children[1]],
      },
    ]);
  });

  it("keeps specialized Group sibling reorder on the same canonical path", () => {
    const specialized = structuredClone(flow);
    const reordered = reorderGroupChildInFlow(specialized, "top-group", "nested-group", topGroup.children.length - 1);
    expect((findSectionElement(reordered, "top-group") as CompositionGroup).children.map(({ id }) => id)).toEqual(["long-label", "rich", "date", "media", "divider", "nested-group"]);
    expect(reordered.order).toEqual(flow.order);
  });

  it("reorders every Blank root block pairing through canonical order without changing element state", () => {
    const blank: SectionChildFlow = {
      elements: [
        { id: "text", type: "text", editorName: "Welcome", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Copy" }] }] }, isHidden: true, appearance: { fontSize: "l" } },
        { id: "rich", type: "text", editorName: "Details", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Rich copy", marks: { bold: true } }] }] } },
        { id: "media", type: "media", editorName: "Portraits", items: [{ id: "media-item", kind: "image", mediaId: "01M0Q08NQ9XJB9A7B5SGC45YD9", alt: "Portrait" }] },
        { id: "divider", type: "divider", editorName: "Pause", appearance: { width: "wide" } },
        { id: "group", type: "compositionGroup", editorName: "Details group", children: [{ id: "nested", type: "text", editorName: "Nested", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Keep me"  }] }] }}], layout: { gap: "l" } },
      ] as SectionChildFlow["elements"],
      order: ["text", "rich", "media", "divider", "group"].map((id) => ({ kind: "element" as const, id })),
    };
    const originalElements = structuredClone(blank.elements);

    const textAfterRich = reorderRootSectionElement(blank, "text", { kind: "element", id: "rich" });
    expect(textAfterRich.order.map((reference) => reference.kind === "element" && reference.id)).toEqual(["rich", "text", "media", "divider", "group"]);
    const mediaAfterDivider = reorderRootSectionElement(textAfterRich, "media", { kind: "element", id: "divider" });
    expect(mediaAfterDivider.order.map((reference) => reference.kind === "element" && reference.id)).toEqual(["rich", "text", "divider", "media", "group"]);
    const groupBeforeLeaf = reorderRootSectionElement(mediaAfterDivider, "group", { kind: "element", id: "rich" });
    expect(groupBeforeLeaf.order.map((reference) => reference.kind === "element" && reference.id)).toEqual(["group", "rich", "text", "divider", "media"]);
    expect(groupBeforeLeaf.elements).toEqual(originalElements);
  });

  it("supports first-to-last, last-to-first, repeated Blank root drops, and canonical save/reload", () => {
    const elements = ["text", "rich", "media", "divider", "group"].map((id) => ({ id, type: "text" as const, editorName: `${id} name`, document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: `${id} content` }] }] }, isHidden: id === "media" }));
    const blank: SectionChildFlow = { elements, order: elements.map(({ id }) => ({ kind: "element", id })) };
    const firstToLast = reorderRootSectionElement(blank, "text", blank.order.at(-1)!);
    expect(firstToLast.order.map((reference) => reference.kind === "element" && reference.id)).toEqual(["rich", "media", "divider", "group", "text"]);
    const lastToFirst = reorderRootSectionElement(firstToLast, "text", firstToLast.order[0]);
    expect(lastToFirst.order.map((reference) => reference.kind === "element" && reference.id)).toEqual(["text", "rich", "media", "divider", "group"]);
    const repeated = reorderRootSectionElement(lastToFirst, "divider", { kind: "element", id: "rich" });
    const reloaded = genericTextSectionChildFlowSchema.parse(JSON.parse(JSON.stringify(repeated)));
    expect(reloaded.order.map((reference) => reference.kind === "element" && reference.id)).toEqual(["text", "divider", "rich", "media", "group"]);
    expect(reloaded.elements).toEqual(elements);
  });

  it("retains specialized root DnD ordering without fabricating or removing its sentinel", () => {
    const specialized: SectionChildFlow = {
      elements: [
        { id: "before", type: "text", editorName: "Before", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Before"  }] }] }},
        { id: "after", type: "text", editorName: "After", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "After"  }] }] }},
      ],
      order: [{ kind: "element", id: "before" }, { kind: "specialized", key: "content" }, { kind: "element", id: "after" }],
    };
    const reordered = reorderRootSectionElement(specialized, "after", specialized.order[0]);
    expect(reordered.order).toEqual([{ kind: "element", id: "after" }, { kind: "element", id: "before" }, { kind: "specialized", key: "content" }]);
    expect(reordered.elements).toEqual(specialized.elements);
  });

  it("applies cross-parent drops and keeps the moved block selected with identity intact", () => {
    const hidden = { id: "move-me", type: "text" as const, editorName: "Renamed hidden block", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Authored" }] }] }, isHidden: true, appearance: { fontSize: "l" as const } };
    const candidate: SectionChildFlow = {
      elements: [hidden, { id: "left", type: "compositionGroup", editorName: "Left", children: [] }, { id: "right", type: "compositionGroup", editorName: "Right", children: [] }],
      order: [{ kind: "specialized", key: "content" }, { kind: "element", id: hidden.id }, { kind: "element", id: "left" }, { kind: "element", id: "right" }],
    };
    const onChange = vi.fn();
    const onSelect = vi.fn();
    expect(applyStructureElementDrop(candidate, hidden.id, { parentId: "left", index: 0 }, onChange, onSelect)).toBe(true);
    const moved = onChange.mock.calls[0][0] as SectionChildFlow;
    expect(findSectionElement(moved, hidden.id)).toEqual(hidden);
    expect((findSectionElement(moved, "left") as CompositionGroup).children.map(({ id }) => id)).toEqual([hidden.id]);
    expect(onSelect).toHaveBeenCalledWith({ kind: "element", id: hidden.id });
  });

  it("wires a Date block through Blank root-to-Group and Group-to-root drops", () => {
    const source = { id: "blank-date", type: "date" as const, editorName: "Ceremony date", isHidden: true };
    const blank: SectionChildFlow = {
      elements: [source, { id: "blank-group", type: "compositionGroup", editorName: "Details", children: [] }],
      order: [{ kind: "element", id: source.id }, { kind: "element", id: "blank-group" }],
    };
    const intoGroupChange = vi.fn();
    const intoGroupSelect = vi.fn();
    expect(applyStructureElementDrop(blank, source.id, { parentId: "blank-group", index: 0 }, intoGroupChange, intoGroupSelect)).toBe(true);
    const grouped = intoGroupChange.mock.calls[0][0] as SectionChildFlow;
    expect(findSectionElement(grouped, source.id)).toEqual(source);
    expect((findSectionElement(grouped, "blank-group") as CompositionGroup).children.map(({ id }) => id)).toEqual([source.id]);
    expect(intoGroupSelect).toHaveBeenCalledWith({ kind: "element", id: source.id });

    const intoRootChange = vi.fn();
    const intoRootSelect = vi.fn();
    expect(applyStructureElementDrop(grouped, source.id, { parentId: null, index: grouped.order.length }, intoRootChange, intoRootSelect)).toBe(true);
    const rooted = intoRootChange.mock.calls[0][0] as SectionChildFlow;
    expect(rooted.order.at(-1)).toEqual({ kind: "element", id: source.id });
    expect(findSectionElement(rooted, source.id)).toEqual(source);
    expect(intoRootSelect).toHaveBeenCalledWith({ kind: "element", id: source.id });
  });

  it("does not update or clear selection for an invalid cross-parent drop", () => {
    const onChange = vi.fn();
    const onSelect = vi.fn();
    expect(applyStructureElementDrop(flow, "top-group", { parentId: "nested-group", index: 0 }, onChange, onSelect)).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("adds a child from a Group row and selects it", () => {
    const onChange = vi.fn();
    const onSelect = vi.fn();
    addToGroup(topGroup, "text", flow, onChange, onSelect);
    const updated = onChange.mock.calls[0][0] as SectionChildFlow;
    const updatedGroup = updated.elements.find(({ id }) => id === topGroup.id) as CompositionGroup;
    expect(updatedGroup.children).toHaveLength(topGroup.children.length + 1);
    expect(updatedGroup.children.at(-1)?.type).toBe("text");
    expect(updatedGroup.children.at(-1)).toMatchObject({ editorName: "Text 2" });
    expect(onSelect).toHaveBeenCalledWith({ kind: "element", id: updatedGroup.children.at(-1)?.id });
  });

  it("uses the same Section-wide allocator for nested Group creation", () => {
    const onChange = vi.fn();
    addToGroup(nestedGroup, "text", flow, onChange, vi.fn());
    const updated = onChange.mock.calls[0][0] as SectionChildFlow;
    const nested = updated.elements[0].type === "compositionGroup" && updated.elements[0].children[0].type === "compositionGroup" ? updated.elements[0].children[0] : null;
    expect(nested?.children.at(-1)).toMatchObject({ type: "text", editorName: "Text 2" });
  });

  it.each(["direct", "nested"] as const)("enforces Group capacity for %s add and duplicate operations", (placement) => {
    const children = Array.from({ length: 20 }, (_, index) => ({
      id: `capacity-${index}`,
      type: "text" as const,
      editorName: `Text ${index + 1}`,
      document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: `Text ${index + 1}` }] }] },
    }));
    const target: CompositionGroup = { id: "capacity-group", type: "compositionGroup", editorName: "Capacity", children, layout: {} };
    const owner: CompositionGroup = placement === "nested"
      ? { id: "owner", type: "compositionGroup", editorName: "Owner", children: [target as CompositionGroup["children"][number]], layout: {} }
      : target;
    const candidate: SectionChildFlow = { elements: [owner], order: [{ kind: "element", id: owner.id }] };
    const onChange = vi.fn();
    const onSelect = vi.fn();
    expect(addToGroup(target, "text", candidate, onChange, onSelect)).toBe(false);
    expect(duplicateGroupChild(target, children[0].id, candidate, onChange, onSelect)).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
    expect(target.children).toHaveLength(20);

    const available: CompositionGroup = { ...target, children: target.children.slice(0, 19) };
    const availableOwner: CompositionGroup = placement === "nested" ? { ...owner, children: [available as CompositionGroup["children"][number]] } : available;
    const availableFlow: SectionChildFlow = { elements: [availableOwner], order: [{ kind: "element", id: availableOwner.id }] };
    expect(addToGroup(available, "text", availableFlow, onChange, onSelect)).toBe(true);
    expect((findSectionElement(onChange.mock.calls.at(-1)![0], available.id) as CompositionGroup).children).toHaveLength(20);
    onChange.mockClear();
    onSelect.mockClear();
    expect(duplicateGroupChild(available, available.children[0].id, availableFlow, onChange, onSelect)).toBe(true);
    expect((findSectionElement(onChange.mock.calls[0][0], available.id) as CompositionGroup).children).toHaveLength(20);
  });

  it("duplicates a nested subtree immediately after its source and selects the regenerated root", () => {
    const onChange = vi.fn();
    const onSelect = vi.fn();
    expect(duplicateGroupChild(topGroup, nestedGroup.id, flow, onChange, onSelect)).toBe(true);
    const updated = findSectionElement(onChange.mock.calls[0][0], topGroup.id) as CompositionGroup;
    const duplicate = updated.children[1];
    expect(updated.children[0].id).toBe(nestedGroup.id);
    expect(duplicate.type).toBe("compositionGroup");
    expect(duplicate.id).not.toBe(nestedGroup.id);
    expect(duplicate).toMatchObject({ editorName: "Group 2", isHidden: true, layout: nestedGroup.layout });
    expect(duplicate.type === "compositionGroup" && duplicate.children[0].id).not.toBe(nestedGroup.children[0].id);
    expect(onSelect).toHaveBeenCalledWith({ kind: "element", id: duplicate.id });
  });

  it.each([
    ["next", "rich", "date"],
    ["previous", "divider", "media"],
    ["parent", "hidden-child", "nested-group"],
  ] as const)("repairs selected nested deletion using the %s fallback", (_case, childId, expectedId) => {
    const parent = childId === "hidden-child" ? nestedGroup : topGroup;
    const onChange = vi.fn();
    const onSelect = vi.fn();
    expect(deleteGroupChild(parent, childId, flow, childId, onChange, onSelect)).toBe(true);
    expect(findSectionElement(onChange.mock.calls[0][0], childId)).toBeUndefined();
    expect(onSelect).toHaveBeenCalledWith({ kind: "element", id: expectedId });
  });

  it("preserves an unrelated valid selection when deleting a nested child", () => {
    const onSelect = vi.fn();
    expect(deleteGroupChild(topGroup, "rich", flow, "date", vi.fn(), onSelect)).toBe(true);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("does not offer a third Group nesting level and keeps all non-Group child choices", () => {
    expect(groupAddKinds(1)).toEqual(["text", "date", "accordion", "schedule", "people", "divider", "media", "group"]);
    expect(groupAddKinds(2)).toEqual(["text", "date", "accordion", "schedule", "people", "divider", "media"]);
  });
});
