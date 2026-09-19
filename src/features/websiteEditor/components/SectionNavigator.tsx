import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  SquareDashed,
  Trash2,
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Heading } from "../../../components/ui/Heading";
import { Button } from "../../../components/ui/Button";
import { IconButton } from "../../../components/ui/IconButton";
import { Text } from "../../../components/ui/Text";
import { Tooltip } from "../../../components/ui/Tooltip";
import type { WebsiteSection } from "../types";
import { SectionChildList } from "./SectionChildList";
import {
  SECTION_SPECIALIZED_REFERENCE,
  createSectionElement,
  deleteGenericSectionElement,
  deleteSectionElement,
  duplicateSectionElement,
  insertSectionElement,
  type SectionChildFlow,
  type SectionChildReference,
} from "../sectionChildFlow";
import {
  StructureActionMenu,
  StructureMenuAction,
} from "./StructureActionMenu";
import {
  resolveExpandedSectionId,
  resolveSelectionOwnerId,
  toggleExpandedSectionId,
} from "./sectionAccordion";
import { revealStructureRow } from "./structureReveal";
import type { GenericBlockType } from "../../websiteElements/blockIdentity";
import { SortableDragHandle } from "./SortableDragHandle";
type Props = {
  sections: WebsiteSection[];
  selectedId: string | null;
  workingChildFlow: { sectionId: string; flow?: SectionChildFlow } | null;
  selectedChild: { sectionId: string; reference: SectionChildReference } | null;
  genericChildTypesBySectionType: Readonly<Record<string, readonly GenericBlockType[]>>;
  pending: boolean;
  onSelect: (id: string, requestCanvasScroll?: boolean) => void;
  onChildFlowChange: (
    sectionId: string,
    flow: SectionChildFlow | undefined,
    selection?: SectionChildReference,
  ) => boolean;
  onChildRenameSave: (
    sectionId: string,
    flow: SectionChildFlow,
  ) => Promise<string | null>;
  onChildSelect: (
    sectionId: string,
    reference: SectionChildReference,
    requestCanvasScroll?: boolean,
  ) => void;
  onToggle: (section: WebsiteSection) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onReorder: (sectionIds: string[]) => void;
  onCreate?: () => void;
  onRename?: (section: WebsiteSection) => void;
  onDuplicate?: (section: WebsiteSection) => void;
  onDelete?: (section: WebsiteSection) => void;
};

const sortableSectionId = (id: string) => `section:${id}`;

