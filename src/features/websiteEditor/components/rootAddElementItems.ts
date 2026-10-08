import { GENERIC_BLOCK_LABELS, type GenericBlockType } from "../../websiteElements/blockIdentity";
import { createSectionElement, insertSectionElement, type SectionChildFlow, type SectionChildReference } from "../sectionChildFlow";

export const ROOT_ADD_ELEMENT_ORDER = ["text", "date", "accordion", "schedule", "people", "countdown", "divider", "media", "compositionGroup"] as const satisfies readonly GenericBlockType[];

export function rootAddElementItems(allowedTypes: readonly GenericBlockType[]) {
  return ROOT_ADD_ELEMENT_ORDER.filter((type) => allowedTypes.includes(type)).map((type) => ({ type, label: GENERIC_BLOCK_LABELS[type] }));
}

export function createRootAddResult(flow: SectionChildFlow | undefined, type: GenericBlockType, after?: SectionChildReference) {
  const element = createSectionElement(flow, type);
  return { element, flow: insertSectionElement(flow, element, after) };
}
