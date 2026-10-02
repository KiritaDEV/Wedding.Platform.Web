export type SectionInspectorPanelMode = "content" | "appearance";

export function isSurfaceOnlyParentSelection(sectionType: string, specializedSelected: boolean): boolean {
  return (sectionType === "gallery" || sectionType === "rsvp") && !specializedSelected;
}

export function resolveOwnedInspectorPanelMode(sectionType: string, specializedSelected: boolean, requested: SectionInspectorPanelMode): SectionInspectorPanelMode {
  return isSurfaceOnlyParentSelection(sectionType, specializedSelected) ? "appearance" : requested;
}