export function SectionNavigator(props: Props) {
  const navigatorRef = useRef<HTMLElement>(null);
  const sectionIds = useMemo(
    () => props.sections.map(({ id }) => id),
    [props.sections],
  );
  const selectedOwnerId = resolveSelectionOwnerId(
    props.selectedId,
    props.selectedChild?.sectionId,
  );
  const selectionKey = props.selectedChild
    ? `${props.selectedChild.sectionId}:${props.selectedChild.reference.kind}:${props.selectedChild.reference.kind === "element" ? props.selectedChild.reference.id : props.selectedChild.reference.key}`
    : `${props.selectedId}:section`;
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(
    () => resolveExpandedSectionId(sectionIds, selectedOwnerId),
  );
  const sectionIdsRef = useRef(sectionIds);
  useEffect(() => {
    sectionIdsRef.current = sectionIds;
  }, [sectionIds]);
  useLayoutEffect(() => {
    setExpandedSectionId(
      resolveExpandedSectionId(sectionIdsRef.current, selectedOwnerId),
    );
  }, [selectedOwnerId, selectionKey]);
  useLayoutEffect(() => {
    const navigator = navigatorRef.current;
    const row = navigator?.querySelector<HTMLElement>('[aria-current="true"]');
    const container = navigator?.closest<HTMLElement>(
      "[data-structure-scroll-container]",
    );
    if (row && container) revealStructureRow(container, row);
  }, [expandedSectionId, selectionKey]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
  );
  const dragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || props.pending) return;
    const from = props.sections.findIndex(
      ({ id }) => sortableSectionId(id) === active.id,
    );
    const to = props.sections.findIndex(
      ({ id }) => sortableSectionId(id) === over.id,
    );
    if (from < 0 || to < 0) return;
    props.onReorder(
      arrayMove(
        props.sections.map(({ id }) => id),
        from,
        to,
      ),
    );
  };
  return (
    <section
      ref={navigatorRef}
      className="rounded-2xl border border-border bg-surface p-3 xl:rounded-none xl:border-0 xl:bg-transparent xl:p-0"
      aria-label="Website sections"
    >
      <div className="flex items-start justify-between gap-3 px-2 py-2">
        <div>
          <Heading level={2} variant="section">
            Sections
          </Heading>
          <Text className="mt-0.5" variant="helper">
            Select, reorder, or change visibility.
          </Text>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={props.pending || !props.onCreate}
          onClick={props.onCreate}
          className="shrink-0"
        >
          <Plus size={14} aria-hidden="true" /> Add Section
        </Button>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={dragEnd}
      >
        <SortableContext
          items={props.sections.map(({ id }) => sortableSectionId(id))}
          strategy={verticalListSortingStrategy}
        >
          <div className="mt-1 space-y-1">
            {props.sections.map((section, index) => (
              <SortableSection
                key={section.id}
                {...props}
                section={section}
                index={index}
                expanded={expandedSectionId === section.id}
                onExpandedChange={(value) =>
                  setExpandedSectionId((current) =>
                    toggleExpandedSectionId(current, section.id, value),
                  )
                }
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}

function SortableSection(
  props: Props & {
    section: WebsiteSection;
    index: number;
    expanded: boolean;
    onExpandedChange: (value: boolean) => void;
  },
) {
  const { section, index } = props;
  const sectionLabel = section.editorName ?? section.displayName;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableSectionId(section.id),
    disabled: props.pending,
  });
  const allowedGenericTypes =
    props.genericChildTypesBySectionType[section.type] ?? [];
  const supportsGenericChildren = allowedGenericTypes.length > 0;
  const childFlow = supportsGenericChildren
    ? props.workingChildFlow?.sectionId === section.id
      ? props.workingChildFlow.flow
      : (section.content as { childFlow?: SectionChildFlow }).childFlow
    : undefined;
  const resolvedChildFlow: SectionChildFlow = childFlow ?? {
    elements: [],
    order: section.type === "blank" || section.type === "hero" ? [] : [SECTION_SPECIALIZED_REFERENCE],
  };
  const hasSelectedChild = props.selectedChild?.sectionId === section.id;
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "relative z-20 opacity-70 shadow-lg" : ""}
    >
      <div
        className={`group flex min-w-0 items-center gap-0.5 rounded-lg border px-1 py-1 ${props.selectedId === section.id && !hasSelectedChild ? "border-accent border-2 bg-surface-muted" : "border-transparent hover:bg-surface-muted"}`}
      >
        <SortableDragHandle
          label={`Drag ${sectionLabel} section`}
          iconSize={15}
          disabled={props.pending}
          {...attributes}
          {...listeners}
        />
        <button
          className="w-0 min-w-0 flex-1 rounded px-1.5 py-1.5 text-left"
          type="button"
          onClick={() => {
            props.onSelect(section.id, true);
            if (props.selectedId === section.id) props.onExpandedChange(true);
          }}
          aria-current={
            props.selectedId === section.id &&
            !hasSelectedChild
              ? "true"
              : undefined
          }
        >
          <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
            {section.type === "blank" && (
              <SquareDashed
                className={`shrink-0 ${section.isEnabled ? "" : "text-foreground-muted opacity-50"}`}
                size={14}
                aria-hidden="true"
              />
            )}
            <span
              className={`min-w-0 truncate ${section.isEnabled ? "" : "text-foreground-muted opacity-60"}`}
            >
              {sectionLabel}
            </span>
          </span>
        </button>
        {supportsGenericChildren && (
          <ElementAddControl
            triggerLabel={`Add to ${sectionLabel}`}
            disabled={resolvedChildFlow.elements.length >= 20}
            onOpen={() => {
              if (props.selectedId !== section.id) props.onSelect(section.id);
            }}
            items={[
              { type: "text" as const, label: "Text" },
              { type: "date" as const, label: "Date" },
              { type: "accordion" as const, label: "Accordion" },
              { type: "schedule" as const, label: "Schedule" },
              { type: "people" as const, label: "People" },
              { type: "divider" as const, label: "Divider" },
              { type: "media" as const, label: "Media" },
              { type: "compositionGroup" as const, label: "Group" },
            ]
              .filter(({ type }) => allowedGenericTypes.includes(type))
              .map(({ type, label }) => ({
                label,
                onAdd: () => addGeneric(type),
              }))}
          />
        )}
        {supportsGenericChildren && (
          <IconButton
            size="sm"
            type="button"
            onClick={() => {
              if (props.expanded) {
                if (hasSelectedChild)
                  props.onSelect(section.id);
                props.onExpandedChange(false);
                return;
              }
              if (props.selectedId === section.id) props.onExpandedChange(true);
              else props.onSelect(section.id);
            }}
            aria-label={`${props.expanded ? "Collapse" : "Expand"} ${sectionLabel}`}
            aria-expanded={props.expanded}
          >
            <ChevronDown
              className={`transition-transform ${props.expanded ? "" : "-rotate-90"}`}
              size={15}
            />
          </IconButton>
        )}
        <StructureActionMenu label={`${sectionLabel} actions`}>
          {section.type === "blank" && (
            <StructureMenuAction
              icon={<Pencil size={14} />}
              disabled={props.pending || !props.onRename}
              onClick={() => props.onRename?.(section)}
            >
              Rename
            </StructureMenuAction>
          )}
          {section.type === "blank" && (
            <StructureMenuAction
              icon={<Copy size={14} />}
              disabled={props.pending || !props.onDuplicate}
              onClick={() => props.onDuplicate?.(section)}
            >
              Duplicate
            </StructureMenuAction>
          )}
          <StructureMenuAction
            icon={<ArrowUp size={14} />}
            disabled={props.pending || index === 0}
            onClick={() => props.onMove(index, -1)}
          >
            Move up
          </StructureMenuAction>
          {section.type === "blank" && (
            <StructureMenuAction
              danger
              icon={<Trash2 size={14} />}
              disabled={props.pending || !props.onDelete}
              onClick={() => props.onDelete?.(section)}
            >
              Delete
            </StructureMenuAction>
          )}
          <StructureMenuAction
            icon={<ArrowDown size={14} />}
            disabled={props.pending || index === props.sections.length - 1}
            onClick={() => props.onMove(index, 1)}
          >
            Move down
          </StructureMenuAction>
          <StructureMenuAction
            icon={section.isEnabled ? <EyeOff size={14} /> : <Eye size={14} />}
            disabled={props.pending}
            onClick={() => props.onToggle(section)}
          >
            {section.isEnabled ? "Hide" : "Show"}
          </StructureMenuAction>
        </StructureActionMenu>
      </div>
      {supportsGenericChildren && props.expanded && (
        <div className="mt-0.5 min-w-0 pl-5">
          <SectionChildList
            sectionLabel={sectionLabel}
            flow={resolvedChildFlow}
            selected={
              props.selectedChild?.sectionId === section.id
                ? props.selectedChild.reference
                : null
            }
            onSelect={(reference) =>
              props.onChildSelect(section.id, reference, true)
            }
            onChange={(flow) => {
              props.onChildFlowChange(
                section.id,
                flow,
                props.selectedChild?.sectionId === section.id
                  ? props.selectedChild.reference
                  : undefined,
              );
            }}
            onRenameSave={(flow) => props.onChildRenameSave(section.id, flow)}
            onDuplicate={(elementId) => {
              const result = duplicateSectionElement(
                resolvedChildFlow,
                elementId,
              );
              if (result)
                props.onChildFlowChange(section.id, result.flow, {
                  kind: "element",
                  id: result.elementId,
                });
            }}
            onDelete={(elementId) => {
              const genericOnly = section.type === "blank" || section.type === "hero";
              const result = genericOnly
                ? deleteGenericSectionElement(resolvedChildFlow, elementId)
                : deleteSectionElement(resolvedChildFlow, elementId);
              props.onChildFlowChange(
                section.id,
                result.flow,
                result.selection,
              );
            }}
          />
        </div>
      )}
    </div>
  );

  function addGeneric(
    type: GenericBlockType,
  ) {
    const element = createSectionElement(resolvedChildFlow, type);
    const after =
      props.selectedChild?.sectionId === section.id
        ? props.selectedChild.reference
        : SECTION_SPECIALIZED_REFERENCE;
    const flow = insertSectionElement(childFlow, element, after);
    props.onExpandedChange(true);
    props.onChildFlowChange(section.id, flow, {
      kind: "element",
      id: element.id,
    });
  }
}

