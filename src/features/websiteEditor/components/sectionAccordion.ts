export function resolveExpandedSectionId(
  sectionIds: readonly string[],
  selectedSectionId: string | null,
) {
  return selectedSectionId && sectionIds.includes(selectedSectionId)
    ? selectedSectionId
    : (sectionIds[0] ?? null);
}

export function resolveSelectionOwnerId(
  selectedSectionId: string | null,
  selectedChildSectionId?: string,
) {
  return selectedChildSectionId ?? selectedSectionId;
}

export function toggleExpandedSectionId(
  currentSectionId: string | null,
  sectionId: string,
  expanded: boolean,
) {
  if (expanded) return sectionId;
  return currentSectionId === sectionId ? null : currentSectionId;
}
