import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDndContext,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CalendarClock,
  ListCollapse,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Group as GroupIcon,
  Images,
  Users,
  Minus,
  MoveRight,
  Pencil,
  Plus,
  Trash2,
  Type,
  Ungroup,
} from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "../../../components/ui/Button";
import {
  Dialog,
  DialogFooter,
  DialogHeader,
} from "../../../components/ui/Dialog";
import { IconButton } from "../../../components/ui/IconButton";
import { Input } from "../../../components/ui/Input";
import {
  GENERIC_BLOCK_LABELS,
  normalizeEditorName,
  type GenericBlockType,
} from "../../websiteElements/blockIdentity";
import type {
  CompositionGroup,
  WebsiteElement,
} from "../../websiteElements/types";
import {
  findSectionElement,
  getValidSectionElementMoveDestinations,
  moveSectionChild,
  moveSectionElement,
  renameSectionElement,
  reorderSectionChild,
  setSectionElementHidden,
  ungroupSectionElement,
  updateGroupChildren,
  type SectionChildFlow,
  type SectionChildReference,
} from "../sectionChildFlow";
import {
  addToGroup,
  applyStructureElementDrop,
  deleteGroupChild,
  duplicateGroupChild,
  GROUP_CHILD_LIMIT,
  groupAddKinds,
  reorderGroupChildInFlow,
  reorderRootSectionElement,
  type GroupAddKind,
} from "./sectionChildListHelpers";
import {
  StructureActionMenu,
  StructureMenuAction,
} from "./StructureActionMenu";

const sortableId = (reference: SectionChildReference) =>
  reference.kind === "specialized"
    ? "section-child:specialized:content"
    : `section-child:element:${reference.id}`;
const GENERIC_BLOCK_ICONS = {
  text: Type,
  date: CalendarDays,
  accordion: ListCollapse,
  schedule: CalendarClock,
  people: Users,
  media: Images,
  divider: Minus,
  compositionGroup: GroupIcon,
} satisfies Record<GenericBlockType, typeof Type>;
const blockIcon = (type: GenericBlockType) => {
  const BlockIcon = GENERIC_BLOCK_ICONS[type];
  return <BlockIcon size={14} />;
};
const accessibleBlockLabel = (element: WebsiteElement) =>
  `${GENERIC_BLOCK_LABELS[element.type as GenericBlockType]} block: ${(element as WebsiteElement & { editorName: string }).editorName}${element.isHidden ? ", hidden" : ""}`;

