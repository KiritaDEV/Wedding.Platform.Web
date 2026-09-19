import { z } from "zod";
import { createSemanticId } from "./createSemanticId";
import { websiteElementTreeSchema } from "../websiteElements/schemas";
import type { CompositionGroup, DateElement, DividerElement, MediaElement, TextElement, WebsiteElement } from "../websiteElements/types";
import { canonicalizeTextDocument } from "../websiteElements/textDocument";
import { GENERIC_BLOCK_LABELS, isGenericBlock, normalizeEditorName, type GenericBlockType } from "../websiteElements/blockIdentity";

export const SECTION_SPECIALIZED_REFERENCE = { kind: "specialized", key: "content" } as const;

const specializedReferenceSchema = z.object({
  kind: z.literal("specialized"),
  key: z.literal("content"),
}).strict();

const elementReferenceSchema = z.object({
  kind: z.literal("element"),
  id: z.string().min(1).max(255),
}).strict();

export const sectionChildReferenceSchema = z.discriminatedUnion("kind", [
  specializedReferenceSchema,
  elementReferenceSchema,
]);

const childFlowShapeSchema = z.object({
  elements: websiteElementTreeSchema.max(20),
  order: z.array(sectionChildReferenceSchema).max(21),
}).strict();

function validateChildFlowReferences(flow: z.infer<typeof childFlowShapeSchema>, context: z.RefinementCtx, requiresSpecializedContent: boolean) {
  const specialized = flow.order.filter(({ kind }) => kind === "specialized");
  const expected = requiresSpecializedContent ? 1 : 0;
  if (specialized.length !== expected) context.addIssue({ code: "custom", path: ["order"], message: requiresSpecializedContent ? "Child flow must contain exactly one specialized content reference." : "Generic-only child flow cannot contain a specialized content reference." });
  const ids = flow.elements.map(({ id }) => id);
  const references = flow.order.flatMap((reference) => reference.kind === "element" ? [reference.id] : []);
  if (new Set(references).size !== references.length) context.addIssue({ code: "custom", path: ["order"], message: "Child flow element references must be unique." });
  if (references.length !== ids.length || references.some((id) => !ids.includes(id)) || ids.some((id) => !references.includes(id))) {
    context.addIssue({ code: "custom", path: ["order"], message: "Child flow order must reference every element exactly once." });
  }
}

export const sectionChildFlowSchema = childFlowShapeSchema.superRefine((flow, context) => validateChildFlowReferences(flow, context, true));
export const genericSectionChildFlowSchema = childFlowShapeSchema.superRefine((flow, context) => validateChildFlowReferences(flow, context, false));

export const textSectionChildFlowSchema = sectionChildFlowSchema.superRefine((flow, context) => {
  flow.elements.forEach((element, index) => {
    if (element.type !== "text" && element.type !== "date" && element.type !== "accordion" && element.type !== "schedule" && element.type !== "people" && element.type !== "divider" && element.type !== "media" && element.type !== "compositionGroup") context.addIssue({ code: "custom", path: ["elements", index, "type"], message: `Element type ${element.type} is not allowed in this Section.` });
  });
});

export const genericTextSectionChildFlowSchema = genericSectionChildFlowSchema.superRefine((flow, context) => {
  flow.elements.forEach((element, index) => {
    if (element.type !== "text" && element.type !== "date" && element.type !== "accordion" && element.type !== "schedule" && element.type !== "people" && element.type !== "divider" && element.type !== "media" && element.type !== "compositionGroup") context.addIssue({ code: "custom", path: ["elements", index, "type"], message: `Element type ${element.type} is not allowed in this Section.` });
  });
});

export const gallerySectionChildFlowSchema = sectionChildFlowSchema.superRefine((flow, context) => {
  const visit = (element: WebsiteElement, path: (string | number)[]) => {
    if (element.type !== "text" && element.type !== "divider" && element.type !== "compositionGroup") {
      context.addIssue({ code: "custom", path, message: `Element type ${element.type} is not allowed in Gallery.` });
    }
    if (element.type === "compositionGroup") element.children.forEach((child, index) => visit(child, [...path, "children", index, "type"]));
  };
  flow.elements.forEach((element, index) => visit(element, ["elements", index, "type"]));
});

export type SectionChildReference = z.infer<typeof sectionChildReferenceSchema>;
export type SectionChildFlow = z.infer<typeof sectionChildFlowSchema>;
export type SectionElementDestination = { parentId: string | null; index: number };
export type SectionElementMoveResult =
  | { ok: true; flow: SectionChildFlow }
  | { ok: false; reason: "source-not-found" | "destination-not-found" | "cycle" | "invalid-destination" };
