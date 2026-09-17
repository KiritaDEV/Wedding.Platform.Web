import type { CompositionGroup } from "../../websiteElements/types";
import {
  createSectionElement,
  duplicateWebsiteElement,
  findSectionElement,
  moveSectionElement,
  reorderSectionChild,
  updateGroupChildren,
  type SectionChildFlow,
  type SectionChildReference,
} from "../sectionChildFlow";

export const GROUP_CHILD_LIMIT = 20;

/**
 * Applies a same-parent root drop through the canonical child-flow ordering
 * operation. Root sorting must not relocate elements or depend on whether the
 * flow contains specialized content.
 */
export function reorderRootSectionElement(
  flow: SectionChildFlow,
  activeElementId: string,
  over: SectionChildReference,
): SectionChildFlow {
  const active = flow.order.find(
    (reference) =>
      reference.kind === "element" && reference.id === activeElementId,
  );
  return active ? reorderSectionChild(flow, active, over) : flow;
}

export type GroupAddKind = "text" | "date" | "accordion" | "schedule" | "people" | "divider" | "media" | "group";

export const groupAddKinds = (depth: number): readonly GroupAddKind[] => depth < 2
  ? ["text", "date", "accordion", "schedule", "people", "divider", "media", "group"]
  : ["text", "date", "accordion", "schedule", "people", "divider", "media"];

export function addToGroup(
  group: CompositionGroup,
  kind: GroupAddKind,
  flow: SectionChildFlow,
  onChange: (flow: SectionChildFlow) => void,
  onSelect: (reference: SectionChildReference) => void,
): boolean {
  if (group.children.length >= GROUP_CHILD_LIMIT) return false;
  const child = createSectionElement(flow, kind === "group" ? "compositionGroup" : kind);
  onChange(updateGroupChildren(flow, group.id, [...group.children, child as typeof group.children[number]]));
  onSelect({ kind: "element", id: child.id });
  return true;
}

export function duplicateGroupChild(
  group: CompositionGroup,
  childId: string,
  flow: SectionChildFlow,
  onChange: (flow: SectionChildFlow) => void,
  onSelect: (reference: SectionChildReference) => void,
): boolean {
  if (group.children.length >= GROUP_CHILD_LIMIT) return false;
  const index = group.children.findIndex(({ id }) => id === childId);
  if (index < 0) return false;
  const duplicate = duplicateWebsiteElement(flow, group.children[index]) as typeof group.children[number];
  const children = [...group.children];
  children.splice(index + 1, 0, duplicate);
  onChange(updateGroupChildren(flow, group.id, children));
  onSelect({ kind: "element", id: duplicate.id });
  return true;
}

export function deleteGroupChild(
  group: CompositionGroup,
  childId: string,
  flow: SectionChildFlow,
  selectedElementId: string | undefined,
  onChange: (flow: SectionChildFlow) => void,
  onSelect: (reference: SectionChildReference) => void,
): boolean {
  const index = group.children.findIndex(({ id }) => id === childId);
  if (index < 0) return false;
  const removed = group.children[index];
  const selectionIsRemoved = Boolean(selectedElementId && containsElement(removed, selectedElementId));
  const children = group.children.filter(({ id }) => id !== childId);
  onChange(updateGroupChildren(flow, group.id, children));
  if (selectionIsRemoved) {
    const fallback = children[index] ?? children[index - 1];
    onSelect({ kind: "element", id: fallback?.id ?? group.id });
  }
  return true;
}

function containsElement(element: CompositionGroup["children"][number], elementId: string): boolean {
  return element.id === elementId || (element.type === "compositionGroup" && element.children.some((child) => containsElement(child, elementId)));
}

export function reorderGroupChildren(group: CompositionGroup, from: number, to: number) {
  if (from < 0 || to < 0 || from >= group.children.length || to >= group.children.length || from === to) return group.children;
  const children = [...group.children];
  const [moved] = children.splice(from, 1);
  children.splice(to, 0, moved);
  return children;
}

/** Reorders siblings in one owning Group without relocating their tree nodes. */
export function reorderGroupChildInFlow(
  flow: SectionChildFlow,
  parentId: string,
  activeElementId: string,
  overIndex: number,
): SectionChildFlow {
  const group = findSectionElement(flow, parentId);
  if (group?.type !== "compositionGroup") return flow;
  const from = group.children.findIndex(({ id }) => id === activeElementId);
  const children = reorderGroupChildren(group, from, overIndex);
  return children === group.children
    ? flow
    : updateGroupChildren(flow, parentId, children);
}

export function applyStructureElementDrop(
  flow: SectionChildFlow,
  elementId: string,
  destination: { parentId: string | null; index: number },
  onChange: (flow: SectionChildFlow) => void,
  onSelect: (reference: SectionChildReference) => void,
): boolean {
  const moved = moveSectionElement(flow, elementId, destination);
  if (!moved.ok) return false;
  onChange(moved.flow);
  onSelect({ kind: "element", id: elementId });
  return true;
}
