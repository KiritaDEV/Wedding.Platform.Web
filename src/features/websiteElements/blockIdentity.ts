import type { WebsiteElement } from "./types";

export const GENERIC_BLOCK_LABELS = {
  text: "Text",
  date: "Date",
  accordion: "Accordion",
  schedule: "Schedule",
  people: "People",
  countdown: "Countdown",
  media: "Media",
  divider: "Divider",
  compositionGroup: "Group",
} as const;

export type GenericBlockType = keyof typeof GENERIC_BLOCK_LABELS;

export function normalizeEditorName(value: string): string {
  return value.trim().replace(/\s+/gu, " ");
}

export function isGenericBlock(element: WebsiteElement): element is WebsiteElement & { type: GenericBlockType; editorName: string } {
  return element.type in GENERIC_BLOCK_LABELS;
}