export type SectionElementMoveDestination = {
  parentId: string | null;
  index: number;
  label: string;
  revealGroupIds: string[];
};

export function resolveSectionChildOrder(flow?: SectionChildFlow): SectionChildReference[] {
  return flow ? flow.order : [SECTION_SPECIALIZED_REFERENCE];
}

/**
 * Remove transient browser/editor fields from Text before it crosses the API
 * boundary. This also applies to Text nested within Groups.
 */
export function canonicalizeSectionChildFlowText(flow: SectionChildFlow): SectionChildFlow {
  const canonicalize = (element: WebsiteElement): WebsiteElement => element.type === "text"
    ? { ...element, document: canonicalizeTextDocument(element.document) }
    : element.type === "compositionGroup"
      ? { ...element, children: element.children.map(canonicalize) } as WebsiteElement
      : element;
  return { ...flow, elements: flow.elements.map(canonicalize) };
}

export function visitGenericBlocks(elements: readonly WebsiteElement[], visitor: (element: WebsiteElement & { type: GenericBlockType; editorName: string }) => void): void {
  const visit = (element: WebsiteElement) => {
    if (!isGenericBlock(element)) return;
    visitor(element);
    if (element.type === "compositionGroup") element.children.forEach(visit);
  };
  elements.forEach(visit);
}

function automaticNameState(flow?: SectionChildFlow): Record<GenericBlockType, number> {
  const state = { text: 0, date: 0, accordion: 0, schedule: 0, people: 0, media: 0, divider: 0, compositionGroup: 0 };
  if (!flow) return state;
  visitGenericBlocks(flow.elements, (element) => {
    const match = new RegExp(`^${GENERIC_BLOCK_LABELS[element.type].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} ([1-9]\\d*)$`).exec(element.editorName);
    if (match) state[element.type] = Math.max(state[element.type], Number(match[1]));
  });
  return state;
}

function nextAutomaticName(type: GenericBlockType, state: Record<GenericBlockType, number>): string {
  state[type] += 1;
  return `${GENERIC_BLOCK_LABELS[type]} ${state[type]}`;
}

export function createTextElement(editorName: string): TextElement {
  return { id: createSemanticId("text"), type: "text", editorName, document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "" }] }] } };
}

export function createDateElement(editorName: string): DateElement {
  return { id: createSemanticId("date"), type: "date", editorName };
}

export function createAccordionElement(editorName: string): import("../websiteElements/types").AccordionElement {
  return { id: createSemanticId("accordion"), type: "accordion", editorName, items: [] };
}

export function createScheduleElement(editorName: string): import("../websiteElements/types").ScheduleElement {
  return { id: createSemanticId("schedule"), type: "schedule", editorName, items: [] };
}

export function createPeopleElement(editorName: string): import("../websiteElements/types").PeopleElement {
  return { id: createSemanticId("people"), type: "people", editorName, groups: [] };
}

export function createDividerElement(editorName: string): DividerElement {
  return { id: createSemanticId("divider"), type: "divider", editorName };
}

export function createMediaElement(editorName: string, mediaId?: string): MediaElement {
  return { id: createSemanticId("media"), type: "media", editorName, items: mediaId ? [{ id: createSemanticId("media-item"), type: "image", mediaId, alt: "Image" }] : [] };
}

export function createGroupElement(editorName: string): CompositionGroup {
  return { id: createSemanticId("group"), type: "compositionGroup", editorName, children: [] };
}

export function createSectionElement(flow: SectionChildFlow | undefined, type: GenericBlockType, mediaId?: string): WebsiteElement & { editorName: string } {
  const editorName = nextAutomaticName(type, automaticNameState(flow));
  if (type === "text") return createTextElement(editorName);
  if (type === "date") return createDateElement(editorName);
  if (type === "accordion") return createAccordionElement(editorName);
  if (type === "schedule") return createScheduleElement(editorName);
  if (type === "people") return createPeopleElement(editorName);
  if (type === "divider") return createDividerElement(editorName);
  if (type === "media") return createMediaElement(editorName, mediaId);
  return createGroupElement(editorName);
}

export function insertSectionElement(flow: SectionChildFlow | undefined, element: WebsiteElement, after?: SectionChildReference): SectionChildFlow {
  const current: SectionChildFlow = flow ? structuredClone(flow) : { elements: [], order: [SECTION_SPECIALIZED_REFERENCE] };
  const index = after ? current.order.findIndex((reference) => sameReference(reference, after)) : current.order.length - 1;
  current.elements.push(element);
  current.order.splice(index >= 0 ? index + 1 : current.order.length, 0, { kind: "element", id: element.id });
  return current;
}