export function SectionChildList({
  sectionLabel,
  flow,
  selected,
  onSelect,
  onChange,
  onRenameSave,
  onDuplicate,
  onDelete,
}: {
  sectionLabel: string;
  flow: SectionChildFlow;
  selected: SectionChildReference | null;
  onSelect: (reference: SectionChildReference) => void;
  onChange: (flow: SectionChildFlow) => void;
  onRenameSave: (flow: SectionChildFlow) => Promise<string | null>;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [renameTarget, setRenameTarget] = useState<WebsiteElement | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renamePending, setRenamePending] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [moveTarget, setMoveTarget] = useState<WebsiteElement | null>(null);
  const [moveDestinationKey, setMoveDestinationKey] = useState("");
  const [expandedDestinationIds, setExpandedDestinationIds] = useState<Set<string>>(() => new Set());
  const moveRevealIdRef = useRef<string | null>(null);
  const firstMoveDestinationRef = useRef<HTMLInputElement>(null);
  const structureRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
  );
  const dragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const activeData = active.data.current as DragElementData | undefined;
    const overData = over.data.current as DropDestinationData | undefined;
    if (
      activeData?.kind === "element" &&
      activeData.parentId === null &&
      overData?.parentId === null
    ) {
      const overReference =
        overData.kind === "container"
          ? flow.order.at(-1)
          : flow.order.find((item) => sortableId(item) === over.id);
      if (overReference) {
        const reordered = reorderRootSectionElement(
          flow,
          activeData.elementId,
          overReference,
        );
        if (reordered !== flow) {
          onChange(reordered);
          onSelect({ kind: "element", id: activeData.elementId });
        }
      }
      return;
    }
    if (
      activeData?.kind === "element" &&
      activeData.parentId !== null &&
      overData?.parentId === activeData.parentId
    ) {
      const group = findSectionElement(flow, activeData.parentId);
      if (group?.type !== "compositionGroup") return;
      const overIndex =
        overData.kind === "container"
          ? group.children.length - 1
          : overData.index;
      const reordered = reorderGroupChildInFlow(
        flow,
        activeData.parentId,
        activeData.elementId,
        overIndex,
      );
      if (reordered !== flow) {
        onChange(reordered);
        onSelect({ kind: "element", id: activeData.elementId });
      }
      return;
    }
    if (activeData?.kind === "element" && overData && (overData.kind === "element" || overData.kind === "row" || overData.kind === "container")) {
      const index = overData.kind === "container" && activeData.parentId === overData.parentId
        ? Math.max(0, overData.index - 1)
        : overData.index;
      applyStructureElementDrop(flow, activeData.elementId, { parentId: overData.parentId, index }, onChange, onSelect);
      return;
    }
    const from = flow.order.find((item) => sortableId(item) === active.id);
    const to = flow.order.find((item) => sortableId(item) === over.id);
    if (from && to) onChange(reorderSectionChild(flow, from, to));
  };
  const requestRename = (element: WebsiteElement) => {
    setRenameTarget(element);
    setRenameError(null);
    setRenameValue(
      (element as WebsiteElement & { editorName: string }).editorName,
    );
  };
  const closeRename = () => {
    if (!renamePending) setRenameTarget(null);
  };
  const normalizedRename = normalizeEditorName(renameValue);
  const moveDestinations = moveTarget ? getValidSectionElementMoveDestinations(flow, moveTarget.id) : [];
  const requestMove = (element: WebsiteElement) => {
    setMoveTarget(element);
    setMoveDestinationKey("");
  };
  const closeMove = () => setMoveTarget(null);
  const submitMove = () => {
    if (!moveTarget) return;
    const destination = moveDestinations.find(({ parentId }) => (parentId ?? "section-root") === moveDestinationKey);
    if (!destination) return;
    moveRevealIdRef.current = moveTarget.id;
    if (applyStructureElementDrop(flow, moveTarget.id, destination, onChange, onSelect)) {
      if (destination.revealGroupIds.length > 0) {
        setExpandedDestinationIds((current) => new Set([...current, ...destination.revealGroupIds]));
      }
      closeMove();
    } else {
      moveRevealIdRef.current = null;
    }
  };
  useLayoutEffect(() => {
    const moveRevealId = moveRevealIdRef.current;
    if (!moveRevealId) return;
    const row = Array.from(structureRef.current?.querySelectorAll<HTMLElement>("[data-structure-element-id]") ?? [])
      .find((candidate) => candidate.dataset.structureElementId === moveRevealId);
    row?.scrollIntoView({ block: "nearest" });
    moveRevealIdRef.current = null;
  }, [flow]);
  const submitRename = async () => {
    if (!renameTarget || Array.from(normalizedRename).length > 80) return;
    setRenamePending(true);
    setRenameError(null);
    const error = await onRenameSave(renameSectionElement(flow, renameTarget.id, renameValue));
    setRenamePending(false);
    if (error) setRenameError(error);
    else setRenameTarget(null);
  };
  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={dragEnd}
      >
        <SortableContext
          items={flow.order.map(sortableId)}
          strategy={verticalListSortingStrategy}
        >
          <div
            ref={structureRef}
            className="min-w-0 space-y-0.5 border-l border-border/60 pl-1.5"
            role="group"
            aria-label={`${sectionLabel} structure`}
          >
            {flow.order.map((reference, index) => (
              <TopLevelRow
                key={`${sortableId(reference)}:${reference.kind === "element" && expandedDestinationIds.has(reference.id)}`}
                reference={reference}
                index={index}
                sectionLabel={sectionLabel}
                flow={flow}
                selectedElementId={
                  selected?.kind === "element" ? selected.id : undefined
                }
                selected={
                  selected
                    ? sortableId(selected) === sortableId(reference)
                    : false
                }
                onSelect={onSelect}
                onChange={onChange}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                onRename={requestRename}
                onMove={requestMove}
                expandedDestinationIds={expandedDestinationIds}
              />
            ))}
            <TreeDropTarget flow={flow} parentId={null} index={flow.order.length} label="Move to end of Section" />
          </div>
        </SortableContext>
      </DndContext>
      <Dialog
        open={renameTarget !== null}
        onClose={closeRename}
        closeDisabled={renamePending}
        size="sm"
        titleId="rename-block-title"
        descriptionId="rename-block-description"
        initialFocusRef={renameInputRef}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submitRename();
          }}
        >
          <DialogHeader
            title="Rename block"
            titleId="rename-block-title"
            description="Use an empty name to restore the next automatic name."
            descriptionId="rename-block-description"
            onClose={closeRename}
            closeDisabled={renamePending}
          />
          <label
            className="mt-4 block text-xs font-medium"
            htmlFor="rename-block-input"
          >
            Editor name
          </label>
          <Input
            ref={renameInputRef}
            id="rename-block-input"
            className="mt-1.5"
            value={renameValue}
            maxLength={160}
            disabled={renamePending}
            onChange={(event) => setRenameValue(event.target.value)}
          />
          {renameError && <p className="mt-3 text-sm text-danger" role="alert">{renameError}</p>}
          <DialogFooter className="mt-5">
            <Button type="button" variant="secondary" disabled={renamePending} onClick={closeRename}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={renamePending || Array.from(normalizedRename).length > 80}
            >
              {renamePending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
      <Dialog
        open={moveTarget !== null}
        onClose={closeMove}
        size="sm"
        titleId="move-block-title"
        descriptionId="move-block-description"
        initialFocusRef={firstMoveDestinationRef}
      >
        <form onSubmit={(event) => { event.preventDefault(); submitMove(); }}>
          <DialogHeader
            title="Move block"
            titleId="move-block-title"
            description="Choose a destination in this Section. The block will be appended there."
            descriptionId="move-block-description"
            onClose={closeMove}
          />
          {moveTarget && (
            <div className="mt-4 flex min-w-0 items-center gap-2 rounded-md bg-surface-muted px-3 py-2">
              <span className="grid size-6 shrink-0 place-items-center text-foreground-muted" aria-hidden="true">{blockIcon(moveTarget.type as GenericBlockType)}</span>
              <span className="truncate text-sm font-medium">{(moveTarget as WebsiteElement & { editorName: string }).editorName}</span>
            </div>
          )}
          <fieldset className="mt-4 space-y-1.5">
            <legend className="mb-2 text-xs font-medium">Move to</legend>
            {moveDestinations.map((destination, index) => {
              const key = destination.parentId ?? "section-root";
              return (
                <label key={key} className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-2 text-sm hover:bg-surface-muted has-[:checked]:border-accent has-[:checked]:bg-surface-muted">
                  <input ref={index === 0 ? firstMoveDestinationRef : undefined} type="radio" name="move-destination" value={key} checked={moveDestinationKey === key} onChange={() => setMoveDestinationKey(key)} />
                  {destination.parentId && <GroupIcon size={14} className="shrink-0 text-foreground-muted" aria-hidden="true" />}
                  <span className="min-w-0 truncate">{destination.label}</span>
                </label>
              );
            })}
            {moveDestinations.length === 0 && <p className="text-sm text-foreground-muted">No other valid destination is available.</p>}
          </fieldset>
          <DialogFooter className="mt-5">
            <Button type="button" variant="secondary" onClick={closeMove}>Cancel</Button>
            <Button type="submit" disabled={!moveDestinationKey}>Move</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}

