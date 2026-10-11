import { describe, expect, it, vi } from "vitest";
import { heroContentSchema } from "./schemas";
import { commitPendingTextEdit, createTextEditSession } from "./textSelection";
import {
  SECTION_SPECIALIZED_REFERENCE,
  createSectionElement,
  createTextElement,
  deleteGenericSectionElement,
  deleteSectionElement,
  duplicateSectionElement,
  findSectionElement,
  genericTextSectionChildFlowSchema,
  getValidSectionElementMoveDestinations,
  insertSectionElement,
  moveSectionChild,
  moveSectionElement,
  renameSectionElement,
  sectionChildFlowSchema,
  updateSectionElement,
  updateSectionTextAppearance,
  updateSectionTextDocument,
  setSectionElementHidden,
  type SectionChildFlow,
} from "./sectionChildFlow";
import { websiteElementSchema } from "../websiteElements/schemas";

const text = (id: string, value = id) => ({ id, type: "text" as const, editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: value }] }] }, appearance: {} });
const flow = (elements = [text("a")], order: Array<{ kind: "specialized"; key: "content" } | { kind: "element"; id: string }> = [SECTION_SPECIALIZED_REFERENCE, { kind: "element", id: "a" }]) => ({ elements, order });

describe("Section child-flow schema", () => {
  it.each([
    { id: "text", type: "text", editorName: "  Text\n  1 ", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: ""  }] }] }},
    { id: "rich", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "" }] }] } },
    { id: "date", type: "date", editorName: "Date 1" },
    { id: "media", type: "media", editorName: "Media 1", items: [] },
    { id: "divider", type: "divider", editorName: "Divider 1" },
    { id: "group", type: "compositionGroup", editorName: "Group 1", children: [] },
  ])("requires and accepts canonical identity for $type", (candidate) => {
    expect(websiteElementSchema.parse(candidate)).toMatchObject({ editorName: candidate.type === "text" ? "Text 1" : candidate.editorName });
    const unnamed = { ...candidate } as Record<string, unknown>;
    delete unnamed.editorName;
    expect(websiteElementSchema.safeParse(unnamed).success).toBe(false);
  });

  it("enforces blank and 80-Unicode-character editor names without adding identity to functional elements", () => {
    expect(websiteElementSchema.safeParse({ id: "text", type: "text", editorName: "   \n ", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: ""  }] }] }}).success).toBe(false);
    expect(websiteElementSchema.safeParse({ id: "text", type: "text", editorName: "😀".repeat(80), document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: ""  }] }] }}).success).toBe(true);
    expect(websiteElementSchema.safeParse({ id: "text", type: "text", editorName: "😀".repeat(81), document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: ""  }] }] }}).success).toBe(false);
    expect(websiteElementSchema.safeParse({ id: "heading", type: "heading", editorName: "Heading 1", text: "Heading" }).success).toBe(false);
  });

  it("hydrates complete direct and nested canonical Text without changing state", () => {
    const appearance = { fontFamilyId: "inter", fontSize: "xl" as const, fontWeight: 600 as const, lineHeight: "relaxed" as const, letterSpacing: "wide" as const, alignment: "center" as const, colorId: "terracotta-text", italic: true, underline: true, strikethrough: true, textTransform: "uppercase" as const, responsive: { tablet: { fontSize: "l" as const, alignment: "start" as const }, mobile: { fontSize: "s" as const, alignment: "end" as const } } };
    const direct = { id: "direct-text", type: "text" as const, editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Direct" }] }] }, isHidden: true, appearance };
    const nested = { id: "nested-text", type: "text" as const, editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Nested" }] }] }, appearance };
    const candidate: SectionChildFlow = { elements: [direct, { id: "outer", type: "compositionGroup", editorName: "Group 1", children: [{ id: "inner", type: "compositionGroup", editorName: "Group 1", children: [nested] }] }], order: [SECTION_SPECIALIZED_REFERENCE, { kind: "element", id: "direct-text" }, { kind: "element", id: "outer" }] };
    const hydrated = sectionChildFlowSchema.parse(candidate);
    expect(findSectionElement(hydrated, "direct-text")).toEqual(direct);
    expect(findSectionElement(hydrated, "nested-text")).toEqual(nested);
    expect(findSectionElement(hydrated, "direct-text")?.isHidden).toBe(true);
  });

  it.each([
    ["missing specialized", flow(undefined, [{ kind: "element", id: "a" }])],
    ["duplicate specialized", flow(undefined, [SECTION_SPECIALIZED_REFERENCE, SECTION_SPECIALIZED_REFERENCE, { kind: "element", id: "a" }])],
    ["missing element reference", flow(undefined, [SECTION_SPECIALIZED_REFERENCE])],
    ["duplicate element reference", flow(undefined, [SECTION_SPECIALIZED_REFERENCE, { kind: "element", id: "a" }, { kind: "element", id: "a" }])],
    ["unknown element reference", flow(undefined, [SECTION_SPECIALIZED_REFERENCE, { kind: "element", id: "missing" }])],
    ["unreferenced element", flow([text("a"), text("b")])],
    ["duplicate element IDs", flow([text("a"), text("a")], [SECTION_SPECIALIZED_REFERENCE, { kind: "element", id: "a" }, { kind: "element", id: "a" }])],
  ])("rejects %s", (_name, candidate) => expect(sectionChildFlowSchema.safeParse(candidate).success).toBe(false));

  it("rejects invalid Text, disallowed elements, unknown discriminators, and unknown keys", () => {
    expect(sectionChildFlowSchema.safeParse(flow([{ ...text("a"), appearance: { fontWeight: 500 } }])).success).toBe(false);
    expect(sectionChildFlowSchema.safeParse(flow([{ id: "a", type: "mystery" } as never])).success).toBe(false);
    expect(sectionChildFlowSchema.safeParse({ ...flow(), extra: true }).success).toBe(false);
    expect(heroContentSchema.safeParse({ headline: "Hi", subheadline: "", childFlow: flow() }).success).toBe(false);
  });

  it("rejects obsolete Divider aliases", () => {
    const candidate = flow([{ id: "divider", type: "divider", editorName: "Divider 1", appearance: { styleId: "botanical-vine", width: "full", opacity: 75 } } as never], [SECTION_SPECIALIZED_REFERENCE, { kind: "element", id: "divider" }]);
    expect(sectionChildFlowSchema.safeParse(candidate).success).toBe(false);
  });
});
describe("Section child-flow operations", () => {
  const movableFlow = (): SectionChildFlow => ({
    elements: [
      { id: "root-text", type: "text", editorName: "Welcome message", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Keep me" }] }] }, isHidden: true, appearance: { fontSize: "l" } },
      { id: "group-a", type: "compositionGroup", editorName: "Group A", children: [
        { id: "a-1", type: "text", editorName: "Text A", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "A"  }] }] }},
        { id: "inner", type: "compositionGroup", editorName: "Inner", children: [{ id: "nested", type: "text", editorName: "Nested copy", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Nested"  }] }] }}] },
      ] },
      { id: "group-b", type: "compositionGroup", editorName: "Group B", children: [{ id: "b-1", type: "text", editorName: "Text B", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "B"  }] }] }}] },
      { id: "shallow-group", type: "compositionGroup", editorName: "Shallow", children: [{ id: "shallow-copy", type: "text", editorName: "Shallow copy", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Subtree"  }] }] }}] },
    ],
    order: [SECTION_SPECIALIZED_REFERENCE, { kind: "element", id: "root-text" }, { kind: "element", id: "group-a" }, { kind: "element", id: "group-b" }, { kind: "element", id: "shallow-group" }],
  });

  it.each(["direct", "group", "nested group"] as const)("round-trips the complete canonical Text fixture at the %s placement", (placement) => {
    const document = { type: "doc" as const, children: [
      { type: "paragraph" as const, children: [{ text: "Bold", marks: { bold: true } }, { text: " italic", marks: { italic: true } }, { text: " under", marks: { underline: true } }, { text: " strike", marks: { strikethrough: true } }] },
      { type: "paragraph" as const, children: [{ text: "Second paragraph" }] },
    ] };
    const rich = {
      id: "rich-fixture", type: "text" as const, editorName: "Ceremony copy", isHidden: true, document,
      appearance: {
        fontFamilyId: "inter", fontWeight: 600 as const, fontSize: "l" as const,
        lineHeight: "relaxed" as const, letterSpacing: "wide" as const, alignment: "center" as const, colorId: "ink",
        responsive: {
          tablet: { fontSize: "m" as const, alignment: "start" as const },
          mobile: { fontSize: "s" as const, alignment: "end" as const },
        },
      },
    };
    const root = placement === "direct" ? rich : placement === "group"
      ? { id: "group", type: "compositionGroup" as const, editorName: "Group 1", children: [rich] }
      : { id: "outer", type: "compositionGroup" as const, editorName: "Group 1", children: [{ id: "inner", type: "compositionGroup" as const, editorName: "Group 2", children: [rich] }] };
    const candidate: SectionChildFlow = { elements: [root], order: [SECTION_SPECIALIZED_REFERENCE, { kind: "element", id: root.id }] };
    const saved = sectionChildFlowSchema.parse(candidate);
    const hydrated = sectionChildFlowSchema.parse(JSON.parse(JSON.stringify(saved)));
    expect(findSectionElement(hydrated, "rich-fixture")).toEqual(rich);
  });

  it("relocates root and Group children across every valid parent combination", () => {
    const rootIntoGroup = moveSectionElement(movableFlow(), "root-text", { parentId: "group-b", index: 1 });
    expect(rootIntoGroup.ok && (findSectionElement(rootIntoGroup.flow, "group-b") as import("../websiteElements/types").CompositionGroup).children.map(({ id }) => id)).toEqual(["b-1", "root-text"]);

    const groupIntoRoot = moveSectionElement(movableFlow(), "a-1", { parentId: null, index: 1 });
    expect(groupIntoRoot.ok && groupIntoRoot.flow.order[1]).toEqual({ kind: "element", id: "a-1" });

    const groupToGroup = moveSectionElement(movableFlow(), "a-1", { parentId: "group-b", index: 0 });
    expect(groupToGroup.ok && (findSectionElement(groupToGroup.flow, "group-b") as import("../websiteElements/types").CompositionGroup).children.map(({ id }) => id)).toEqual(["a-1", "b-1"]);

    const outerToNested = moveSectionElement(movableFlow(), "a-1", { parentId: "inner", index: 1 });
    expect(outerToNested.ok && (findSectionElement(outerToNested.flow, "inner") as import("../websiteElements/types").CompositionGroup).children.map(({ id }) => id)).toEqual(["nested", "a-1"]);

    const nestedToOuter = moveSectionElement(movableFlow(), "nested", { parentId: "group-a", index: 0 });
    expect(nestedToOuter.ok && (findSectionElement(nestedToOuter.flow, "group-a") as import("../websiteElements/types").CompositionGroup).children.map(({ id }) => id)).toEqual(["nested", "a-1", "inner"]);
  });

  it("reparents Blank root and Group children through the canonical move path", () => {
    const blank = structuredClone(movableFlow());
    blank.order = blank.order.filter(({ kind }) => kind === "element");

    const rootIntoGroup = moveSectionElement(blank, "root-text", { parentId: "group-b", index: 1 });
    expect(rootIntoGroup.ok).toBe(true);
    if (!rootIntoGroup.ok) return;
    expect((findSectionElement(rootIntoGroup.flow, "group-b") as import("../websiteElements/types").CompositionGroup).children.map(({ id }) => id)).toEqual(["b-1", "root-text"]);

    const groupIntoRoot = moveSectionElement(rootIntoGroup.flow, "root-text", { parentId: null, index: rootIntoGroup.flow.order.length });
    expect(groupIntoRoot.ok).toBe(true);
    if (!groupIntoRoot.ok) return;
    expect(groupIntoRoot.flow.order.at(-1)).toEqual({ kind: "element", id: "root-text" });

    const groupToGroup = moveSectionElement(groupIntoRoot.flow, "a-1", { parentId: "group-b", index: 0 });
    expect(groupToGroup.ok).toBe(true);
    if (!groupToGroup.ok) return;
    expect((findSectionElement(groupToGroup.flow, "group-b") as import("../websiteElements/types").CompositionGroup).children.map(({ id }) => id)).toEqual(["a-1", "b-1"]);

    const nestedToRoot = moveSectionElement(groupToGroup.flow, "nested", { parentId: null, index: groupToGroup.flow.order.length });
    expect(nestedToRoot.ok).toBe(true);
    if (!nestedToRoot.ok) return;
    expect(nestedToRoot.flow.order.at(-1)).toEqual({ kind: "element", id: "nested" });

    const rootGroupIntoGroup = moveSectionElement(nestedToRoot.flow, "shallow-group", { parentId: "group-b", index: 2 });
    expect(rootGroupIntoGroup.ok).toBe(true);
    if (!rootGroupIntoGroup.ok) return;
    expect((findSectionElement(rootGroupIntoGroup.flow, "group-b") as import("../websiteElements/types").CompositionGroup).children.map(({ id }) => id)).toEqual(["a-1", "b-1", "shallow-group"]);
  });

  it("preserves Blank subtree identity and state across cross-parent save/reload", () => {
    const blank = structuredClone(movableFlow());
    blank.order = blank.order.filter(({ kind }) => kind === "element");
    const source = structuredClone(findSectionElement(blank, "root-text"));
    const groupSource = structuredClone(findSectionElement(blank, "shallow-group"));

    const first = moveSectionElement(blank, "root-text", { parentId: "group-b", index: 0 });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = moveSectionElement(first.flow, "shallow-group", { parentId: "group-b", index: 2 });
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    const reloaded = genericTextSectionChildFlowSchema.parse(JSON.parse(JSON.stringify(second.flow)));
    expect(findSectionElement(reloaded, "root-text")).toEqual(source);
    expect(findSectionElement(reloaded, "shallow-group")).toEqual(groupSource);
    expect((findSectionElement(reloaded, "group-b") as import("../websiteElements/types").CompositionGroup).children.map(({ id }) => id)).toEqual(["root-text", "b-1", "shallow-group"]);
    expect(reloaded.order.every(({ kind }) => kind === "element")).toBe(true);
  });

  it("rejects Blank over-depth and descendant cycle destinations without mutation", () => {
    const blank = structuredClone(movableFlow());
    blank.order = blank.order.filter(({ kind }) => kind === "element");
    const snapshot = structuredClone(blank);

    expect(moveSectionElement(blank, "shallow-group", { parentId: "inner", index: 0 })).toMatchObject({ ok: false, reason: "invalid-destination" });
    expect(moveSectionElement(blank, "group-a", { parentId: "inner", index: 0 })).toMatchObject({ ok: false, reason: "cycle" });
    expect(blank).toEqual(snapshot);
  });

  it("reorders within a parent and around immutable specialized root content", () => {
    const sameParent = moveSectionElement(movableFlow(), "inner", { parentId: "group-a", index: 0 });
    expect(sameParent.ok && (findSectionElement(sameParent.flow, "group-a") as import("../websiteElements/types").CompositionGroup).children.map(({ id }) => id)).toEqual(["inner", "a-1"]);
    const beforeSpecialized = moveSectionElement(movableFlow(), "root-text", { parentId: null, index: 0 });
    expect(beforeSpecialized.ok && beforeSpecialized.flow.order.slice(0, 2)).toEqual([{ kind: "element", id: "root-text" }, SECTION_SPECIALIZED_REFERENCE]);
    const afterSpecialized = moveSectionElement(beforeSpecialized.ok ? beforeSpecialized.flow : movableFlow(), "root-text", { parentId: null, index: 1 });
    expect(afterSpecialized.ok && afterSpecialized.flow.order.slice(0, 2)).toEqual([SECTION_SPECIALIZED_REFERENCE, { kind: "element", id: "root-text" }]);
  });

  it("preserves complete Block Identity and payload while moving a subtree atomically", () => {
    const initial = movableFlow();
    const source = structuredClone(findSectionElement(initial, "root-text"));
    const moved = moveSectionElement(initial, "root-text", { parentId: "group-b", index: 0 });
    expect(moved.ok && findSectionElement(moved.flow, "root-text")).toEqual(source);
    expect(findSectionElement(initial, "root-text")).toEqual(source);

    const subtree = structuredClone(findSectionElement(initial, "shallow-group"));
    const groupMoved = moveSectionElement(initial, "shallow-group", { parentId: "group-b", index: 0 });
    expect(groupMoved.ok && findSectionElement(groupMoved.flow, "shallow-group")).toEqual(subtree);
    expect(groupMoved.ok && findSectionElement(groupMoved.flow, "shallow-copy")).toMatchObject({ id: "shallow-copy", editorName: "Shallow copy", document: { children: [{ children: [{ text: "Subtree" }] }] } });
  });

  it("rejects cycles, invalid types, depth, and capacity without partial mutation", () => {
    const initial = movableFlow();
    const snapshot = structuredClone(initial);
    expect(moveSectionElement(initial, "group-a", { parentId: "group-a", index: 0 })).toMatchObject({ ok: false, reason: "cycle" });
    expect(moveSectionElement(initial, "group-a", { parentId: "inner", index: 0 })).toMatchObject({ ok: false, reason: "cycle" });
    expect(moveSectionElement(initial, "shallow-group", { parentId: "inner", index: 0 })).toMatchObject({ ok: false, reason: "invalid-destination" });
    expect(moveSectionElement(initial, "root-text", { parentId: "missing", index: 0 })).toMatchObject({ ok: false, reason: "destination-not-found" });
    expect(moveSectionElement(initial, "missing", { parentId: null, index: 0 })).toMatchObject({ ok: false, reason: "source-not-found" });
    const disallowed = flow([{ id: "heading", type: "heading", text: "Functional singleton" } as never], [SECTION_SPECIALIZED_REFERENCE, { kind: "element", id: "heading" }]) as SectionChildFlow;
    expect(moveSectionElement(disallowed, "heading", { parentId: null, index: 0 })).toMatchObject({ ok: false, reason: "source-not-found" });

    const fullGroup = movableFlow();
    const groupB = findSectionElement(fullGroup, "group-b") as import("../websiteElements/types").CompositionGroup;
    groupB.children = Array.from({ length: 20 }, (_, index) => ({ id: `full-${index}`, type: "text", editorName: `Full ${index}`, document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "" }] }] } }));
    expect(moveSectionElement(fullGroup, "root-text", { parentId: "group-b", index: 20 })).toMatchObject({ ok: false, reason: "invalid-destination" });

    const fullRoot = movableFlow();
    fullRoot.elements.push(...Array.from({ length: 16 }, (_, index) => ({ id: `root-${index}`, type: "text" as const, editorName: `Root ${index}`, document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "" }] }] } })));
    fullRoot.order.push(...Array.from({ length: 16 }, (_, index) => ({ kind: "element" as const, id: `root-${index}` })));
    expect(moveSectionElement(fullRoot, "a-1", { parentId: null, index: fullRoot.order.length })).toMatchObject({ ok: false, reason: "invalid-destination" });
    expect(initial).toEqual(snapshot);
  });

  it("round-trips valid root, Group, and nested relocations through canonical persistence", () => {
    let current = movableFlow();
    for (const [id, destination] of [
      ["root-text", { parentId: "group-b", index: 1 }],
      ["nested", { parentId: null, index: 1 }],
      ["a-1", { parentId: "inner", index: 0 }],
    ] as const) {
      const moved = moveSectionElement(current, id, destination);
      expect(moved.ok).toBe(true);
      if (moved.ok) current = moved.flow;
    }
    const reloaded = sectionChildFlowSchema.parse(JSON.parse(JSON.stringify(current)));
    expect(findSectionElement(reloaded, "root-text")).toMatchObject({ id: "root-text", editorName: "Welcome message", isHidden: true, document: { children: [{ children: [{ text: "Keep me" }] }] }, appearance: { fontSize: "l" } });
    expect((findSectionElement(reloaded, "group-b") as import("../websiteElements/types").CompositionGroup).children.map(({ id }) => id)).toContain("root-text");
    expect(reloaded.order[1]).toEqual({ kind: "element", id: "nested" });
  });

  it("lists only canonical Move destinations and omits the current parent", () => {
    const rootDestinations = getValidSectionElementMoveDestinations(movableFlow(), "root-text");
    expect(rootDestinations.map(({ label }) => label)).toEqual(["Group A", "Group A / Inner", "Group B", "Shallow"]);
    expect(rootDestinations).not.toContainEqual(expect.objectContaining({ parentId: null }));

    const nestedDestinations = getValidSectionElementMoveDestinations(movableFlow(), "nested");
    expect(nestedDestinations).toContainEqual(expect.objectContaining({ parentId: null, label: "Section root" }));
    expect(nestedDestinations).toContainEqual(expect.objectContaining({ parentId: "group-a", label: "Group A" }));
    expect(nestedDestinations).not.toContainEqual(expect.objectContaining({ parentId: "inner" }));
  });

  it("filters self, descendants, third-level, and full Group destinations", () => {
    const groupDestinations = getValidSectionElementMoveDestinations(movableFlow(), "group-a");
    expect(groupDestinations.map(({ parentId }) => parentId)).not.toContain("group-a");
    expect(groupDestinations.map(({ parentId }) => parentId)).not.toContain("inner");
    expect(groupDestinations.map(({ parentId }) => parentId)).not.toContain("group-b");

    const shallowDestinations = getValidSectionElementMoveDestinations(movableFlow(), "shallow-group");
    expect(shallowDestinations).toContainEqual(expect.objectContaining({ parentId: "group-b" }));
    expect(shallowDestinations.map(({ parentId }) => parentId)).not.toContain("inner");

    const full = movableFlow();
    const groupB = findSectionElement(full, "group-b") as import("../websiteElements/types").CompositionGroup;
    groupB.children = Array.from({ length: 20 }, (_, index) => ({ id: `limit-${index}`, type: "text", editorName: `Limit ${index}`, document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "" }] }] } }));
    expect(getValidSectionElementMoveDestinations(full, "root-text").map(({ parentId }) => parentId)).not.toContain("group-b");
  });

  it("uses renamed Group breadcrumbs and disambiguates duplicate destination paths", () => {
    const candidate = movableFlow();
    const groupA = findSectionElement(candidate, "group-a") as import("../websiteElements/types").CompositionGroup;
    const groupB = findSectionElement(candidate, "group-b") as import("../websiteElements/types").CompositionGroup;
    groupA.editorName = "Ceremony details";
    groupB.editorName = "Ceremony details";
    const labels = getValidSectionElementMoveDestinations(candidate, "root-text").map(({ label }) => label);
    expect(labels).toContain("Ceremony details (1)");
    expect(labels).toContain("Ceremony details (2)");
    expect(labels).toContain("Ceremony details / Inner");
  });

  it("allocates independent Section-wide names across nested Groups", () => {
    const existing: SectionChildFlow = {
      elements: [
        { id: "text-1", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: ""  }] }] }},
        { id: "group", type: "compositionGroup", editorName: "Group 1", children: [
          { id: "text-3", type: "text", editorName: "Text 3", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: ""  }] }] }},
          { id: "inner", type: "compositionGroup", editorName: "Group 2", children: [{ id: "media", type: "media", editorName: "Media 1", items: [] }] },
        ] },
      ],
      order: [SECTION_SPECIALIZED_REFERENCE, { kind: "element", id: "text-1" }, { kind: "element", id: "group" }],
    };
    expect(createSectionElement(existing, "text").editorName).toBe("Text 4");
    expect(createSectionElement(existing, "media").editorName).toBe("Media 2");
    expect(createSectionElement(existing, "date")).toMatchObject({ type: "date", editorName: "Date 1" });
    expect(createSectionElement(existing, "compositionGroup").editorName).toBe("Group 3");
    expect(createSectionElement(existing, "divider").editorName).toBe("Divider 1");
  });

  it("renames only editor metadata and an empty rename restores the next automatic name", () => {
    const initial = flow([text("a", "Keep content"), { ...text("b"), editorName: "Text 3" }]);
    const renamed = renameSectionElement(initial, "a", "  Ceremony\n heading  ");
    expect(findSectionElement(renamed, "a")).toEqual({ ...text("a", "Keep content"), editorName: "Ceremony heading" });
    const duplicateCustom = renameSectionElement(renamed, "b", "Ceremony heading");
    expect(findSectionElement(duplicateCustom, "b")).toMatchObject({ editorName: "Ceremony heading" });
    const restored = renameSectionElement(initial, "a", "  ");
    expect(findSectionElement(restored, "a")).toMatchObject({ editorName: "Text 4" });
  });

  it("duplicates a Group subtree with fresh deterministic preorder identities", () => {
    const group = { id: "group", type: "compositionGroup" as const, editorName: "Group 1", isHidden: true, layout: { gap: "m" as const }, children: [
      { id: "text", type: "text" as const, editorName: "Welcome", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Keep", colorId: "project-color-01M00000000000000000000000" }] }] }, appearance: { fontSize: "l" as const } },
      { id: "date", type: "date" as const, editorName: "Ceremony date", isHidden: true },
      { id: "inner", type: "compositionGroup" as const, editorName: "Details", children: [{ id: "nested", type: "text" as const, editorName: "Text 4", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Nested"  }] }] }}] },
    ] };
    const current: SectionChildFlow = { elements: [group], order: [SECTION_SPECIALIZED_REFERENCE, { kind: "element", id: "group" }] };
    const result = duplicateSectionElement(current, "group")!;
    const copy = findSectionElement(result.flow, result.elementId);
    expect(copy).toMatchObject({ type: "compositionGroup", editorName: "Group 2", isHidden: true, layout: { gap: "m" }, children: [
      { type: "text", editorName: "Text 5", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Keep", colorId: "project-color-01M00000000000000000000000" }] }] }, appearance: { fontSize: "l" } },
      { type: "date", editorName: "Date 1", isHidden: true },
      { type: "compositionGroup", editorName: "Group 3", children: [{ type: "text", editorName: "Text 6", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Nested"  }] }] }}] },
    ] });
    expect(copy?.id).not.toBe(group.id);
    expect(copy?.type === "compositionGroup" ? copy.children[0].id : null).not.toBe("text");
  });

  it("rejects noncanonical Text runs nested inside Groups before saving", () => {
    const candidate = flow([{ id: "group", type: "compositionGroup", editorName: "Group 1", children: [{ id: "rich", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Copy", marks: { bold: true, italic: false }, editorMetadata: true }] }] } }], layout: {} } as never], [SECTION_SPECIALIZED_REFERENCE, { kind: "element", id: "group" }]);
    expect(sectionChildFlowSchema.safeParse(candidate).success).toBe(false);
  });

  it.each(["tablet", "mobile"] as const)("preserves nested Text document through every %s appearance update", (viewport) => {
    const document = { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Existing nested content", marks: { bold: true } }] }, { type: "paragraph" as const, children: [{ text: "First" }] }, { type: "paragraph" as const, children: [{ text: "Second", marks: { italic: true } }] }] };
    const nested = flow([{ id: "group", type: "compositionGroup", editorName: "Group 1", children: [{ id: "rich", type: "text", editorName: "Text 1", document }], layout: {} } as never], [SECTION_SPECIALIZED_REFERENCE, { kind: "element", id: "group" }]);
    const originalBytes = JSON.stringify(document);
    const appearances = [
      { fontFamilyId: "body-font" },
      { fontSize: "l" as const },
      { lineHeight: "relaxed" as const },
      { letterSpacing: "wide" as const },
      { alignment: "center" as const },
      { colorId: "ink" },
      { responsive: { [viewport]: { fontSize: "s" as const, alignment: "end" as const } } },
    ];

    for (const appearance of appearances) {
      const updated = updateSectionTextAppearance(nested, "rich", appearance);
      expect(updated).not.toBeNull();
      const rich = findSectionElement(updated ?? undefined, "rich");
      expect(rich?.type).toBe("text");
      if (rich?.type !== "text") continue;
      expect(JSON.stringify(rich.document)).toBe(originalBytes);
      expect(rich.appearance).toEqual(appearance);
      expect(JSON.stringify((findSectionElement(nested, "rich") as { document: unknown }).document)).toBe(originalBytes);
    }
  });

  it("preserves top-level Text while applying appearance-only updates", () => {
    const document = { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Top-level content" }] }] };
    const topLevel = flow([{ id: "rich", type: "text", editorName: "Text 1", document } as never], [SECTION_SPECIALIZED_REFERENCE, { kind: "element", id: "rich" }]);
    const updated = updateSectionTextAppearance(topLevel, "rich", { responsive: { mobile: { alignment: "center" } } });
    expect(findSectionElement(updated ?? undefined, "rich")).toEqual({ id: "rich", type: "text", editorName: "Text 1", document, appearance: { responsive: { mobile: { alignment: "center" } } } });
  });

  it.each(["direct", "group child", "nested group child"] as const)("merges a canvas document commit into the latest Text %s without replacing sibling state", (placement) => {
    const before = { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Before" }] }] };
    const after = { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "After", marks: { bold: true } }] }] };
    const rich = { id: "rich", type: "text" as const, editorName: "Latest name", isHidden: true, appearance: { fontFamilyId: "body-font", responsive: { mobile: { fontSize: "s" as const } } }, document: before };
    const elements = placement === "direct"
      ? [rich]
      : placement === "group child"
        ? [{ id: "group", type: "compositionGroup" as const, editorName: "Group 1", children: [rich] }]
        : [{ id: "outer", type: "compositionGroup" as const, editorName: "Group 1", children: [{ id: "inner", type: "compositionGroup" as const, editorName: "Group 2", children: [rich] }] }];
    const current = flow(elements as never, [SECTION_SPECIALIZED_REFERENCE, { kind: "element", id: elements[0].id }]);

    const updated = updateSectionTextDocument(current, "rich", after);
    const result = findSectionElement(updated ?? undefined, "rich");
    expect(result).toEqual({ ...rich, document: after });
  });

  it("merges panel appearance into the latest canonical nested Text node", () => {
    const document = { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Latest canvas content" }] }] };
    const nested = flow([{ id: "group", type: "compositionGroup", editorName: "Group 1", children: [{ id: "rich", type: "text", editorName: "Text 1", document }], layout: {} } as never], [SECTION_SPECIALIZED_REFERENCE, { kind: "element", id: "group" }]);
    const updated = updateSectionTextAppearance(nested, "rich", { responsive: { mobile: { fontSize: "s" } } });
    const rich = findSectionElement(updated ?? undefined, "rich");
    expect(rich?.type === "text" ? rich.document : null).toEqual(document);
  });

  it("save and reload preserve nested Text after Mobile appearance edits", () => {
    const document = { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Persist me", marks: { underline: true } }] }] };
    const nested = flow([{ id: "group", type: "compositionGroup", editorName: "Group 1", children: [{ id: "rich", type: "text", editorName: "Text 1", document }], layout: {} } as never], [SECTION_SPECIALIZED_REFERENCE, { kind: "element", id: "group" }]);
    const updated = updateSectionTextAppearance(nested, "rich", { responsive: { mobile: { fontSize: "s", alignment: "center" } } });
    const saved = sectionChildFlowSchema.parse(updated!);
    const reloaded = sectionChildFlowSchema.parse(JSON.parse(JSON.stringify(saved)));
    const rich = findSectionElement(reloaded, "rich");
    expect(rich?.type === "text" ? rich.document : null).toEqual(document);
    expect(rich?.type === "text" ? rich.appearance : null).toEqual({ responsive: { mobile: { fontSize: "s", alignment: "center" } } });
  });

  it.each(["top-level", "nested"] as const)("Tablet %s Text commits only dirty document changes", (_placement) => {
    const original = { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Original Tablet content" }] }] };
    const rich = { id: "rich", type: "text" as const, editorName: "Text 1", document: original };
    let current: SectionChildFlow = _placement === "nested"
      ? flow([{ id: "group", type: "compositionGroup", editorName: "Group 1", children: [rich], layout: {} } as never], [SECTION_SPECIALIZED_REFERENCE, { kind: "element", id: "group" }])
      : flow([rich as never], [SECTION_SPECIALIZED_REFERENCE, { kind: "element", id: "rich" }]);
    const session = createTextEditSession();
    const update = vi.fn((document: typeof original) => {
      const latest = findSectionElement(current, "rich");
      if (latest?.type === "text") current = updateSectionElement(current, { ...latest, document });
    });
    const blur = (document: typeof original) => commitPendingTextEdit(session, () => document, update);

    expect(blur({ type: "doc", children: [{ type: "paragraph", children: [{ text: "stale empty snapshot" }] }] })).toBe(false);
    expect((findSectionElement(current, "rich") as typeof rich).document).toEqual(original);

    const changes = [
      { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Original Tablet content", marks: { bold: true } }] }] },
      { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Edited Tablet content" }] }] },
      { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "" }] }] },
    ];
    for (const document of changes) {
      session.markDirty();
      expect(blur(document as typeof original)).toBe(true);
      expect(blur(document as typeof original)).toBe(false);
      expect((findSectionElement(current, "rich") as typeof rich).document).toEqual(document);
    }
    expect(update).toHaveBeenCalledTimes(changes.length);
  });

  it("adds after the selected unit and preserves stable IDs while editing", () => {
    const added = insertSectionElement(undefined, text("a"), SECTION_SPECIALIZED_REFERENCE);
    expect(added.order).toEqual([SECTION_SPECIALIZED_REFERENCE, { kind: "element", id: "a" }]);
    const edited = updateSectionElement(added, text("a", "edited"));
    expect(edited.order).toEqual(added.order);
    expect(edited.elements[0]).toMatchObject({ id: "a", document: { children: [{ children: [{ text: "edited" }] }] } });
  });

  it("stores hidden state sparsely and preserves it through save/reload", () => {
    const initial = flow([text("a")]);
    const hidden = setSectionElementHidden(initial, "a", true);
    expect(findSectionElement(hidden, "a")?.isHidden).toBe(true);
    const reloaded = sectionChildFlowSchema.parse(JSON.parse(JSON.stringify(hidden)));
    expect(findSectionElement(reloaded, "a")?.isHidden).toBe(true);
    const shown = setSectionElementHidden(reloaded, "a", false);
    expect(findSectionElement(shown, "a")?.isHidden).toBeUndefined();
  });

  it("duplicates directly after the source with a fresh ID", () => {
    const result = duplicateSectionElement(flow(), "a");
    expect(result).not.toBeNull();
    expect(result!.elementId).not.toBe("a");
    expect(findSectionElement(result!.flow, result!.elementId)).toMatchObject({ editorName: "Text 2" });
    expect(result!.flow.order[2]).toEqual({ kind: "element", id: result!.elementId });
  });

  it("preserves sparse Date identity and state through lifecycle operations", () => {
    const date = { id: "date-1", type: "date" as const, editorName: "Ceremony day", isHidden: true };
    const initial: SectionChildFlow = { elements: [date], order: [{ kind: "element", id: date.id }] };
    const renamed = renameSectionElement(initial, date.id, "Wedding date");
    const duplicated = duplicateSectionElement(renamed, date.id);
    expect(duplicated).not.toBeNull();
    if (!duplicated) return;
    expect(findSectionElement(duplicated.flow, date.id)).toEqual({ ...date, editorName: "Wedding date" });
    expect(findSectionElement(duplicated.flow, duplicated.elementId)).toMatchObject({ type: "date", editorName: "Date 1", isHidden: true });
    expect(genericTextSectionChildFlowSchema.parse(JSON.parse(JSON.stringify(duplicated.flow)))).toEqual(duplicated.flow);
  });

  it("deletes only the element and falls back to specialized selection", () => {
    expect(deleteSectionElement(flow(), "a")).toEqual({ flow: { elements: [], order: [SECTION_SPECIALIZED_REFERENCE] }, selection: SECTION_SPECIALIZED_REFERENCE });
  });

  it("persists an empty generic-only flow after deleting its final block", () => {
    const generic = { elements: [text("a")], order: [{ kind: "element" as const, id: "a" }] };
    expect(deleteGenericSectionElement(generic, "a")).toEqual({ flow: { elements: [], order: [] } });
    expect(genericTextSectionChildFlowSchema.safeParse(deleteGenericSectionElement(generic, "a").flow).success).toBe(true);
  });

  it("moves specialized content around Text without changing elements", () => {
    const candidate = flow([text("a"), text("b")], [SECTION_SPECIALIZED_REFERENCE, { kind: "element", id: "a" }, { kind: "element", id: "b" }]);
    const moved = moveSectionChild(candidate, SECTION_SPECIALIZED_REFERENCE, 1);
    expect(moved.order).toEqual([{ kind: "element", id: "a" }, SECTION_SPECIALIZED_REFERENCE, { kind: "element", id: "b" }]);
    expect(moved.elements).toEqual(candidate.elements);
  });

  it("creates semantic Text IDs without persisted defaults", () => expect(createTextElement("Text 1")).toMatchObject({ type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: ""  }] }] }}));
});