export function updateSectionElement(flow: SectionChildFlow, element: WebsiteElement): SectionChildFlow {
  return { ...flow, elements: flow.elements.map((current) => updateElementTree(current, element)) };
}

export function setSectionElementHidden(flow: SectionChildFlow, elementId: string, hidden: boolean): SectionChildFlow {
  const current = findSectionElement(flow, elementId);
  if (!current) return flow;
  const next = { ...current };
  if (hidden) next.isHidden = true;
  else delete next.isHidden;
  return updateSectionElement(flow, next);
}

export function renameSectionElement(flow: SectionChildFlow, elementId: string, requestedName: string): SectionChildFlow {
  const current = findSectionElement(flow, elementId);
  if (!current || !isGenericBlock(current)) return flow;
  const normalized = normalizeEditorName(requestedName);
  if (Array.from(normalized).length > 80) return flow;
  const editorName = normalized || nextAutomaticName(current.type, automaticNameState(flow));
  return updateSectionElement(flow, { ...current, editorName });
}

function updateElementTree(current: WebsiteElement, replacement: WebsiteElement): WebsiteElement {
  if (current.id === replacement.id) return replacement;
  if (current.type !== "compositionGroup") return current;
  return { ...current, children: current.children.map((child) => updateElementTree(child, replacement)) } as WebsiteElement;
}

export function findSectionElement(flow: SectionChildFlow | undefined, id: string): WebsiteElement | undefined {
  const visit = (element: WebsiteElement): WebsiteElement | undefined => element.id === id ? element : element.type === "compositionGroup" ? element.children.map(visit).find(Boolean) : undefined;
  return flow?.elements.map(visit).find(Boolean);
}

export function updateSectionTextAppearance(flow: SectionChildFlow, elementId: string, appearance: TextElement["appearance"]): SectionChildFlow | null {
  const current = findSectionElement(flow, elementId);
  if (current?.type !== "text") return null;
  const next = { ...current };
  if (appearance === undefined) delete next.appearance;
  else next.appearance = appearance;
  return updateSectionElement(flow, next);
}

export function updateSectionTextDocument(flow: SectionChildFlow, elementId: string, document: TextElement["document"]): SectionChildFlow | null {
  const current = findSectionElement(flow, elementId);
  return current?.type === "text" ? updateSectionElement(flow, { ...current, document }) : null;
}

export function addGroupChild(flow: SectionChildFlow, groupId: string, child: WebsiteElement): SectionChildFlow {
  const group = findSectionElement(flow, groupId);
  return group?.type === "compositionGroup" ? updateSectionElement(flow, { ...group, children: [...group.children, child] } as WebsiteElement) : flow;
}

export function updateGroupChildren(flow: SectionChildFlow, groupId: string, children: WebsiteElement[]): SectionChildFlow {
  const group = findSectionElement(flow, groupId);
  return group?.type === "compositionGroup" ? updateSectionElement(flow, { ...group, children } as WebsiteElement) : flow;
}

export function ungroupSectionElement(flow: SectionChildFlow, groupId: string): SectionChildFlow {
  const group = flow.elements.find((element) => element.id === groupId);
  if (group?.type !== "compositionGroup") {
    const ungroupNested = (element: WebsiteElement): WebsiteElement => element.type !== "compositionGroup" ? element : { ...element, children: element.children.flatMap((child) => child.id === groupId && child.type === "compositionGroup" ? child.children : [ungroupNested(child)]) } as WebsiteElement;
    return { ...flow, elements: flow.elements.map(ungroupNested) };
  }
  const referenceIndex = flow.order.findIndex((reference) => reference.kind === "element" && reference.id === groupId);
  if (referenceIndex < 0) return flow;
  const order = [...flow.order];
  order.splice(referenceIndex, 1, ...group.children.map(({ id }) => ({ kind: "element" as const, id })));
  return { elements: flow.elements.flatMap((element) => element.id === groupId ? group.children : [element]), order };
}

export function deleteSectionElement(flow: SectionChildFlow, elementId: string): { flow?: SectionChildFlow; selection: SectionChildReference } {
  const index = flow.order.findIndex((reference) => reference.kind === "element" && reference.id === elementId);
  const order = flow.order.filter((reference) => !(reference.kind === "element" && reference.id === elementId));
  const elements = flow.elements.filter(({ id }) => id !== elementId);
  return { flow: elements.length ? { elements, order } : undefined, selection: order[Math.min(Math.max(index, 0), order.length - 1)] ?? SECTION_SPECIALIZED_REFERENCE };
}