function TopLevelRow({
  reference,
  index,
  sectionLabel,
  flow,
  selected,
  selectedElementId,
  onSelect,
  onChange,
  onDuplicate,
  onDelete,
  onRename,
  onMove,
  expandedDestinationIds,
}: {
  reference: SectionChildReference;
  index: number;
  sectionLabel: string;
  flow: SectionChildFlow;
  selected: boolean;
  selectedElementId?: string;
  onSelect: (reference: SectionChildReference) => void;
  onChange: (flow: SectionChildFlow) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (element: WebsiteElement) => void;
  onMove: (element: WebsiteElement) => void;
  expandedDestinationIds: ReadonlySet<string>;
}) {
  const [expanded, setExpanded] = useState(true);
  const { active } = useDndContext();
  const activeData = active?.data.current as DragElementData | undefined;
  const rootReorder =
    activeData?.kind === "element" && activeData.parentId === null;
  const rowDropDisabled = activeData?.kind === "element"
    ? rootReorder
      ? false
      : !moveSectionElement(flow, activeData.elementId, { parentId: null, index }).ok
    : false;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId(reference),
    data: reference.kind === "element"
      ? { kind: "element", elementId: reference.id, parentId: null, index } satisfies DragElementData
      : { kind: "row", parentId: null, index } satisfies DropDestinationData,
    disabled: { droppable: rowDropDisabled },
  });
  const element =
    reference.kind === "element"
      ? flow.elements.find(({ id }) => id === reference.id)
      : undefined;
  const label =
    reference.kind === "specialized"
      ? `${sectionLabel} content`
      : element
        ? accessibleBlockLabel(element)
        : "Unknown element";
  const add =
    element?.type === "compositionGroup"
      ? (kind: GroupAddKind) =>
          addToGroup(element, kind, flow, onChange, onSelect)
      : undefined;
  const isGroup = element?.type === "compositionGroup";
  return (
    <div className="min-w-0">
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        data-structure-row={isGroup ? "group" : "element"}
        data-structure-element-id={element?.id}
        data-element-hidden={element?.isHidden ? "true" : undefined}
        className={`group/structure-row relative flex w-full min-w-0 max-w-full items-center gap-0.5 rounded-md border px-0.5 py-0.5 ${selected ? "border-accent bg-surface-muted" : isGroup ? "border-border/50 bg-surface-muted/35 hover:border-border hover:bg-surface-muted" : "border-transparent hover:bg-surface-muted"} ${isDragging ? "z-20 opacity-70 shadow-lg" : ""}`}
      >
        <IconButton
          type="button"
          size="sm"
          className={`touch-none cursor-grab opacity-35 active:cursor-grabbing group-hover/structure-row:opacity-100 focus-visible:opacity-100 ${selected ? "opacity-100" : ""}`}
          aria-label={`Drag ${label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} />
        </IconButton>
        {isGroup && (
          <GroupDisclosure
            expanded={expanded}
            onToggle={() => setExpanded((value) => !value)}
          />
        )}
        {element && (
          <span
            className={`grid size-6 shrink-0 place-items-center text-foreground-muted ${element.isHidden ? "opacity-50" : ""}`}
            aria-hidden="true"
          >
            {blockIcon(element.type as GenericBlockType)}
          </span>
        )}
        <RowLabel
          label={
            element
              ? (element as WebsiteElement & { editorName: string }).editorName
              : label
          }
          accessibleLabel={label}
          hidden={element?.isHidden === true}
          selected={selected}
          onClick={() => onSelect(reference)}
        />
        <div data-structure-actions className="ml-auto flex shrink-0 items-center gap-0.5">
          {add && (
            <GroupAddControl depth={1} label="Add child to Group" disabled={element?.type === "compositionGroup" && element.children.length >= GROUP_CHILD_LIMIT} onAdd={add} />
          )}
          <StructureActionMenu className="shrink-0" label={`${label} actions`}>
          <>
            {element && (
              <ElementVisibilityAction
                element={element}
                onToggle={() =>
                  onChange(
                    setSectionElementHidden(
                      flow,
                      element.id,
                      !element.isHidden,
                    ),
                  )
                }
              />
            )}
            {element && (
              <StructureMenuAction
                icon={<Pencil size={14} />}
                onClick={() => onRename(element)}
              >
                Rename
              </StructureMenuAction>
            )}
            {reference.kind === "element" && (
              <StructureMenuAction
                icon={<MoveRight size={14} />}
                onClick={() => element && onMove(element)}
              >
                Move
              </StructureMenuAction>
            )}
            {reference.kind === "element" && (
              <StructureMenuAction
                icon={<Copy size={14} />}
                onClick={() => onDuplicate(reference.id)}
              >
                Duplicate
              </StructureMenuAction>
            )}
            <StructureMenuAction
              icon={<ArrowUp size={14} />}
              disabled={index === 0}
              onClick={() => onChange(moveSectionChild(flow, reference, -1))}
            >
              Move up
            </StructureMenuAction>
            <StructureMenuAction
              icon={<ArrowDown size={14} />}
              disabled={index === flow.order.length - 1}
              onClick={() => onChange(moveSectionChild(flow, reference, 1))}
            >
              Move down
            </StructureMenuAction>
            {isGroup && (
              <StructureMenuAction
                icon={<Ungroup size={14} />}
                onClick={() =>
                  onChange(ungroupSectionElement(flow, element.id))
                }
              >
                Ungroup
              </StructureMenuAction>
            )}
            {reference.kind === "element" && (
              <StructureMenuAction
                danger
                icon={<Trash2 size={14} />}
                onClick={() => onDelete(reference.id)}
              >
                Delete
              </StructureMenuAction>
            )}
          </>
          </StructureActionMenu>
        </div>
      </div>
      {element?.type === "compositionGroup" && (
        <TreeDropTarget flow={flow} parentId={element.id} index={element.children.length} label={`Move into ${element.editorName}`} />
      )}
      {element?.type === "compositionGroup" && expanded && (
        <GroupChildren
          group={element}
          depth={1}
          flow={flow}
          selectedElementId={selectedElementId}
          onSelect={onSelect}
          onChange={onChange}
          onRename={onRename}
          onMove={onMove}
          expandedDestinationIds={expandedDestinationIds}
        />
      )}
    </div>
  );
}

function GroupChildren({
  group,
  depth,
  flow,
  selectedElementId,
  onSelect,
  onChange,
  onRename,
  onMove,
  expandedDestinationIds,
}: {
  group: CompositionGroup;
  depth: number;
  flow: SectionChildFlow;
  selectedElementId?: string;
  onSelect: (reference: SectionChildReference) => void;
  onChange: (flow: SectionChildFlow) => void;
  onRename: (element: WebsiteElement) => void;
  onMove: (element: WebsiteElement) => void;
  expandedDestinationIds: ReadonlySet<string>;
}) {
  const itemId = (id: string) => `group-child:${group.id}:${id}`;
  return (
    <SortableContext
        items={group.children.map(({ id }) => itemId(id))}
        strategy={verticalListSortingStrategy}
      >
        <div
          className="min-w-0 space-y-0.5 border-l border-border/50 pl-2"
          data-group-children={group.id}
        >
          {group.children.map((child, index) => (
            <NestedRow
              key={`${child.id}:${expandedDestinationIds.has(child.id)}`}
              sortableId={itemId(child.id)}
              child={child as WebsiteElement}
              index={index}
              group={group}
              depth={depth}
              flow={flow}
              selectedElementId={selectedElementId}
              onSelect={onSelect}
              onChange={onChange}
              onRename={onRename}
              onMove={onMove}
              expandedDestinationIds={expandedDestinationIds}
            />
          ))}
        </div>
    </SortableContext>
  );
}

function NestedRow({
  child,
  sortableId: childSortableId,
  index,
  group,
  depth,
  flow,
  selectedElementId,
  onSelect,
  onChange,
  onRename,
  onMove,
  expandedDestinationIds,
}: {
  child: WebsiteElement;
  sortableId: string;
  index: number;
  group: CompositionGroup;
  depth: number;
  flow: SectionChildFlow;
  selectedElementId?: string;
  onSelect: (reference: SectionChildReference) => void;
  onChange: (flow: SectionChildFlow) => void;
  onRename: (element: WebsiteElement) => void;
  onMove: (element: WebsiteElement) => void;
  expandedDestinationIds: ReadonlySet<string>;
}) {
  const [expanded, setExpanded] = useState(true);
  const { active } = useDndContext();
  const activeData = active?.data.current as DragElementData | undefined;
  const siblingReorder =
    activeData?.kind === "element" && activeData.parentId === group.id;
  const rowDropDisabled = activeData?.kind === "element"
    ? siblingReorder
      ? false
      : !moveSectionElement(flow, activeData.elementId, { parentId: group.id, index }).ok
    : false;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: childSortableId,
    data: { kind: "element", elementId: child.id, parentId: group.id, index } satisfies DragElementData,
    disabled: { droppable: rowDropDisabled },
  });
  const replace = (children: CompositionGroup["children"]) =>
    onChange(updateGroupChildren(flow, group.id, children));
  const label = accessibleBlockLabel(child);
  const selected = selectedElementId === child.id;
  const isGroup = child.type === "compositionGroup";
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`min-w-0 ${isDragging ? "relative z-20 opacity-70 shadow-lg" : ""}`}
    >
      <div
        data-structure-row={isGroup ? "nested-group" : "nested-element"}
        data-structure-element-id={child.id}
        data-element-hidden={child.isHidden ? "true" : undefined}
        className={`group/structure-row flex w-full min-w-0 max-w-full items-center gap-0.5 rounded-md border px-0.5 py-0.5 ${selected ? "border-accent bg-surface-muted" : isGroup ? "border-border/50 bg-surface-muted/35 hover:border-border hover:bg-surface-muted" : "border-transparent hover:bg-surface-muted"}`}
      >
        <IconButton
          type="button"
          size="sm"
          className={`touch-none cursor-grab opacity-35 active:cursor-grabbing group-hover/structure-row:opacity-100 focus-visible:opacity-100 ${selected ? "opacity-100" : ""}`}
          aria-label={`Drag ${label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} />
        </IconButton>
        {isGroup && (
          <GroupDisclosure
            expanded={expanded}
            onToggle={() => setExpanded((value) => !value)}
          />
        )}
        <span
          className={`grid size-6 shrink-0 place-items-center text-foreground-muted ${child.isHidden ? "opacity-50" : ""}`}
          aria-hidden="true"
        >
          {blockIcon(child.type as GenericBlockType)}
        </span>
        <RowLabel
          label={(child as WebsiteElement & { editorName: string }).editorName}
          accessibleLabel={label}
          hidden={child.isHidden === true}
          selected={selected}
          onClick={() => onSelect({ kind: "element", id: child.id })}
        />
        <div data-structure-actions className="ml-auto flex shrink-0 items-center gap-0.5">
          {isGroup && (
            <GroupAddControl
              depth={depth + 1}
              label="Add child to Group"
              disabled={child.children.length >= GROUP_CHILD_LIMIT}
              onAdd={(kind) => addToGroup(child, kind, flow, onChange, onSelect)}
            />
          )}
          <StructureActionMenu className="shrink-0" label={`${label} actions`}>
          <>
            <ElementVisibilityAction
              element={child}
              onToggle={() =>
                onChange(
                  setSectionElementHidden(flow, child.id, !child.isHidden),
                )
              }
            />
            <StructureMenuAction
              icon={<Pencil size={14} />}
              onClick={() => onRename(child)}
            >
              Rename
            </StructureMenuAction>
            <StructureMenuAction
              icon={<MoveRight size={14} />}
              onClick={() => onMove(child)}
            >
              Move
            </StructureMenuAction>
            <StructureMenuAction
              icon={<Copy size={14} />}
              disabled={group.children.length >= GROUP_CHILD_LIMIT}
              onClick={() => duplicateGroupChild(group, child.id, flow, onChange, onSelect)}
            >
              Duplicate
            </StructureMenuAction>
            <StructureMenuAction
              icon={<ArrowUp size={14} />}
              disabled={index === 0}
              onClick={() => {
                const next = [...group.children];
                [next[index - 1], next[index]] = [next[index], next[index - 1]];
                replace(next);
              }}
            >
              Move up
            </StructureMenuAction>
            <StructureMenuAction
              icon={<ArrowDown size={14} />}
              disabled={index === group.children.length - 1}
              onClick={() => {
                const next = [...group.children];
                [next[index], next[index + 1]] = [next[index + 1], next[index]];
                replace(next);
              }}
            >
              Move down
            </StructureMenuAction>
            {isGroup && (
              <StructureMenuAction
                icon={<Ungroup size={14} />}
                onClick={() => onChange(ungroupSectionElement(flow, child.id))}
              >
                Ungroup
              </StructureMenuAction>
            )}
            <StructureMenuAction
              danger
              icon={<Trash2 size={14} />}
              onClick={() => deleteGroupChild(group, child.id, flow, selectedElementId, onChange, onSelect)}
            >
              Delete
            </StructureMenuAction>
          </>
          </StructureActionMenu>
        </div>
      </div>
      {child.type === "compositionGroup" && (
        <TreeDropTarget flow={flow} parentId={child.id} index={child.children.length} label={`Move into ${child.editorName}`} />
      )}
      {child.type === "compositionGroup" && expanded && (
        <GroupChildren
          group={child}
          depth={depth + 1}
          flow={flow}
          selectedElementId={selectedElementId}
          onSelect={onSelect}
          onChange={onChange}
          onRename={onRename}
          onMove={onMove}
          expandedDestinationIds={expandedDestinationIds}
        />
      )}
    </div>
  );
}