function ElementAddControl({
  disabled,
  onOpen,
  triggerLabel,
  items,
}: {
  disabled: boolean;
  onOpen: () => void;
  triggerLabel: string;
  items: Array<{ label: string; onAdd: () => void }>;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const trigger = triggerRef.current;
      const sidebar = trigger?.closest(
        'section[aria-label="Website sections"]',
      );
      if (!trigger || !sidebar) return;
      const triggerBounds = trigger.getBoundingClientRect();
      const sidebarBounds = sidebar.getBoundingClientRect();
      const inset = 8;
      const width = Math.min(160, sidebarBounds.width - inset * 2);
      const left = Math.min(
        Math.max(triggerBounds.right - width, sidebarBounds.left + inset),
        sidebarBounds.right - width - inset,
      );
      const top = triggerBounds.bottom + 4;
      setPosition({
        left,
        top,
        width,
        maxHeight: Math.max(80, window.innerHeight - top - inset),
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  return (
    <>
      <Tooltip label={triggerLabel}>
        <IconButton
          ref={triggerRef}
          size="sm"
          type="button"
          disabled={disabled}
          aria-label={triggerLabel}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => {
            onOpen();
            setOpen((current) => !current);
          }}
        >
          <Plus size={15} />
        </IconButton>
      </Tooltip>
      {open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label="Add element"
            className="fixed z-50 text-xs overflow-y-auto rounded-md border border-border bg-surface p-1 shadow-[var(--shadow-dialog)]"
            style={position}
          >
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
              Add element
            </p>
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-surface-muted"
                onClick={() => {
                  setOpen(false);
                  item.onAdd();
                }}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