export function deleteGenericSectionElement(flow: SectionChildFlow, elementId: string): { flow: SectionChildFlow; selection?: SectionChildReference } {
  const result = deleteSectionElement(flow, elementId);
  return result.flow
    ? { flow: result.flow, selection: result.selection }
    : { flow: { elements: [], order: [] } };
}

export function duplicateSectionElement(flow: SectionChildFlow, elementId: string): { flow: SectionChildFlow; elementId: string } | null {
  const source = flow.elements.find(({ id }) => id === elementId);
  if (!source || flow.elements.length >= 20) return null;
  const duplicate = regenerateElementIdentities(structuredClone(source), automaticNameState(flow));
  return { flow: insertSectionElement(flow, duplicate, { kind: "element", id: elementId }), elementId: duplicate.id };
}

export function reorderSectionChild(flow: SectionChildFlow, active: SectionChildReference, over: SectionChildReference): SectionChildFlow {
  const order = [...flow.order];
  const from = order.findIndex((reference) => sameReference(reference, active));
  const to = order.findIndex((reference) => sameReference(reference, over));
  if (from < 0 || to < 0 || from === to) return flow;
  const [reference] = order.splice(from, 1);
  order.splice(to, 0, reference);
  return { ...flow, order };
}

export function moveSectionChild(flow: SectionChildFlow, reference: SectionChildReference, direction: -1 | 1): SectionChildFlow {
  const index = flow.order.findIndex((candidate) => sameReference(candidate, reference));
  const target = index + direction;
  return index < 0 || target < 0 || target >= flow.order.length ? flow : reorderSectionChild(flow, reference, flow.order[target]);
}

export function moveSectionElement(
  flow: SectionChildFlow,
  elementId: string,
  destination: SectionElementDestination,
): SectionElementMoveResult {
  const source = findSectionElement(flow, elementId);
  if (!source || !isGenericBlock(source)) return { ok: false, reason: "source-not-found" };
  if (destination.parentId === elementId) return { ok: false, reason: "cycle" };
  if (destination.parentId && elementContainsId(source, destination.parentId)) return { ok: false, reason: "cycle" };
  if (destination.parentId) {
    const destinationParent = findSectionElement(flow, destination.parentId);
    if (destinationParent?.type !== "compositionGroup") return { ok: false, reason: "destination-not-found" };
  }

  const candidate = structuredClone(flow);
  const detached = detachSectionElement(candidate, elementId);
  if (!detached) return { ok: false, reason: "source-not-found" };
  const inserted = insertMovedSectionElement(detached.flow, detached.element, destination);
  const flowSchema = flow.order.some(({ kind }) => kind === "specialized")
    ? sectionChildFlowSchema
    : genericSectionChildFlowSchema;
  if (!inserted || !flowSchema.safeParse(inserted).success) {
    return { ok: false, reason: "invalid-destination" };
  }
  return { ok: true, flow: inserted };
}

export function getValidSectionElementMoveDestinations(
  flow: SectionChildFlow,
  elementId: string,
): SectionElementMoveDestination[] {
  const sourceParentId = findSectionElementParentId(flow, elementId);
  if (sourceParentId === undefined) return [];
  const candidates: Array<SectionElementMoveDestination & { baseLabel: string }> = [];
  if (sourceParentId !== null) {
    const lastGenericIndex = flow.order.findLastIndex(({ kind }) => kind === "element");
    candidates.push({ parentId: null, index: lastGenericIndex >= 0 ? lastGenericIndex + 1 : flow.order.length, label: "Section root", baseLabel: "Section root", revealGroupIds: [] });
  }
  const visit = (element: WebsiteElement, path: string[], groupIds: string[]) => {
    if (element.type !== "compositionGroup") return;
    const nextPath = [...path, element.editorName];
    const nextGroupIds = [...groupIds, element.id];
    if (element.id !== sourceParentId) {
      const label = nextPath.join(" / ");
      candidates.push({ parentId: element.id, index: element.children.length, label, baseLabel: label, revealGroupIds: nextGroupIds });
    }
    element.children.forEach((child) => visit(child, nextPath, nextGroupIds));
  };
  flow.elements.forEach((element) => visit(element, [], []));
  const valid = candidates.filter(({ parentId, index }) => moveSectionElement(flow, elementId, { parentId, index }).ok);
  const totals = valid.reduce<Record<string, number>>((counts, destination) => {
    counts[destination.baseLabel] = (counts[destination.baseLabel] ?? 0) + 1;
    return counts;
  }, {});
  const occurrences: Record<string, number> = {};
  return valid.map(({ baseLabel, ...destination }) => {
    occurrences[baseLabel] = (occurrences[baseLabel] ?? 0) + 1;
    return {
      ...destination,
      label: totals[baseLabel] > 1 ? `${baseLabel} (${occurrences[baseLabel]})` : destination.label,
    };
  });
}