type DragElementData = { kind: "element"; elementId: string; parentId: string | null; index: number };
type DropDestinationData = DragElementData | { kind: "row" | "container"; parentId: string | null; index: number };

function TreeDropTarget({ flow, parentId, index, label }: { flow: SectionChildFlow; parentId: string | null; index: number; label: string }) {
  const { active } = useDndContext();
  const activeData = active?.data.current as DragElementData | undefined;
  const draggingElement = activeData?.kind === "element";
  const destinationIndex = activeData?.parentId === parentId ? Math.max(0, index - 1) : index;
  const sameParentReorder = draggingElement && activeData.parentId === parentId;
  const valid = draggingElement && (sameParentReorder || moveSectionElement(flow, activeData.elementId, { parentId, index: destinationIndex }).ok);
  const { isOver, setNodeRef } = useDroppable({
    id: `tree-container:${parentId ?? "root"}`,
    data: { kind: "container", parentId, index } satisfies DropDestinationData,
    disabled: !valid,
  });
  return (
    <div
      ref={setNodeRef}
      data-tree-drop-target={parentId ?? "root"}
      className={`${draggingElement ? "my-0.5 flex min-h-7 items-center justify-center rounded border border-dashed px-2 text-[10px]" : "h-0 overflow-hidden"} ${isOver ? "border-accent bg-surface-muted text-foreground" : "border-border text-foreground-muted"} ${valid ? "" : "pointer-events-none opacity-40"}`}
      aria-label={draggingElement ? label : undefined}
    >
      {draggingElement ? label : null}
    </div>
  );
}

