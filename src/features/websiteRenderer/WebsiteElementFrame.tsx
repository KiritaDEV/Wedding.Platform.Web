import { EditorSelectionFrame } from "./EditorSelectionFrame";
import { nearestEditorHitFrame } from "./editorHitTarget";
import { resolveElementInlineAlignment } from "./elementInlineAlignment";
import type { CSSProperties } from "react";

export function WebsiteElementFrame({
  mode,
  sectionId,
  elementId,
  elementType,
  selected,
  children,
  onSelect,
  onEdit,
  inlineAlignment,
}: {
  mode: "editor" | "public";
  sectionId: string;
  elementId: string;
  elementType: string;
  selected: boolean;
  children: React.ReactNode;
  onSelect?: (sectionId: string, elementId: string) => void;
  onEdit?: (sectionId: string, elementId: string) => void;
  inlineAlignment?: CSSProperties["justifyContent"];
}) {
  const stretchesWidth = elementType === "text" || elementType === "accordion" || elementType === "schedule" || elementType === "people" || elementType === "divider";
  const placesConstrainedChild = elementType === "Group" || elementType === "compositionGroup";
  const placementStyle = placesConstrainedChild ? { display: "flex", justifyContent: inlineAlignment ?? resolveElementInlineAlignment("center") } : undefined;
  if (mode === "public")
    return (
      <div
        className={stretchesWidth || placesConstrainedChild ? "w-full" : undefined}
        style={placementStyle}
        data-section-generic-child
        data-section-child-element={elementId}
      >
        {children}
      </div>
    );

  const label =
    elementType === "text"
        ? "Text"
        : elementType === "divider"
          ? "Divider"
        : elementType === "media"
          ? "Media"
        : elementType === "compositionGroup"
          ? "Group"
          : elementType;

  return (
    <div
      className={`editor-selection-target relative rounded-sm${stretchesWidth || placesConstrainedChild ? " w-full" : ""}`}
      style={placementStyle}
      data-section-generic-child
      data-section-child-element={elementId}
      data-editor-website-element={elementId}
      data-editor-section-id={sectionId}
      data-editor-selected={selected ? "true" : undefined}
      aria-label={`Edit ${label}`}
      onPointerDown={(event) => {
        event.stopPropagation();
        if (selected) onEdit?.(sectionId, elementId);
        else onSelect?.(sectionId, elementId);
      }}
      onClickCapture={(event) => {
        if (event.detail === 0) {
          if (selected) onEdit?.(sectionId, elementId);
          else onSelect?.(sectionId, elementId);
        }
      }}
      onClick={(event) => event.stopPropagation()}
    >
      {elementType === "divider" && <span
        aria-hidden="true"
        data-editor-divider-hit-area
        className="editor-divider-hit-area"
        onPointerDown={(event) => {
          event.stopPropagation();
          const frame = event.currentTarget.parentElement!;
          const target = nearestEditorHitFrame(frame, frame.ownerDocument.elementsFromPoint(event.clientX, event.clientY), event.clientX, event.clientY);
          const targetId = target.dataset.editorWebsiteElement!;
          const targetSection = target.dataset.editorSectionId ?? sectionId;
          if (target === frame && selected) onEdit?.(sectionId, elementId);
          else onSelect?.(targetSection, targetId);
        }}
      />}
      <button
        type="button"
        className="editor-element-badge"
        aria-label={`Select ${label}`}
        title={`Select ${label}`}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onSelect?.(sectionId, elementId);
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {label}
      </button>
      {children}
      <EditorSelectionFrame selected={selected} />
    </div>
  );
}