function findSectionElementParentId(flow: SectionChildFlow, elementId: string): string | null | undefined {
  if (flow.elements.some(({ id }) => id === elementId)) return null;
  let parentId: string | undefined;
  const visit = (element: WebsiteElement) => {
    if (parentId || element.type !== "compositionGroup") return;
    if (element.children.some(({ id }) => id === elementId)) {
      parentId = element.id;
      return;
    }
    element.children.forEach(visit);
  };
  flow.elements.forEach(visit);
  return parentId;
}

function elementContainsId(element: WebsiteElement, id: string): boolean {
  return element.id === id || (element.type === "compositionGroup" && element.children.some((child) => elementContainsId(child, id)));
}

function detachSectionElement(flow: SectionChildFlow, elementId: string): { flow: SectionChildFlow; element: WebsiteElement } | null {
  const rootIndex = flow.elements.findIndex(({ id }) => id === elementId);
  if (rootIndex >= 0) {
    const [element] = flow.elements.splice(rootIndex, 1);
    flow.order = flow.order.filter((reference) => reference.kind !== "element" || reference.id !== elementId);
    return { flow, element };
  }
  let detached: WebsiteElement | undefined;
  const visit = (element: WebsiteElement): void => {
    if (detached || element.type !== "compositionGroup") return;
    const index = element.children.findIndex(({ id }) => id === elementId);
    if (index >= 0) {
      [detached] = element.children.splice(index, 1);
      return;
    }
    element.children.forEach(visit);
  };
  flow.elements.forEach(visit);
  return detached ? { flow, element: detached } : null;
}

function insertMovedSectionElement(
  flow: SectionChildFlow,
  element: WebsiteElement,
  destination: SectionElementDestination,
): SectionChildFlow | null {
  if (!Number.isInteger(destination.index) || destination.index < 0) return null;
  if (destination.parentId === null) {
    if (destination.index > flow.order.length) return null;
    const elementIndex = flow.order.slice(0, destination.index).filter(({ kind }) => kind === "element").length;
    flow.elements.splice(elementIndex, 0, element);
    flow.order.splice(destination.index, 0, { kind: "element", id: element.id });
    return flow;
  }
  const parent = findSectionElement(flow, destination.parentId);
  if (parent?.type !== "compositionGroup" || destination.index > parent.children.length) return null;
  parent.children.splice(destination.index, 0, element as CompositionGroup["children"][number]);
  return flow;
}

function sameReference(first: SectionChildReference, second: SectionChildReference) {
  return first.kind === second.kind && (first.kind === "specialized" ? second.kind === "specialized" : second.kind === "element" && first.id === second.id);
}

function regenerateElementIdentities(element: WebsiteElement, names: Record<GenericBlockType, number>, regenerateNames = true): WebsiteElement {
  element.id = createSemanticId(element.type === "compositionGroup" ? "group" : element.type);
  if (regenerateNames && isGenericBlock(element)) element.editorName = nextAutomaticName(element.type, names);
  if (element.type === "media") element.items.forEach((item) => { item.id = createSemanticId("media-item"); });
  if (element.type === "accordion") element.items.forEach((item) => { item.id = createSemanticId("accordion-item"); });
  if (element.type === "schedule") element.items.forEach((item) => { item.id = createSemanticId("schedule-item"); });
  if (element.type === "people") element.groups.forEach((group) => {
    group.id = createSemanticId("people-group");
    group.people.forEach((person) => { person.id = createSemanticId("person"); });
  });
  if (element.type === "compositionGroup") element.children.forEach((child) => regenerateElementIdentities(child, names, regenerateNames));
  return element;
}

export function regenerateSectionCompositionIdentities(composition: import('./types').SectionComposition): import('./types').SectionComposition {
  const next = structuredClone(composition);
  const rootIds = new Map<string, string>();
  next.childFlow.elements.forEach((element) => {
    const previousId = element.id;
    regenerateElementIdentities(element, automaticNameState(), false);
    rootIds.set(previousId, element.id);
  });
  next.childFlow.order = next.childFlow.order.map((reference) => reference.kind === "element"
    ? { ...reference, id: rootIds.get(reference.id) ?? reference.id }
    : reference);
  return next;
}

export function duplicateWebsiteElement<T extends WebsiteElement>(flow: SectionChildFlow, element: T): T {
  return regenerateElementIdentities(structuredClone(element), automaticNameState(flow)) as T;
}