export function GroupDisclosure({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <IconButton
      className="size-7"
      size="sm"
      type="button"
      aria-label={`${expanded ? "Collapse" : "Expand"} Group`}
      aria-expanded={expanded}
      onClick={onToggle}
    >
      <ChevronDown
        size={14}
        className={`transition-transform ${expanded ? "" : "-rotate-90"}`}
      />
    </IconButton>
  );
}

function RowLabel({
  label,
  accessibleLabel,
  hidden,
  selected,
  onClick,
}: {
  label: string;
  accessibleLabel: string;
  hidden: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={accessibleLabel}
      data-structure-label
      className={`min-w-12 basis-12 flex-1 rounded px-1 py-1.5 text-left ${hidden ? "text-foreground-muted opacity-60" : ""}`}
      aria-current={selected ? "true" : undefined}
      onClick={onClick}
    >
      <span className="block truncate text-xs font-medium">{label}</span>
    </button>
  );
}

function GroupAddControl({
  depth,
  label,
  disabled = false,
  onAdd,
}: {
  depth: number;
  label: string;
  disabled?: boolean;
  onAdd: (kind: GroupAddKind) => void;
}) {
  const [open, setOpen] = useState(false);
  const labels: Record<GroupAddKind, string> = {
    text: "Text",
    date: "Date",
    accordion: "Accordion",
    schedule: "Schedule",
    people: "People",
    divider: "Divider",
    media: "Media",
    group: "Group",
  };
  return (
    <div
      className="relative shrink-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <IconButton
        type="button"
        size="sm"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        <Plus size={15} />
      </IconButton>
      {open && (
        <div
          role="menu"
          aria-label={label}
          className="absolute right-0 top-full z-40 w-36 rounded-md border border-border bg-surface p-1 text-xs shadow-[var(--shadow-dialog)]"
        >
          {groupAddKinds(depth).map((kind) => (
            <AddAction
              key={kind}
              label={labels[kind]}
              onClick={() => {
                onAdd(kind);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
function AddAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      className="block w-full rounded px-2 py-1.5 text-left hover:bg-surface-muted"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function ElementVisibilityAction({
  element,
  onToggle,
}: {
  element: WebsiteElement;
  onToggle: () => void;
}) {
  return (
    <StructureMenuAction
      icon={element.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
      onClick={onToggle}
    >
      {element.isHidden ? "Show" : "Hide"}
    </StructureMenuAction>
  );
}
