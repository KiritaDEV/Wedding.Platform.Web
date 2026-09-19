import { ColorPreviewScopeContext } from "../../features/websiteEditor/colorPreview";
import { ColorPreviewProvider } from "../../features/websiteEditor/ColorPreviewProvider";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileWarning,
  ExternalLink,
  LayoutTemplate,
  Minus,
  Monitor,
  Plus,
  RefreshCw,
  Smartphone,
  Tablet,
} from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import { Heading } from "../../components/ui/Heading";
import { Select } from "../../components/ui/Select";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { Text } from "../../components/ui/Text";
import { useEventWorkspace } from "../../features/events/workspace/EventWorkspaceContext";
import {
  addWebsiteProjectColor,
  createWebsiteSection,
  deleteWebsiteSection,
  duplicateWebsiteSection,
  reorderWebsiteSections,
  renameWebsiteSection,
  setWebsiteSectionEnabled,
  updateWebsiteDesignSettings,
  updateWebsiteSectionAppearance,
  updateWebsiteSectionPresentation,
  updateWebsiteSectionContent,
  updateWebsiteSectionDesignDefaults,
} from "../../features/websiteEditor/api";
import { AppearancePanel } from "../../features/websiteEditor/components/AppearancePanel";
import { BuilderSaveBar } from "../../features/websiteEditor/components/BuilderSaveBar";
import { DesignPanel } from "../../features/websiteEditor/components/DesignPanel";
import { DiscardChangesDialog } from "../../features/websiteEditor/components/DiscardChangesDialog";
import {
  PeopleEditor,
  SectionEditor,
} from "../../features/websiteEditor/components/SectionEditor";
import { TextElementEditor } from "../../features/websiteEditor/components/TextElementEditor";
import { GroupElementEditor } from "../../features/websiteEditor/components/GroupElementEditor";
import { DividerElementEditor } from "../../features/websiteEditor/components/DividerElementEditor";
import { DateElementEditor } from "../../features/websiteEditor/components/DateElementEditor";
import { AccordionElementEditor } from "../../features/websiteEditor/components/AccordionElementEditor";
import { ScheduleElementEditor } from "../../features/websiteEditor/components/ScheduleElementEditor";
import { MediaElementEditor } from "../../features/websiteEditor/components/MediaElementEditor";
import { SectionDesignDefaultsPanel } from "../../features/websiteEditor/components/SectionDesignDefaultsPanel";
import { SectionCompositionControls } from "../../features/websiteEditor/components/SectionCompositionControls";
import {
  createCustomSectionPresentation,
  removeCustomSectionPresentation,
} from "../../features/websiteEditor/compositionLifecycle";
import {
  mergeScopedSectionAppearance,
  replaceScopedSectionAppearance,
  resolveSectionAppearance,
} from "../../features/websiteEditor/sectionAppearance";
import { SectionNavigator } from "../../features/websiteEditor/components/SectionNavigator";
import {
  BlankSectionDeleteDialog,
  BlankSectionRenameDialog,
} from "../../features/websiteEditor/components/BlankSectionLifecycleDialogs";
import { validateSectionContent } from "../../features/websiteEditor/schemas";
import { InlineEditProvider } from "../../features/websiteEditor/inline/InlineEditContext";
import type {
  InlineFieldPath,
  InlineEditingTarget,
} from "../../features/websiteEditor/inline/types";
import { isStandaloneTextEditingTarget } from "../../features/websiteEditor/inline/types";
import type {
  ResponsiveViewport,
  WebsiteDesignSettings,
  WebsiteDraft,
  SectionDesignDefaults,
  WebsiteSection,
  WebsiteSectionAppearance,
  WebsiteSectionAppearanceEnvelope,
} from "../../features/websiteEditor/types";
import type { ProjectColor } from "../../features/websiteColors/projectColors";
import { pruneResponsiveAppearance } from "../../features/websiteEditor/responsiveAppearance";
import {
  accessiblePreviewViewports,
  EDITOR_DEVICE_VIEWPORTS,
  useEditorDeviceCategory,
} from "../../features/websiteEditor/responsiveViewport";
import { useWebsiteDraft } from "../../features/websiteEditor/useWebsiteDraft";
import { WebsiteRenderer } from "../../features/websiteRenderer/WebsiteRenderer";
import {
  authoredPropertyViewport,
  mergeScopedComposition,
  replaceScopedComposition,
  resolveEditorCompositionTarget,
  sameCompositionScope,
  type SectionCompositionScope,
} from "../../features/websiteEditor/editorComposition";
import {
  globalDesignCapability,
  sectionCapability,
  templateElementCapability,
} from "../../features/websiteCapabilities/lookup";
import type { TemplateCapabilities } from "../../features/websiteCapabilities/types";
import { ApiError } from "../../lib/api";
import {
  findSectionElement,
  ungroupSectionElement,
  updateSectionElement,
  updateSectionTextAppearance,
  updateSectionTextDocument,
  type SectionChildFlow,
  type SectionChildReference,
} from "../../features/websiteEditor/sectionChildFlow";
import { syncEditorPreviewTheme } from "../../features/websiteEditor/editorPreviewTheme";
import type { WebsiteElement } from "../../features/websiteElements/types";
import { FourSidedSpacingControl } from "../../features/websiteEditor/components/FourSidedSpacingControl";
import {
  resolveFourSidedSpacing,
  type FourSidedSpacing,
  type SpacingPreset,
} from "../../features/websiteElements/spacing";
import {
  findEditorTarget,
  revealEditorTarget,
} from "../../features/websiteEditor/canvasReveal";
import { DESKTOP_EDITOR_GRID_COLUMNS } from "../../features/websiteEditor/editorLayout";
import {
  EDITOR_ZOOM_STEPS,
  browserEditorZoomStorage,
  computeFitScale,
  resolveEditorCanvasGeometry,
  loadEditorZoomPreferences,
  saveEditorZoomPreferences,
  stepEditorZoom,
  type EditorZoomPreference,
  type EditorZoomPreferences,
} from "../../features/websiteEditor/editorZoom";

type BuilderMode = "content" | "design";
type SectionPanelMode = "content" | "appearance";
type DrawerMode = "sections" | "content" | "appearance" | "design";
type MobileDrawerSnap = "hidden" | "medium" | "tall";
type EditorMode = "edit" | "preview";
const desktopEditorGridStyle = {
  "--desktop-editor-grid-columns": DESKTOP_EDITOR_GRID_COLUMNS,
} as CSSProperties;
type CanvasSelectionRequest =
  | { kind: "section"; id: string; requestId: number }
  | { kind: "element"; id: string; sectionId: string; requestId: number };
type SectionStructureOverride = {
  order: string[];
  enabledById: Record<string, boolean>;
};

function applySectionStructure(
  sections: WebsiteSection[],
  override: SectionStructureOverride | null,
): WebsiteSection[] {
  if (!override) return sections;
  const byId = new Map(sections.map((section) => [section.id, section]));
  return override.order.flatMap((id, index) => {
    const section = byId.get(id);
    return section
      ? [
          {
            ...section,
            sortOrder: (index + 1) * 10,
            isEnabled: override.enabledById[id] ?? section.isEnabled,
          },
        ]
      : [];
  });
}

function structureFor(sections: WebsiteSection[]): SectionStructureOverride {
  return {
    order: sections.map(({ id }) => id),
    enabledById: Object.fromEntries(
      sections.map(({ id, isEnabled }) => [id, isEnabled]),
    ),
  };
}

function messageFor(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : "Something went wrong. Please try again.";
}

export function WebsitePage() {
  return (
    <ColorPreviewProvider>
      <WebsitePageContent />
    </ColorPreviewProvider>
  );
}

function WebsitePageContent() {
  const event = useEventWorkspace();
  const { projectId = "" } = useParams();
  const { draft, setDraft, error, isLoading, isUninitialized, retry } =
    useWebsiteDraft(event.id, projectId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingSelection, setPendingSelection] = useState<string | null>(null);
  const [pendingChildSelection, setPendingChildSelection] = useState<{
    sectionId: string;
    compositionScope: SectionCompositionScope;
    reference: SectionChildReference;
    requestCanvasScroll?: boolean;
  } | null>(null);
  const [pendingMode, setPendingMode] = useState<BuilderMode | null>(null);
  const [pendingPreviewMode, setPendingPreviewMode] = useState<{
    viewport: ResponsiveViewport;
    scope?: SectionCompositionScope;
  } | null>(null);
  const [mode, setMode] = useState<BuilderMode>("content");
  const [editorMode, setEditorMode] = useState<EditorMode>("edit");
  const [sectionPanelMode, setSectionPanelMode] =
    useState<SectionPanelMode>("content");
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("content");
  const [drawerSnap, setDrawerSnap] = useState<MobileDrawerSnap>("medium");
  const [pendingDrawerMode, setPendingDrawerMode] = useState<DrawerMode | null>(
    null,
  );
  const [listPending, setListPending] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [renameSectionTarget, setRenameSectionTarget] =
    useState<WebsiteSection | null>(null);
  const [deleteSectionTarget, setDeleteSectionTarget] =
    useState<WebsiteSection | null>(null);
  const [sectionStructureOverride, setSectionStructureOverride] =
    useState<SectionStructureOverride | null>(null);
  const deviceCategory = useEditorDeviceCategory();
  const [previewMode, setPreviewMode] =
    useState<ResponsiveViewport>(deviceCategory);
  const accessibleViewports = useMemo(
    () => accessiblePreviewViewports(deviceCategory),
    [deviceCategory],
  );

  const [contentOverride, setContentOverride] = useState<{
    sectionId: string;
    scope?: SectionCompositionScope;
    content: Record<string, unknown>;
  } | null>(null);
  const [appearanceOverride, setAppearanceOverride] = useState<{
    sectionId: string;
    appearance: WebsiteSectionAppearance | WebsiteSectionAppearanceEnvelope;
  } | null>(null);
  const [appearanceError, setAppearanceError] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const [sectionDesignSaving, setSectionDesignSaving] = useState(false);
  const [sectionDesignError, setSectionDesignError] = useState<string | null>(
    null,
  );
  const [inlineEditingTarget, setInlineEditingTarget] = useState<
    | (InlineEditingTarget & { compositionScope?: SectionCompositionScope })
    | null
  >(null);
  useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<{
    sectionId: string;
    compositionScope: SectionCompositionScope;
    reference: SectionChildReference;
  } | null>(null);
  const canvasSelectionRequestId = useRef(0);
  const [canvasSelectionRequest, setCanvasSelectionRequest] =
    useState<CanvasSelectionRequest | null>(null);
  const [designOverride, setDesignOverride] =
    useState<WebsiteDesignSettings | null>(null);
  const [designError, setDesignError] = useState<string | null>(null);
  const [mediaOverrides, setMediaOverrides] = useState<WebsiteDraft["media"]>(
    {},
  );

  const workingSections = useMemo(
    () =>
      applySectionStructure(draft?.sections ?? [], sectionStructureOverride),
    [draft?.sections, sectionStructureOverride],
  );
  const effectiveSelectedId = workingSections.some(
    ({ id }) => id === selectedId,
  )
    ? selectedId
    : (workingSections[0]?.id ?? null);
  const authoritativeSelected =
    draft?.sections.find(({ id }) => id === effectiveSelectedId) ?? null;
  const workingSelected =
    workingSections.find(({ id }) => id === effectiveSelectedId) ?? null;
  const workingContent =
    contentOverride?.sectionId === effectiveSelectedId
      ? contentOverride.content
      : (authoritativeSelected?.content as Record<string, unknown> | undefined);
  const activeCompositionTarget =
    workingSelected &&
    workingContent &&
    (workingSelected.type === "blank" || workingSelected.type === "hero" || workingSelected.type === "gallery")
      ? resolveEditorCompositionTarget(
          { ...workingSelected, content: workingContent } as WebsiteSection,
          previewMode,
        )
      : null;
  const workingAppearanceOwner =
    appearanceOverride?.sectionId === effectiveSelectedId
      ? appearanceOverride.appearance
      : authoritativeSelected?.appearance;
  const activeAppearanceTarget =
    workingSelected &&
    workingAppearanceOwner &&
    (workingSelected.type === "hero" || workingSelected.type === "blank" || workingSelected.type === "gallery")
      ? resolveSectionAppearance(
          workingAppearanceOwner as WebsiteSectionAppearanceEnvelope,
          previewMode,
        )
      : null;
  const workingAppearance =
    activeAppearanceTarget?.appearance ??
    (workingAppearanceOwner as WebsiteSectionAppearance | undefined);
  const contentDirty = Boolean(
    authoritativeSelected &&
    workingContent &&
    JSON.stringify(workingContent) !==
      JSON.stringify(authoritativeSelected.content),
  );
  const appearanceDirty = Boolean(
    authoritativeSelected &&
    workingAppearanceOwner &&
    JSON.stringify(workingAppearanceOwner) !==
      JSON.stringify(authoritativeSelected.appearance),
  );
  const sectionDirty = contentDirty || appearanceDirty;
  const designDirty = Boolean(
    draft &&
    designOverride &&
    JSON.stringify(designOverride) !== JSON.stringify(draft.designSettings),
  );
  const authoritativeOrder = draft?.sections.map(({ id }) => id) ?? [];
  const workingOrder = workingSections.map(({ id }) => id);
  const sectionOrderDirty =
    JSON.stringify(workingOrder) !== JSON.stringify(authoritativeOrder);
  const sectionVisibilityDirty = workingSections.some(
    (section) =>
      draft?.sections.find(({ id }) => id === section.id)?.isEnabled !==
      section.isEnabled,
  );
  const sectionStructureDirty = sectionOrderDirty || sectionVisibilityDirty;
  const globalDirty = sectionStructureDirty || sectionDirty || designDirty;

  useEffect(() => {
    if (accessibleViewports.includes(previewMode)) return;
    const next = accessibleViewports[0];
    const nextScope =
      workingSelected &&
      workingContent &&
      (workingSelected.type === "blank" || workingSelected.type === "hero" || workingSelected.type === "gallery")
        ? resolveEditorCompositionTarget(
            { ...workingSelected, content: workingContent } as WebsiteSection,
            next,
          ).scope
        : undefined;
    const timer = window.setTimeout(() => {
      if (sectionDirty)
        setPendingPreviewMode({ viewport: next, scope: nextScope });
      else {
        setSelectedChild(null);
        setPreviewMode(next);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [
    accessibleViewports,
    previewMode,
    sectionDirty,
    workingContent,
    workingSelected,
  ]);

  function selectSection(id: string, requestCanvasScroll = false) {
    if (requestCanvasScroll) {
      setCanvasSelectionRequest({
        kind: "section",
        id,
        requestId: ++canvasSelectionRequestId.current,
      });
    }
    if (id === effectiveSelectedId) {
      setInlineEditingTarget(null);
      setSelectedChild(null);
      return;
    }
    if (sectionDirty) {
      setPendingSelection(id);
    } else {
      setSelectedId(id);
      setSelectedChild(null);
      setContentOverride(null);
      setAppearanceOverride(null);
      setInlineEditingTarget(null);
      setAppearanceError(null);
      setSectionDesignError(null);
    }
  }

  function applyDrawerMode(next: DrawerMode) {
    setDrawerMode(next);
    if (next === "content" || next === "appearance") setSectionPanelMode(next);
    if (
      (next === "content" || next === "appearance") &&
      isStandaloneTextEditingTarget(inlineEditingTarget)
    )
      setInlineEditingTarget(null);
  }

  function changePreviewMode(next: ResponsiveViewport) {
    if (next === previewMode) return;
    const nextTarget =
      workingSelected &&
      workingContent &&
      (workingSelected.type === "blank" || workingSelected.type === "hero" || workingSelected.type === "gallery")
        ? resolveEditorCompositionTarget(
            { ...workingSelected, content: workingContent } as WebsiteSection,
            next,
          )
        : null;
    if (
      sectionDirty &&
      activeCompositionTarget &&
      nextTarget &&
      !sameCompositionScope(activeCompositionTarget.scope, nextTarget.scope)
    ) {
      setPendingPreviewMode({ viewport: next, scope: nextTarget.scope });
      return;
    }
    if (isStandaloneTextEditingTarget(inlineEditingTarget))
      setInlineEditingTarget(null);
    setSelectedChild(null);
    setPreviewMode(next);
  }

  function changeMode(
    next: BuilderMode,
    nextDrawerMode: DrawerMode = next === "design" ? "design" : "content",
  ) {
    if (next === mode) {
      applyDrawerMode(nextDrawerMode);
      return;
    }
    if (
      (mode === "content" && sectionDirty) ||
      (mode === "design" && designDirty)
    ) {
      setPendingMode(next);
      setPendingDrawerMode(nextDrawerMode);
    } else {
      setMode(next);
      applyDrawerMode(nextDrawerMode);
      setContentOverride(null);
      setAppearanceOverride(null);
      setDesignOverride(null);
      setInlineEditingTarget(null);
    }
  }

  function changeDrawerMode(next: DrawerMode) {
    if (next === "sections") {
      setDrawerMode(next);
      return;
    }
    changeMode(next === "design" ? "design" : "content", next);
  }

  function toggle(section: WebsiteSection) {
    const current = structureFor(workingSections);
    setSectionStructureOverride({
      ...current,
      enabledById: {
        ...current.enabledById,
        [section.id]: !section.isEnabled,
      },
    });
  }
  function move(index: number, direction: -1 | 1) {
    const ids = workingSections.map(({ id }) => id);
    const target = index + direction;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setSectionStructureOverride({
      ...structureFor(workingSections),
      order: ids,
    });
  }
  function reorderSections(ids: string[]) {
    setSectionStructureOverride({
      ...structureFor(workingSections),
      order: ids,
    });
  }

  function selectCanonicalSection(updated: WebsiteDraft, sectionId: string) {
    setDraft(updated);
    setSectionStructureOverride(null);
    setContentOverride(null);
    setAppearanceOverride(null);
    setSelectedChild(null);
    setSelectedId(sectionId);
    setCanvasSelectionRequest({
      kind: "section",
      id: sectionId,
      requestId: ++canvasSelectionRequestId.current,
    });
  }

  async function createBlankSection() {
    if (globalDirty || !draft) {
      setListError("Save or discard current changes before adding a Section.");
      return;
    }
    setListPending(true);
    setListError(null);
    try {
      const existing = new Set(draft.sections.map(({ id }) => id));
      const updated = await createWebsiteSection(event.id, projectId, "blank");
      const created = updated.sections.find(({ id }) => !existing.has(id));
      if (!created) throw new Error("The new Section could not be identified.");
      selectCanonicalSection(updated, created.id);
    } catch (createError) {
      setListError(messageFor(createError));
    } finally {
      setListPending(false);
    }
  }

  async function renameBlankSection(
    section: WebsiteSection,
    requested: string,
  ): Promise<boolean> {
    if (globalDirty) {
      setListError(
        "Save or discard current changes before renaming a Section.",
      );
      return false;
    }
    const editorName = requested.trim().replace(/\s+/gu, " ");
    if (!editorName || Array.from(editorName).length > 80) {
      setListError("Section name must contain 1 to 80 characters.");
      return false;
    }
    setListPending(true);
    setListError(null);
    try {
      selectCanonicalSection(
        await renameWebsiteSection(event.id, projectId, section.id, editorName),
        section.id,
      );
      return true;
    } catch (renameError) {
      setListError(messageFor(renameError));
      return false;
    } finally {
      setListPending(false);
    }
  }

  async function duplicateBlankSection(section: WebsiteSection) {
    if (globalDirty) {
      setListError(
        "Save or discard current changes before duplicating a Section.",
      );
      return;
    }
    setListPending(true);
    setListError(null);
    try {
      const updated = await duplicateWebsiteSection(
        event.id,
        projectId,
        section.id,
      );
      const sourceIndex = updated.sections.findIndex(
        ({ id }) => id === section.id,
      );
      const duplicate = updated.sections[sourceIndex + 1];
      if (!duplicate || duplicate.id === section.id)
        throw new Error("The duplicated Section could not be identified.");
      selectCanonicalSection(updated, duplicate.id);
    } catch (duplicateError) {
      setListError(messageFor(duplicateError));
    } finally {
      setListPending(false);
    }
  }

  async function deleteBlankSection(section: WebsiteSection): Promise<boolean> {
    if (globalDirty || !draft) {
      setListError(
        "Save or discard current changes before deleting a Section.",
      );
      return false;
    }
    setListPending(true);
    setListError(null);
    try {
      const index = draft.sections.findIndex(({ id }) => id === section.id);
      const updated = await deleteWebsiteSection(
        event.id,
        projectId,
        section.id,
      );
      const next =
        updated.sections[Math.min(index, updated.sections.length - 1)];
      setDraft(updated);
      setSectionStructureOverride(null);
      setContentOverride(null);
      setAppearanceOverride(null);
      setSelectedChild(null);
      setSelectedId(next?.id ?? null);
      if (next)
        setCanvasSelectionRequest({
          kind: "section",
          id: next.id,
          requestId: ++canvasSelectionRequestId.current,
        });
      return true;
    } catch (deleteError) {
      setListError(messageFor(deleteError));
      return false;
    } finally {
      setListPending(false);
    }
  }

  function updateWorkingContent(content: Record<string, unknown>) {
    if (effectiveSelectedId) {
      setContentOverride({
        sectionId: effectiveSelectedId,
        scope: activeCompositionTarget?.scope,
        content,
      });
    }
  }

  function resetSelectedSection() {
    setContentOverride(null);
    setAppearanceOverride(null);
    setInlineEditingTarget(null);
    setAppearanceError(null);
    setContentError(null);
    setMediaOverrides({});
  }

  async function customizeActiveComposition() {
    if (
      sectionDirty ||
      !authoritativeSelected ||
      !activeCompositionTarget ||
      activeCompositionTarget.scope.kind !== "shared"
    )
      return;
    if (
      authoritativeSelected.type !== "hero" &&
      authoritativeSelected.type !== "gallery" &&
      authoritativeSelected.type !== "blank"
    )
      return;
    const presentation = createCustomSectionPresentation(
      authoritativeSelected.content,
      authoritativeSelected.appearance,
      previewMode,
    );
    setListPending(true);
    try {
      contentSaved(
        await updateWebsiteSectionPresentation(
          event.id,
          projectId,
          authoritativeSelected.id,
          presentation.content,
          presentation.appearance,
        ),
      );
      setSelectedChild(null);
      setInlineEditingTarget(null);
      setCanvasSelectionRequest(null);
    } catch (branchError) {
      setContentError(messageFor(branchError));
    } finally {
      setListPending(false);
    }
  }

  async function resetActiveComposition() {
    if (
      sectionDirty ||
      !authoritativeSelected ||
      !activeCompositionTarget ||
      activeCompositionTarget.scope.kind !== "custom"
    )
      return;
    if (
      authoritativeSelected.type !== "hero" &&
      authoritativeSelected.type !== "gallery" &&
      authoritativeSelected.type !== "blank"
    )
      return;
    const presentation = removeCustomSectionPresentation(
      authoritativeSelected.content,
      authoritativeSelected.appearance,
      previewMode,
    );
    setListPending(true);
    try {
      contentSaved(
        await updateWebsiteSectionPresentation(
          event.id,
          projectId,
          authoritativeSelected.id,
          presentation.content,
          presentation.appearance,
        ),
      );
      setSelectedChild(null);
      setInlineEditingTarget(null);
      setCanvasSelectionRequest(null);
    } catch (branchError) {
      setContentError(messageFor(branchError));
    } finally {
      setListPending(false);
    }
  }

  function selectChild(
    sectionId: string,
    reference: SectionChildReference,
    requestCanvasScroll = false,
  ) {
    const section = workingSections.find(({ id }) => id === sectionId);
    const content =
      sectionId === effectiveSelectedId && workingContent
        ? workingContent
        : (section?.content as Record<string, unknown> | undefined);
    const compositionTarget =
      section &&
      content &&
      (section.type === "blank" || section.type === "hero" || section.type === "gallery")
        ? resolveEditorCompositionTarget(
            { ...section, content } as WebsiteSection,
            previewMode,
          )
        : null;
    const target = {
      sectionId,
      compositionScope:
        compositionTarget?.scope ??
        ({ kind: "shared" } as SectionCompositionScope),
      reference,
    };
    const flow = compositionTarget?.composition.childFlow;
    const selectedElement =
      reference.kind === "element"
        ? findSectionElement(flow, reference.id)
        : undefined;
    const canvasEditedTextSelected =
      selectedElement?.type === "text" ||
      selectedElement?.type === "divider" ||
      selectedElement?.type === "compositionGroup";
    if (sectionId !== effectiveSelectedId && sectionDirty) {
      setPendingSelection(sectionId);
      setPendingChildSelection({ ...target, requestCanvasScroll });
      return;
    }
    if (sectionId !== effectiveSelectedId) {
      setSelectedId(sectionId);
      setContentOverride(null);
      setAppearanceOverride(null);
    }
    setInlineEditingTarget(null);
    setSelectedChild(target);
    if (requestCanvasScroll && selectedElement && !selectedElement.isHidden) {
      setCanvasSelectionRequest({
        kind: "element",
        id: selectedElement.id,
        sectionId,
        requestId: ++canvasSelectionRequestId.current,
      });
    }
    setMode("content");
    setSectionPanelMode(canvasEditedTextSelected ? "appearance" : "content");
    applyDrawerMode(canvasEditedTextSelected ? "appearance" : "content");
  }

  function changeChildFlow(
    sectionId: string,
    flow: SectionChildFlow | undefined,
    selection?: SectionChildReference,
  ) {
    const section = workingSections.find(({ id }) => id === sectionId);
    if (!section) return false;
    if (sectionId !== effectiveSelectedId && sectionDirty) {
      setPendingSelection(sectionId);
      if (selection)
        setPendingChildSelection({
          sectionId,
          compositionScope: activeCompositionTarget?.scope ?? {
            kind: "shared",
          },
          reference: selection,
        });
      return false;
    }
    const content = structuredClone(
      sectionId === effectiveSelectedId && workingContent
        ? workingContent
        : (section.content as Record<string, unknown>),
    );
    if (!flow) return false;
    const target =
      section.type === "blank" || section.type === "hero" || section.type === "gallery"
        ? resolveEditorCompositionTarget(
            { ...section, content } as WebsiteSection,
            previewMode,
          )
        : null;
    if (!target) return false;
    const nextContent = replaceScopedComposition(content, target.scope, {
      childFlow: flow,
    });
    if (sectionId !== effectiveSelectedId) {
      setSelectedId(sectionId);
      setAppearanceOverride(null);
    }
    setContentOverride({
      sectionId,
      scope: target?.scope,
      content: nextContent,
    });
    setInlineEditingTarget(null);
    if (selection) {
      setSelectedChild({
        sectionId,
        compositionScope: target?.scope ?? { kind: "shared" },
        reference: selection,
      });
      const selectedElement =
        selection.kind === "element"
          ? findSectionElement(flow, selection.id)
          : undefined;
      if (selectedElement && !selectedElement.isHidden) {
        setCanvasSelectionRequest({
          kind: "element",
          id: selectedElement.id,
          sectionId,
          requestId: ++canvasSelectionRequestId.current,
        });
      }
      const canvasEditedTextSelected =
        selectedElement?.type === "text" ||
        selectedElement?.type === "divider" ||
        selectedElement?.type === "compositionGroup";
      if (canvasEditedTextSelected) {
        setSectionPanelMode("appearance");
        applyDrawerMode("appearance");
      }
    }
    return true;
  }

  async function saveChildRename(
    sectionId: string,
    flow: SectionChildFlow,
  ): Promise<string | null> {
    const section = workingSections.find(({ id }) => id === sectionId);
    if (!section) return "Unable to find this section. Please try again.";
    const content = structuredClone(
      sectionId === effectiveSelectedId && workingContent
        ? workingContent
        : (section.content as Record<string, unknown>),
    );
    const target =
      section.type === "blank" || section.type === "hero" || section.type === "gallery"
        ? resolveEditorCompositionTarget(
            { ...section, content } as WebsiteSection,
            previewMode,
          )
        : null;
    if (!target) return "This Section does not support block trees.";
    const nextContent = replaceScopedComposition(content, target.scope, {
      childFlow: flow,
    });
    const parsed = validateSectionContent(
      section.type,
      nextContent,
      draft?.template?.key,
    );
    if (!parsed.success)
      return "Review this section and enter valid content before saving the block name.";
    setListPending(true);
    setContentError(null);
    try {
      const updated = await updateWebsiteSectionContent(
        event.id,
        projectId,
        sectionId,
        parsed.data as Record<string, unknown>,
      );
      if (sectionId === effectiveSelectedId) contentSaved(updated);
      else setDraft(updated);
      return null;
    } catch (saveError) {
      return saveError instanceof ApiError
        ? (saveError.validationErrors.content?.[0] ?? saveError.message)
        : "Unable to save the block name. Please try again.";
    } finally {
      setListPending(false);
    }
  }

  function requestInlineEdit(target: InlineEditingTarget) {
    if (target.sectionId !== effectiveSelectedId) return;
    const compositionScope = activeCompositionTarget?.scope;
    setInlineEditingTarget({ ...target, compositionScope });
    if (target.elementId) {
      setSelectedChild({
        sectionId: target.sectionId,
        compositionScope: compositionScope ?? { kind: "shared" },
        reference: { kind: "element", id: target.elementId },
      });
    }
  }

  function changeEditorMode(next: EditorMode) {
    setEditorMode(next);
    if (next === "preview") setInlineEditingTarget(null);
  }

  function contentSaved(updated: WebsiteDraft) {
    setDraft(updated);
    setContentOverride(null);
    setInlineEditingTarget(null);
    setMediaOverrides({});
  }

  function updateInlineValue(target: InlineEditingTarget, value: string) {
    if (target.sectionId !== effectiveSelectedId || !workingContent) return;
    const next = structuredClone(workingContent);
    const path: InlineFieldPath = target.path;
    if (target.elementId) {
      return;
    }
    let cursor: unknown = next;
    path.forEach((part, index) => {
      if (Array.isArray(cursor) && typeof part === "number") {
        if (index === path.length - 1) cursor[part] = value;
        else cursor = cursor[part];
      } else if (
        cursor &&
        typeof cursor === "object" &&
        typeof part === "string"
      ) {
        const record = cursor as Record<string, unknown>;
        if (index === path.length - 1) record[part] = value;
        else cursor = record[part];
      }
    });
    setContentOverride({ sectionId: target.sectionId, content: next });
  }

  const previewDraft = useMemo(() => {
    if (!draft) return null;
    return {
      ...draft,
      media: { ...draft.media, ...mediaOverrides },
      designSettings: designOverride ?? draft.designSettings,
      sections: workingSections.map((section) => ({
        ...section,
        content:
          contentOverride?.sectionId === section.id
            ? contentOverride.content
            : section.content,
        appearance:
          appearanceOverride?.sectionId === section.id
            ? appearanceOverride.appearance
            : section.appearance,
      })),
    } as WebsiteDraft;
  }, [
    appearanceOverride,
    contentOverride,
    designOverride,
    draft,
    mediaOverrides,
    workingSections,
  ]);

  async function saveEditorChanges() {
    if (!draft) return false;
    let domain: "structure" | "content" | "appearance" | "design" = "structure";
    let latestDraft = draft;
    const desiredStructure = structureFor(workingSections);
    setListPending(true);
    setListError(null);
    setContentError(null);
    setAppearanceError(null);
    setDesignError(null);
    try {
      if (sectionOrderDirty) {
        latestDraft = await reorderWebsiteSections(
          event.id,
          projectId,
          desiredStructure.order,
        );
        setDraft(latestDraft);
      }
      for (const sectionId of desiredStructure.order) {
        const persisted = latestDraft.sections.find(
          ({ id }) => id === sectionId,
        );
        const desiredEnabled = desiredStructure.enabledById[sectionId];
        if (!persisted || persisted.isEnabled === desiredEnabled) continue;
        latestDraft = await setWebsiteSectionEnabled(
          event.id,
          projectId,
          sectionId,
          desiredEnabled,
        );
        setDraft(latestDraft);
      }
      setSectionStructureOverride(null);

      if (contentDirty && selected && workingContent) {
        domain = "content";
        const freshestSection = latestDraft.sections.find(
          ({ id }) => id === selected.id,
        );
        let saveContent = workingContent;
        if (
          freshestSection &&
          contentOverride?.scope &&
          activeCompositionTarget
        ) {
          saveContent = mergeScopedComposition(
            freshestSection.content as Record<string, unknown>,
            contentOverride.scope,
            activeCompositionTarget.composition,
          );
          if ("semantic" in workingContent)
            saveContent.semantic = workingContent.semantic;
        }
        const parsed = validateSectionContent(
          selected.type,
          saveContent,
          draft?.template?.key,
        );
        if (!parsed.success) {
          const issue = parsed.error?.issues[0];
          const field = issue?.path.length ? issue.path.join(".") : "content";
          setContentError(
            issue
              ? `${field}: ${issue.message}`
              : "Review this section and enter valid content before saving.",
          );
          return false;
        }
        latestDraft = await updateWebsiteSectionContent(
          event.id,
          projectId,
          selected.id,
          parsed.data as Record<string, unknown>,
        );
        contentSaved(latestDraft);
      }

      if (appearanceDirty && effectiveSelectedId && workingAppearance) {
        domain = "appearance";
        const freshestSelected = latestDraft.sections.find(
          (section) => section.id === effectiveSelectedId,
        );
        const appearance =
          activeAppearanceTarget &&
          freshestSelected &&
          (freshestSelected.type === "hero" ||
            freshestSelected.type === "gallery" ||
            freshestSelected.type === "blank")
            ? mergeScopedSectionAppearance(
                freshestSelected.appearance,
                activeAppearanceTarget.scope,
                pruneResponsiveAppearance(workingAppearance),
              )
            : pruneResponsiveAppearance(workingAppearance);
        latestDraft = await updateWebsiteSectionAppearance(
          event.id,
          projectId,
          effectiveSelectedId,
          appearance,
        );
        setDraft(latestDraft);
        setAppearanceOverride(null);
      }

      if (designDirty && designOverride) {
        domain = "design";
        latestDraft = await updateWebsiteDesignSettings(
          event.id,
          projectId,
          designOverride,
        );
        setDraft(latestDraft);
        setDesignOverride(null);
      }
      return true;
    } catch (saveError) {
      if (domain === "structure") setListError(messageFor(saveError));
      else if (domain === "content") {
        setContentError(
          saveError instanceof ApiError
            ? (saveError.validationErrors.content?.[0] ?? saveError.message)
            : "Unable to save this section. Please try again.",
        );
      } else if (domain === "appearance") {
        setAppearanceError(messageFor(saveError));
      } else setDesignError(messageFor(saveError));
      return false;
    } finally {
      setListPending(false);
    }
  }

  function resetEditorChanges() {
    setSectionStructureOverride(null);
    setDesignOverride(null);
    setDesignError(null);
    resetSelectedSection();
    setListError(null);
  }

  async function saveSectionDesignDefaults(defaults: SectionDesignDefaults) {
    if (!effectiveSelectedId) return;
    setSectionDesignSaving(true);
    setSectionDesignError(null);
    try {
      setDraft(
        await updateWebsiteSectionDesignDefaults(
          event.id,
          projectId,
          effectiveSelectedId,
          defaults,
        ),
      );
    } catch (saveError) {
      setSectionDesignError(messageFor(saveError));
    } finally {
      setSectionDesignSaving(false);
    }
  }

  async function addProjectColor(value: string): Promise<ProjectColor> {
    try {
      const updated = await addWebsiteProjectColor(event.id, projectId, value);
      const customColors = updated.designSettings.customColors;
      setDraft({
        ...draft!,
        designSettings: { ...draft!.designSettings, customColors },
      });
      setDesignOverride((current) =>
        current ? { ...current, customColors } : null,
      );
      const added = customColors.at(-1);
      if (!added)
        throw new Error("The color was saved but could not be loaded.");
      return added;
    } catch (addError) {
      if (addError instanceof ApiError) {
        throw new Error(
          addError.validationErrors.value?.[0] ?? addError.message,
          { cause: addError },
        );
      }
      throw addError;
    }
  }

  if (isLoading) return <EditorLoading eventId={event.id} />;
  if (isUninitialized)
    return (
      <EditorError
        eventId={event.id}
        message="Website Project not found."
        retry={retry}
      />
    );
  if (error || !draft || !previewDraft)
    return (
      <EditorError
        eventId={event.id}
        message={messageFor(error)}
        retry={retry}
      />
    );
  const selected = workingSelected;
  const designSettings = designOverride ?? draft.designSettings;

  const sectionRail = (
    <SectionNavigator
      sections={workingSections}
      selectedId={effectiveSelectedId}
      workingChildFlow={
        selected &&
        workingContent &&
        (selected.type === "blank" || selected.type === "hero" || selected.type === "gallery")
          ? {
              sectionId: selected.id,
              flow: activeCompositionTarget?.composition.childFlow,
            }
          : null
      }
      selectedChild={selectedChild}
      genericChildTypesBySectionType={Object.fromEntries(
        (draft.template?.capabilities.sections ?? []).map(
          ({ id, elements }) => [
            id,
            elements?.allowedTypes.filter(
              (
                type,
              ): type is import("../../features/websiteElements/blockIdentity").GenericBlockType =>
                type === "text" ||
                type === "date" ||
                type === "accordion" ||
                type === "schedule" ||
                type === "people" ||
                type === "divider" ||
                type === "media" ||
                type === "compositionGroup",
            ) ?? [],
          ],
        ),
      )}
      pending={listPending}
      onSelect={selectSection}
      onChildSelect={(sectionId, reference) =>
        selectChild(sectionId, reference, true)
      }
      onChildFlowChange={changeChildFlow}
      onChildRenameSave={saveChildRename}
      onToggle={toggle}
      onMove={move}
      onReorder={reorderSections}
      onCreate={() => void createBlankSection()}
      onRename={setRenameSectionTarget}
      onDuplicate={(section) => void duplicateBlankSection(section)}
      onDelete={setDeleteSectionTarget}
    />
  );
  const desktopInspector =
    mode === "design" && draft.template ? (
      <DesignPanel
        settings={designSettings}
        capability={globalDesignCapability(draft.template.capabilities)}
        library={draft.template.capabilities.designLibrary}
        error={designError}
        eventName={event.name}
        templateKey={draft.templateKey}
        onChange={setDesignOverride}
      />
    ) : (
      <SectionInspector
        eventId={event.id}
        templateKey={draft.templateKey}
        capabilities={draft.template?.capabilities}
        resolvedMedia={previewDraft.media}
        onMediaResolved={(media) =>
          setMediaOverrides((current) => ({ ...current, [media.id]: media }))
        }
        selected={selected}
        workingContent={workingContent}
        workingAppearance={workingAppearance}
        targetViewport={previewMode}
        selectedChild={
          selectedChild &&
          selectedChild.sectionId === selected?.id &&
          activeCompositionTarget &&
          sameCompositionScope(
            selectedChild.compositionScope,
            activeCompositionTarget.scope,
          )
            ? selectedChild.reference
            : null
        }
        panelMode={sectionPanelMode}
        showModeSwitch
        appearanceDirty={appearanceDirty}
        contentDirty={selected?.type === "gallery" ? sectionDirty : contentDirty}
        compositionPending={listPending}
        appearanceError={appearanceError}
        sectionDesignSaving={sectionDesignSaving}
        sectionDesignError={sectionDesignError}
        onPanelModeChange={(next) => applyDrawerMode(next)}
        projectColors={designSettings.customColors}
        onAddColor={addProjectColor}
        onContentChange={updateWorkingContent}
        onCustomizeComposition={customizeActiveComposition}
        onResetComposition={resetActiveComposition}
        onAppearanceChange={(appearance) =>
          selected &&
          setAppearanceOverride({
            sectionId: selected.id,
            appearance: activeAppearanceTarget
              ? replaceScopedSectionAppearance(
                  workingAppearanceOwner as WebsiteSectionAppearanceEnvelope,
                  activeAppearanceTarget.scope,
                  appearance,
                )
              : appearance,
          })
        }
        onSectionDesignChange={(defaults) =>
          void saveSectionDesignDefaults(defaults)
        }
      />
    );
  const mobileDrawerPanel =
    drawerMode === "sections" ? (
      <div
        className="h-full overflow-y-auto overscroll-contain"
        data-structure-scroll-container
      >
        {sectionRail}
      </div>
    ) : drawerMode === "design" && draft.template ? (
      <DesignPanel
        settings={designSettings}
        capability={globalDesignCapability(draft.template.capabilities)}
        library={draft.template.capabilities.designLibrary}
        error={designError}
        eventName={event.name}
        templateKey={draft.templateKey}
        onChange={setDesignOverride}
      />
    ) : (
      <SectionInspector
        eventId={event.id}
        templateKey={draft.templateKey}
        capabilities={draft.template?.capabilities}
        resolvedMedia={previewDraft.media}
        onMediaResolved={(media) =>
          setMediaOverrides((current) => ({ ...current, [media.id]: media }))
        }
        selected={selected}
        workingContent={workingContent}
        workingAppearance={workingAppearance}
        targetViewport={previewMode}
        selectedChild={
          selectedChild &&
          selectedChild.sectionId === selected?.id &&
          activeCompositionTarget &&
          sameCompositionScope(
            selectedChild.compositionScope,
            activeCompositionTarget.scope,
          )
            ? selectedChild.reference
            : null
        }
        panelMode={drawerMode === "appearance" ? "appearance" : "content"}
        showModeSwitch={false}
        appearanceDirty={appearanceDirty}
        contentDirty={selected?.type === "gallery" ? sectionDirty : contentDirty}
        compositionPending={listPending}
        appearanceError={appearanceError}
        sectionDesignSaving={sectionDesignSaving}
        sectionDesignError={sectionDesignError}
        onPanelModeChange={(next) => applyDrawerMode(next)}
        projectColors={designSettings.customColors}
        onAddColor={addProjectColor}
        onContentChange={updateWorkingContent}
        onCustomizeComposition={customizeActiveComposition}
        onResetComposition={resetActiveComposition}
        onAppearanceChange={(appearance) =>
          selected &&
          setAppearanceOverride({
            sectionId: selected.id,
            appearance: activeAppearanceTarget
              ? replaceScopedSectionAppearance(
                  workingAppearanceOwner as WebsiteSectionAppearanceEnvelope,
                  activeAppearanceTarget.scope,
                  appearance,
                )
              : appearance,
          })
        }
        onSectionDesignChange={(defaults) =>
          void saveSectionDesignDefaults(defaults)
        }
      />
    );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <header className="z-20 flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b border-border bg-surface px-3 py-2 sm:px-4">
        <Link
          className="mr-1 inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-medium text-foreground-muted hover:bg-surface-muted hover:text-foreground"
          to={`/events/${event.id}`}
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back to Event
        </Link>
        <div className="hidden h-6 w-px bg-border sm:block" />
        <div
          className="mr-auto flex min-w-0 items-center gap-2 px-2"
          aria-label={`Template: ${draft.template?.displayName ?? draft.templateKey}`}
        >
          <LayoutTemplate size={16} className="shrink-0 text-accent" />
          <span className="hidden text-xs text-foreground-muted sm:inline">
            Template
          </span>
          <span className="truncate text-sm font-semibold">
            {draft.template?.displayName ?? draft.templateKey}
          </span>
        </div>
        <SegmentedControl
          value={editorMode}
          options={[
            { value: "edit", label: "Edit" },
            { value: "preview", label: "Preview" },
          ]}
          label="Editor mode"
          onChange={changeEditorMode}
        />
        <Link
          className="inline-flex min-h-8 shrink-0 items-center justify-center gap-1.5 rounded-sm border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted"
          to={`/events/${event.id}/websites/${projectId}/preview`}
          target="_blank"
          rel="noopener noreferrer"
          title={
            globalDirty
              ? "Shows the last saved draft. Unsaved builder changes are not included."
              : "Preview the saved Website on this device"
          }
          aria-label={
            globalDirty
              ? "Preview saved Website draft in a new tab. Unsaved changes are not included."
              : "Preview Website in a new tab"
          }
        >
          <ExternalLink aria-hidden="true" size={15} />
          <span>{globalDirty ? "Preview saved draft" : "Preview Website"}</span>
        </Link>
        <div className="hidden xl:block">
          <SegmentedControl
            value={mode}
            options={[
              { value: "content", label: "Content" },
              { value: "design", label: "Design" },
            ]}
            label="Builder mode"
            onChange={changeMode}
          />
        </div>
        {accessibleViewports.length > 1 && (
          <div>
            <SegmentedControl
              value={previewMode}
              options={accessibleViewports.map((viewport) => ({
                value: viewport,
                label: viewport[0].toUpperCase() + viewport.slice(1),
                icon:
                  viewport === "desktop" ? (
                    <Monitor size={14} />
                  ) : viewport === "tablet" ? (
                    <Tablet size={14} />
                  ) : (
                    <Smartphone size={14} />
                  ),
              }))}
              label="Preview and editing viewport"
              onChange={changePreviewMode}
            />
          </div>
        )}
      </header>

      {contentError && (
        <p
          className="shrink-0 border-b border-border bg-danger-muted px-4 py-2 text-sm text-danger"
          role="alert"
        >
          {contentError}
        </p>
      )}
      <BuilderSaveBar
        dirty={globalDirty}
        resetDirty={globalDirty}
        saving={listPending}
        onSave={() => void saveEditorChanges()}
        onReset={resetEditorChanges}
      />

      {listError && (
        <p
          className="shrink-0 border-b border-border bg-danger-muted px-4 py-2 text-sm text-danger"
          role="alert"
        >
          {listError}
        </p>
      )}
      {workingSections.length === 0 ? (
        <EmptyEditor />
      ) : (
        <div
          className="flex h-0 min-h-0 flex-1 overflow-hidden xl:grid xl:grid-cols-[var(--desktop-editor-grid-columns)] xl:grid-rows-[minmax(0,1fr)]"
          style={desktopEditorGridStyle}
        >
          <aside
            className="hidden min-h-0 overflow-y-auto border-r border-border bg-background p-3 xl:block"
            aria-label="Builder Section rail"
            data-structure-scroll-container
          >
            {sectionRail}
          </aside>
          <PreviewCanvas
            event={event}
            draft={previewDraft}
            mode={mode}
            editorMode={editorMode}
            selectedId={effectiveSelectedId}
            previewMode={previewMode}
            unsaved={globalDirty}
            inlineValue={
              mode === "content"
                ? {
                    activeTarget: inlineEditingTarget,
                    requestEdit: requestInlineEdit,
                    updateValue: updateInlineValue,
                    finishEdit: () => setInlineEditingTarget(null),
                  }
                : null
            }
            selectedChild={
              selectedChild?.sectionId === effectiveSelectedId &&
              activeCompositionTarget &&
              sameCompositionScope(
                selectedChild.compositionScope,
                activeCompositionTarget.scope,
              )
                ? selectedChild.reference
                : null
            }
            selectionRequest={canvasSelectionRequest}
            onChildSelect={selectChild}
            onChildFlowChange={changeChildFlow}
            onAddColor={addProjectColor}
            onSectionSelect={selectSection}
            onGalleryAdd={(id) => {
              selectSection(id);
              if (sectionDirty && id !== effectiveSelectedId) return;
              setMode("content");
              setSectionPanelMode("content");
              setDrawerMode("content");
              setDrawerSnap("medium");
              requestAnimationFrame(() => {
                const button = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-gallery-add]")).find(node => node.dataset.galleryAdd === id && node.getClientRects().length > 0);
                button?.click();
              });
            }}
          />
          <aside
            className="hidden h-full min-h-0 overflow-hidden border-l border-border bg-background p-3 xl:block"
            aria-label="Builder inspector"
          >
            {desktopInspector}
          </aside>

          <MobileBuilderDrawer
            snap={drawerSnap}
            mode={drawerMode}
            contextLabel={
              drawerMode === "sections"
                ? "Sections"
                : drawerMode === "design"
                  ? "Website Â· Design"
                  : `${selected?.editorName ?? selected?.displayName ?? "Section"} Â· ${drawerMode === "appearance" ? "Appearance" : "Content"}`
            }
            onSnapChange={setDrawerSnap}
            onModeChange={changeDrawerMode}
          >
            {mobileDrawerPanel}
          </MobileBuilderDrawer>
        </div>
      )}

      <DiscardChangesDialog
        open={
          pendingSelection !== null ||
          pendingMode !== null ||
          pendingPreviewMode !== null
        }
        onCancel={() => {
          setPendingSelection(null);
          setPendingMode(null);
          setPendingDrawerMode(null);
          setPendingPreviewMode(null);
          setPendingChildSelection(null);
        }}
        saving={listPending}
        onSave={() =>
          void (async () => {
            if (!(await saveEditorChanges())) return;
            if (pendingSelection) setSelectedId(pendingSelection);
            if (pendingMode) setMode(pendingMode);
            if (pendingDrawerMode) applyDrawerMode(pendingDrawerMode);
            if (pendingPreviewMode) {
              setPreviewMode(pendingPreviewMode.viewport);
              setSelectedChild(null);
              setInlineEditingTarget(null);
            }
            if (pendingChildSelection) {
              setSelectedChild({
                sectionId: pendingChildSelection.sectionId,
                compositionScope: pendingChildSelection.compositionScope,
                reference: pendingChildSelection.reference,
              });
              const pendingSection = workingSections.find(
                ({ id }) => id === pendingChildSelection.sectionId,
              );
              const pendingFlow =
                pendingSection &&
                (pendingSection.type === "blank" ||
                  pendingSection.type === "gallery" ||
                  pendingSection.type === "hero")
                  ? resolveEditorCompositionTarget(pendingSection, previewMode)
                      .composition.childFlow
                  : undefined;
              const pendingElement =
                pendingChildSelection.reference.kind === "element"
                  ? findSectionElement(
                      pendingFlow,
                      pendingChildSelection.reference.id,
                    )
                  : undefined;
              if (
                pendingChildSelection.requestCanvasScroll &&
                pendingElement &&
                !pendingElement.isHidden
              ) {
                setCanvasSelectionRequest({
                  kind: "element",
                  id: pendingElement.id,
                  sectionId: pendingChildSelection.sectionId,
                  requestId: ++canvasSelectionRequestId.current,
                });
              }
            }
            setPendingSelection(null);
            setPendingMode(null);
            setPendingDrawerMode(null);
            setPendingPreviewMode(null);
            setPendingChildSelection(null);
          })()
        }
        onDiscard={() => {
          if (pendingSelection) setSelectedId(pendingSelection);
          if (pendingMode) setMode(pendingMode);
          if (pendingDrawerMode) applyDrawerMode(pendingDrawerMode);
          if (pendingPreviewMode) {
            setPreviewMode(pendingPreviewMode.viewport);
            setSelectedChild(null);
          }
          if (pendingSelection || pendingMode) {
            setInlineEditingTarget(null);
          }
          if (pendingChildSelection) {
            setSelectedChild({
              sectionId: pendingChildSelection.sectionId,
              compositionScope: pendingChildSelection.compositionScope,
              reference: pendingChildSelection.reference,
            });
            const pendingSection = workingSections.find(
              ({ id }) => id === pendingChildSelection.sectionId,
            );
            const pendingFlow =
              pendingSection &&
              (pendingSection.type === "blank" ||
                pendingSection.type === "gallery" ||
                pendingSection.type === "hero")
                ? resolveEditorCompositionTarget(pendingSection, previewMode)
                    .composition.childFlow
                : undefined;
            const pendingElement =
              pendingChildSelection.reference.kind === "element"
                ? findSectionElement(
                    pendingFlow,
                    pendingChildSelection.reference.id,
                  )
                : undefined;
            if (
              pendingChildSelection.requestCanvasScroll &&
              pendingElement &&
              !pendingElement.isHidden
            ) {
              setCanvasSelectionRequest({
                kind: "element",
                id: pendingElement.id,
                sectionId: pendingChildSelection.sectionId,
                requestId: ++canvasSelectionRequestId.current,
              });
            }
          }
          setPendingSelection(null);
          setPendingMode(null);
          setPendingDrawerMode(null);
          setPendingPreviewMode(null);
          setPendingChildSelection(null);
          setContentOverride(null);
          setAppearanceOverride(null);
          setDesignOverride(null);
          setSectionStructureOverride(null);
          setAppearanceError(null);
          setContentError(null);
          setDesignError(null);
          setListError(null);
        }}
      />
      {renameSectionTarget && (
        <BlankSectionRenameDialog
          key={renameSectionTarget.id}
          section={renameSectionTarget}
          pending={listPending}
          onClose={() => setRenameSectionTarget(null)}
          onRename={(name) => renameBlankSection(renameSectionTarget, name)}
        />
      )}
      {deleteSectionTarget && (
        <BlankSectionDeleteDialog
          section={deleteSectionTarget}
          pending={listPending}
          onClose={() => setDeleteSectionTarget(null)}
          onDelete={() => deleteBlankSection(deleteSectionTarget)}
        />
      )}
    </div>
  );
}

function MobileBuilderDrawer({
  snap,
  mode,
  contextLabel,
  children,
  onSnapChange,
  onModeChange,
}: {
  snap: MobileDrawerSnap;
  mode: DrawerMode;
  contextLabel: string;
  children: React.ReactNode;
  onSnapChange: (snap: MobileDrawerSnap) => void;
  onModeChange: (mode: DrawerMode) => void;
}) {
  const drawerRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startY: number;
    startHeight: number;
    currentY: number;
    moved: boolean;
  } | null>(null);
  const suppressTapRef = useRef(false);
  const isHidden = snap === "hidden";
  const height =
    snap === "hidden"
      ? "h-[calc(4rem+env(safe-area-inset-bottom))]"
      : snap === "tall"
        ? "h-[84dvh]"
        : "h-[50dvh]";
  const tabs: Array<[DrawerMode, string]> = [
    ["sections", "Sections"],
    ["content", "Content"],
    ["appearance", "Appearance"],
    ["design", "Design"],
  ];
  const snapOrder: MobileDrawerSnap[] = ["hidden", "medium", "tall"];

  function snapHeight(target: MobileDrawerSnap) {
    if (target === "hidden") return 64;
    return window.innerHeight * (target === "medium" ? 0.5 : 0.84);
  }

  function moveOne(direction: -1 | 1) {
    const nextIndex = Math.max(
      0,
      Math.min(snapOrder.length - 1, snapOrder.indexOf(snap) + direction),
    );
    onSnapChange(snapOrder[nextIndex]);
  }

  function handleHeaderTap() {
    if (suppressTapRef.current) {
      suppressTapRef.current = false;
      return;
    }
    onSnapChange(
      snap === "hidden" ? "medium" : snap === "medium" ? "tall" : "medium",
    );
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (!drawerRef.current || event.button !== 0) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      currentY: event.clientY,
      startHeight: drawerRef.current.getBoundingClientRect().height,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !drawerRef.current)
      return;
    drag.currentY = event.clientY;
    const delta = drag.startY - event.clientY;
    if (!drag.moved && Math.abs(delta) < 10) return;
    drag.moved = true;
    event.preventDefault();
    suppressTapRef.current = true;
    const nextHeight = Math.max(
      snapHeight("hidden"),
      Math.min(snapHeight("tall"), drag.startHeight + delta),
    );
    drawerRef.current.style.transition = "none";
    drawerRef.current.style.height = `${nextHeight}px`;
  }

  function finishPointer(
    event: React.PointerEvent<HTMLButtonElement>,
    cancelled = false,
  ) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !drawerRef.current)
      return;
    dragRef.current = null;
    const delta = drag.startY - drag.currentY;
    let nextSnap = snap;
    if (!cancelled && drag.moved && Math.abs(delta) >= 10) {
      const finalHeight = Math.max(
        snapHeight("hidden"),
        Math.min(snapHeight("tall"), drag.startHeight + delta),
      );
      const nearest = snapOrder.reduce(
        (closest, candidate) =>
          Math.abs(snapHeight(candidate) - finalHeight) <
          Math.abs(snapHeight(closest) - finalHeight)
            ? candidate
            : closest,
        snap,
      );
      nextSnap =
        nearest === snap
          ? snapOrder[
              Math.max(
                0,
                Math.min(
                  snapOrder.length - 1,
                  snapOrder.indexOf(snap) + (delta > 0 ? 1 : -1),
                ),
              )
            ]
          : nearest;
    }
    drawerRef.current.style.removeProperty("transition");
    drawerRef.current.style.removeProperty("height");
    onSnapChange(nextSnap);
  }

  return (
    <aside
      ref={drawerRef}
      className={`fixed inset-x-0 bottom-0 z-40 flex flex-col overflow-hidden rounded-t-2xl border border-b-0 border-border bg-background shadow-[0_-12px_32px_rgb(24_18_15/12%)] transition-[height] duration-200 motion-reduce:transition-none xl:hidden ${height}`}
      aria-label={`Mobile Website builder controls, ${snap} height`}
    >
      <div
        className={`relative shrink-0 bg-surface px-3 pt-2 ${isHidden ? "" : "border-b border-border"}`}
      >
        <span
          className="pointer-events-none absolute left-1/2 top-3 h-1 w-10 -translate-x-1/2 rounded-full bg-border"
          aria-hidden="true"
        />
        <div className="flex items-center gap-1">
          <button
            className="flex min-h-12 min-w-0 flex-1 touch-none flex-col items-start justify-center gap-1 rounded-lg px-2 text-left hover:bg-surface-muted"
            type="button"
            aria-expanded={!isHidden}
            onClick={handleHeaderTap}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishPointer}
            onPointerCancel={(event) => finishPointer(event, true)}
          >
            <span className="h-1 w-10 opacity-0" aria-hidden="true" />
            <span className="w-full truncate text-sm font-semibold">
              {contextLabel}
            </span>
          </button>
          <button
            className="grid size-10 shrink-0 place-items-center rounded-lg text-foreground-muted hover:bg-surface-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
            type="button"
            disabled={snap === "tall"}
            onClick={() => moveOne(1)}
            aria-label="Increase drawer height"
          >
            <ChevronUp size={18} aria-hidden="true" />
          </button>
          <button
            className="grid size-10 shrink-0 place-items-center rounded-lg text-foreground-muted hover:bg-surface-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
            type="button"
            disabled={snap === "hidden"}
            onClick={() => moveOne(-1)}
            aria-label="Decrease drawer height"
          >
            <ChevronDown size={18} aria-hidden="true" />
          </button>
        </div>
        {!isHidden && (
          <>
            <div
              className="grid grid-cols-4 gap-1 py-2"
              role="tablist"
              aria-label="Builder panels"
            >
              {tabs.map(([key, label]) => (
                <button
                  className={`min-h-9 rounded-lg px-1 text-[11px] font-medium text-sm lg:text-xs ${mode === key ? "bg-accent text-accent-foreground" : "text-foreground-muted hover:bg-surface-muted hover:text-foreground"}`}
                  id={`builder-drawer-tab-${key}`}
                  key={key}
                  type="button"
                  role="tab"
                  aria-controls="builder-drawer-panel"
                  aria-selected={mode === key}
                  onClick={() => onModeChange(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {!isHidden && (
        <div
          className="min-h-0 flex-1 overflow-hidden px-3 pt-3"
          id="builder-drawer-panel"
          role="tabpanel"
          aria-labelledby={`builder-drawer-tab-${mode}`}
          style={
            mode === "sections"
              ? { paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }
              : undefined
          }
        >
          <div className="mx-auto h-full min-h-0 max-w-2xl overflow-hidden">
            {children}
          </div>
        </div>
      )}
    </aside>
  );
}

function PreviewCanvas({
  event,
  draft,
  mode,
  editorMode,
  selectedId,
  previewMode,
  unsaved,
  inlineValue,
  selectedChild,
  selectionRequest,
  onChildSelect,
  onChildFlowChange,
  onAddColor,
  onSectionSelect,
  onGalleryAdd,
}: {
  event: ReturnType<typeof useEventWorkspace>;
  draft: WebsiteDraft;
  mode: BuilderMode;
  editorMode: EditorMode;
  selectedId: string | null;
  previewMode: ResponsiveViewport;
  unsaved: boolean;
  inlineValue: React.ComponentProps<typeof InlineEditProvider>["value"];
  selectedChild: SectionChildReference | null;
  selectionRequest: CanvasSelectionRequest | null;
  onChildSelect: (sectionId: string, reference: SectionChildReference) => void;
  onChildFlowChange: (
    sectionId: string,
    flow: SectionChildFlow | undefined,
    selection?: SectionChildReference,
  ) => boolean;
  onAddColor: (value: string) => Promise<ProjectColor>;
  onSectionSelect: (id: string) => void;
  onGalleryAdd: (id: string) => void;
}) {
  const previewAreaRef = useRef<HTMLDivElement>(null);
  const [availableSize, setAvailableSize] = useState({ width: 0, height: 0 });
  const [zoomPreferences, setZoomPreferences] = useState<EditorZoomPreferences>(
    () => loadEditorZoomPreferences(browserEditorZoomStorage()),
  );
  const zoomPreference = zoomPreferences[previewMode];
  const viewport = EDITOR_DEVICE_VIEWPORTS[previewMode];
  const fitScale = computeFitScale(
    availableSize.width || viewport.width,
    availableSize.height || viewport.height,
    viewport.width,
    viewport.height,
  );
  const effectiveScale =
    zoomPreference.type === "fit" ? fitScale : zoomPreference.scale;
  const canvasGeometry = resolveEditorCanvasGeometry(viewport, effectiveScale);

  useLayoutEffect(() => {
    const element = previewAreaRef.current;
    if (!element) return;
    const measure = () =>
      setAvailableSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function setZoomPreference(preference: EditorZoomPreference) {
    const next = { ...zoomPreferences, [previewMode]: preference };
    setZoomPreferences(next);
    saveEditorZoomPreferences(next, browserEditorZoomStorage());
  }

  useLayoutEffect(() => {
    if (editorMode !== "edit" || !selectionRequest) return;
    const selector =
      selectionRequest.kind === "section"
        ? `[data-preview-section="${CSS.escape(selectionRequest.id)}"]`
        : `[data-editor-website-element="${CSS.escape(selectionRequest.id)}"]`;
    const documents = [
      document,
      ...Array.from(document.querySelectorAll("iframe")).flatMap((frame) =>
        frame.contentDocument ? [frame.contentDocument] : [],
      ),
    ];
    const target = findEditorTarget(documents, selector);
    if (!target) return;
    revealEditorTarget(target);
  }, [editorMode, selectionRequest]);

  return (
    <main
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface-muted p-2 pb-[calc(4rem+env(safe-area-inset-bottom))] sm:p-3 sm:pb-[calc(4rem+env(safe-area-inset-bottom))] xl:pb-3"
      aria-label="Live Website preview"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 px-1 pb-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
            {editorMode === "edit" ? "Live editor" : "Website preview"}
          </p>
          <p className="text-[11px] text-foreground-muted">
            {editorMode === "edit"
              ? "Changes appear before saving."
              : "All enabled sections Â· non-editable"}
          </p>
        </div>
        <div
          className="ml-auto flex shrink-0 items-center gap-1"
          aria-label="Canvas zoom controls"
        >
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-background text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Zoom out"
            disabled={
              zoomPreference.type === "custom" &&
              zoomPreference.scale === EDITOR_ZOOM_STEPS[0]
            }
            onClick={() =>
              setZoomPreference(
                stepEditorZoom(zoomPreference, effectiveScale, -1),
              )
            }
          >
            <Minus size={14} aria-hidden="true" />
          </button>
          <Select
            className="w-[76px]"
            aria-label="Canvas zoom"
            value={
              zoomPreference.type === "fit"
                ? "fit"
                : String(zoomPreference.scale)
            }
            options={[
              { value: "fit", label: "Fit" },
              ...EDITOR_ZOOM_STEPS.map((scale) => ({
                value: String(scale),
                label: `${Math.round(scale * 100)}%`,
              })),
            ]}
            onChange={(value) =>
              setZoomPreference(
                value === "fit"
                  ? { type: "fit" }
                  : { type: "custom", scale: Number(value) },
              )
            }
          />
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-background text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Zoom in"
            disabled={
              zoomPreference.type === "custom" &&
              zoomPreference.scale === EDITOR_ZOOM_STEPS.at(-1)
            }
            onClick={() =>
              setZoomPreference(
                stepEditorZoom(zoomPreference, effectiveScale, 1),
              )
            }
          >
            <Plus size={14} aria-hidden="true" />
          </button>
        </div>
        {unsaved && (
          <span className="rounded-full bg-danger-muted px-2 py-1 text-[10px] font-medium text-danger">
            Unsaved preview
          </span>
        )}
      </div>
      <div
        ref={previewAreaRef}
        className="min-h-0 flex-1 overflow-auto rounded-xl bg-background/45 p-2"
      >
        <div
          className="relative mx-auto h-full shrink-0"
          data-editor-zoom-viewport={previewMode}
          data-editor-zoom-mode={zoomPreference.type}
          style={{
            width: canvasGeometry.displayWidth,
            height: canvasGeometry.displayHeight,
          }}
        >
          <div
            className="absolute left-0 top-0"
            style={{
              width: canvasGeometry.viewportWidth,
              height: canvasGeometry.viewportHeight,
              transform: `scale(${canvasGeometry.scale})`,
              transformOrigin: "top left",
            }}
          >
            <PreviewViewport viewport={previewMode}>
              <InlineEditProvider
                value={editorMode === "edit" ? inlineValue : null}
              >
                <WebsiteRenderer
                  event={event}
                  website={draft}
                  mode={editorMode === "edit" ? "editor" : "public"}
                  selectedSectionId={
                    editorMode === "edit" && mode === "content"
                      ? selectedId
                      : null
                  }
                  onSectionSelect={
                    editorMode === "edit" ? onSectionSelect : undefined
                  }
                  onGalleryAdd={editorMode === "edit" ? onGalleryAdd : undefined}
                  selectedElementId={
                    editorMode === "edit" && selectedChild?.kind === "element"
                      ? selectedChild.id
                      : null
                  }
                  onElementSelect={
                    editorMode === "edit"
                      ? (sectionId, elementId) =>
                          onChildSelect(sectionId, {
                            kind: "element",
                            id: elementId,
                          })
                      : undefined
                  }
                  onElementChange={
                    editorMode === "edit"
                      ? (sectionId: string, element: WebsiteElement) => {
                          const section = draft.sections.find(
                            ({ id }) => id === sectionId,
                          );
                          const flow =
                            section &&
                            (section.type === "blank" ||
                              section.type === "gallery" ||
                              section.type === "hero")
                              ? resolveEditorCompositionTarget(
                                  section,
                                  previewMode,
                                ).composition.childFlow
                              : undefined;
                          if (flow)
                            onChildFlowChange(
                              sectionId,
                              updateSectionElement(flow, element),
                              { kind: "element", id: element.id },
                            );
                        }
                      : undefined
                  }
                  onTextDocumentChange={
                    editorMode === "edit"
                      ? (sectionId, elementId, document) => {
                          const section = draft.sections.find(
                            ({ id }) => id === sectionId,
                          );
                          const flow =
                            section &&
                            (section.type === "blank" ||
                              section.type === "gallery" ||
                              section.type === "hero")
                              ? resolveEditorCompositionTarget(
                                  section,
                                  previewMode,
                                ).composition.childFlow
                              : undefined;
                          if (!flow) return;
                          const next = updateSectionTextDocument(
                            flow,
                            elementId,
                            document,
                          );
                          if (next)
                            onChildFlowChange(sectionId, next, {
                              kind: "element",
                              id: elementId,
                            });
                        }
                      : undefined
                  }
                  onAddColor={editorMode === "edit" ? onAddColor : undefined}
                  targetViewport={previewMode}
                  scope={
                    editorMode === "edit" && selectedId
                      ? { kind: "single-section", sectionId: selectedId }
                      : { kind: "full" }
                  }
                />
              </InlineEditProvider>
            </PreviewViewport>
          </div>
        </div>
      </div>
    </main>
  );
}

function PreviewViewport({
  viewport,
  children,
}: {
  viewport: ResponsiveViewport;
  children: React.ReactNode;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [mount, setMount] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const target = frameRef.current?.contentDocument?.documentElement;
    if (!mount || !target) return;
    const sync = () => syncEditorPreviewTheme(document.documentElement, target);
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    return () => observer.disconnect();
  }, [mount]);

  return (
    <div className="h-full w-full overflow-hidden rounded-lg bg-white shadow-[0_16px_50px_rgb(35_24_18/16%)]">
      <iframe
        ref={frameRef}
        className="h-full w-full border-0"
        title={`${viewport[0].toUpperCase() + viewport.slice(1)} Website preview`}
        srcDoc="<!doctype html><html><head></head><body><div id='responsive-preview-root'></div></body></html>"
        onLoad={(event) => {
          const documentTarget = event.currentTarget.contentDocument;
          if (!documentTarget) return;
          document
            .querySelectorAll(
              'style, link[rel="stylesheet"]:not([data-font-preview])',
            )
            .forEach((node) =>
              documentTarget.head.appendChild(node.cloneNode(true)),
            );
          syncEditorPreviewTheme(
            document.documentElement,
            documentTarget.documentElement,
          );
          documentTarget.body.style.margin = "0";
          const root = documentTarget.getElementById("responsive-preview-root");
          if (root) setMount(root);
        }}
      />
      {mount && createPortal(children, mount)}
    </div>
  );
}

function SectionInspector({
  eventId,
  templateKey,
  capabilities,
  resolvedMedia,
  onMediaResolved,
  selected,
  workingContent,
  workingAppearance,
  targetViewport,
  selectedChild,
  panelMode,
  showModeSwitch,
  appearanceDirty,
  contentDirty,
  compositionPending,
  appearanceError,
  sectionDesignSaving,
  sectionDesignError,
  onPanelModeChange,
  projectColors,
  onAddColor,
  onContentChange,
  onCustomizeComposition,
  onResetComposition,
  onAppearanceChange,
  onSectionDesignChange,
}: {
  eventId: string;
  templateKey: string;
  capabilities?: TemplateCapabilities;
  resolvedMedia: WebsiteDraft["media"];
  onMediaResolved: (media: WebsiteDraft["media"][string]) => void;
  selected: WebsiteSection | null;
  workingContent?: Record<string, unknown>;
  workingAppearance?: WebsiteSectionAppearance;
  targetViewport: ResponsiveViewport;
  selectedChild: SectionChildReference | null;
  panelMode: SectionPanelMode;
  showModeSwitch: boolean;
  appearanceDirty: boolean;
  contentDirty: boolean;
  compositionPending: boolean;
  appearanceError: string | null;
  sectionDesignSaving: boolean;
  sectionDesignError: string | null;
  onPanelModeChange: (mode: SectionPanelMode) => void;
  projectColors: ProjectColor[];
  onAddColor: (value: string) => Promise<ProjectColor>;
  onContentChange: (content: Record<string, unknown>) => void;
  onCustomizeComposition: () => void;
  onResetComposition: () => void;
  onAppearanceChange: (appearance: WebsiteSectionAppearance) => void;
  onSectionDesignChange: (defaults: SectionDesignDefaults) => void;
}) {
  if (!selected || !workingContent || !workingAppearance) return null;
  const capability = capabilities
    ? sectionCapability(capabilities, selected.type)
    : undefined;
  const compositionTarget =
    selected.type === "blank" || selected.type === "hero" || selected.type === "gallery"
      ? resolveEditorCompositionTarget(
          { ...selected, content: workingContent } as WebsiteSection,
          targetViewport,
        )
      : null;
  const childFlow = compositionTarget?.composition.childFlow;
  const authoringViewport = authoredPropertyViewport();
  const changeSharedFlow = (flow: SectionChildFlow) => {
    if (compositionTarget)
      onContentChange(
        replaceScopedComposition(workingContent, compositionTarget.scope, {
          childFlow: flow,
        }),
      );
  };
  const selectedElement =
    selectedChild?.kind === "element"
      ? findSectionElement(childFlow, selectedChild.id)
      : undefined;
  const selectedText =
    selectedElement?.type === "text" ? selectedElement : null;
  const selectedDate =
    selectedElement?.type === "date" ? selectedElement : null;
  const selectedAccordion =
    selectedElement?.type === "accordion" ? selectedElement : null;
  const selectedSchedule =
    selectedElement?.type === "schedule" ? selectedElement : null;
  const selectedPeople =
    selectedElement?.type === "people" ? selectedElement : null;
  const selectedGroup =
    selectedElement?.type === "compositionGroup" ? selectedElement : null;
  const selectedDivider =
    selectedElement?.type === "divider" ? selectedElement : null;
  const selectedMedia =
    selectedElement?.type === "media" ? selectedElement : null;
  const textCapability = capabilities
    ? templateElementCapability(capabilities, "text")
    : undefined;
  const textFontIds =
    textCapability?.appearance?.typography.find(({ role }) => role === "body")
      ?.allowedFontIds ?? [];
  const textColorIds =
    textCapability?.appearance?.colors.find(({ role }) => role === "textColor")
      ?.allowedColorIds ?? [];
  const selectedLeaf =
    selectedText ??
    selectedDate ??
    selectedAccordion ??
    selectedSchedule ??
    selectedPeople ??
    selectedDivider ??
    selectedMedia;
  const showBlockSpacingEditor =
    selectedLeaf && childFlow && (!selectedMedia || panelMode === "appearance");
  const blockSpacingEditor =
    showBlockSpacingEditor ? (
      <GenericBlockOuterSpacingEditor
        element={selectedLeaf}
        viewport={authoringViewport}
        onChange={(element) =>
          changeSharedFlow(updateSectionElement(childFlow, element))
        }
      />
    ) : null;
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      {compositionTarget && (
        <SectionCompositionControls
          viewport={targetViewport}
          source={
            compositionTarget.scope.kind === "custom" ? "custom" : "shared"
          }
          dirty={contentDirty}
          pending={compositionPending}
          onCustomize={onCustomizeComposition}
          onReset={onResetComposition}
        />
      )}
      <div className="hidden shrink-0 border-b border-border xl:mb-4 xl:block xl:px-0 xl:pb-3 xl:pt-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Heading className="xl:text-base!" level={2} variant="panel">
              {selectedText
                ? "Text"
                : selectedDate
                  ? "Date"
                  : selectedAccordion
                    ? "Accordion"
                    : selectedSchedule
                      ? "Schedule"
                      : selectedPeople
                        ? "People"
                        : selectedGroup
                          ? "Group"
                          : selectedDivider
                            ? "Divider"
                            : selectedMedia
                              ? "Media"
                              : (selected.editorName ?? selected.displayName)}
            </Heading>
            {!selected.isEnabled && (
              <span className="rounded-full bg-surface-muted px-2 py-1 text-[10px] text-foreground-muted">
                Hidden
              </span>
            )}
          </div>
          {showModeSwitch &&
            !selectedText &&
            !selectedDate &&
            !selectedAccordion &&
            !selectedSchedule &&
            !selectedPeople &&
            !selectedGroup &&
            !selectedDivider && (
              <SegmentedControl
                value={panelMode}
                options={[
                  { value: "content", label: "Content" },
                  { value: "appearance", label: "Appearance" },
                ]}
                label="Section editor mode"
                onChange={onPanelModeChange}
              />
            )}
        </div>
        <Text className="mt-2 xl:mt-1" variant="helper">
          {selectedText
            ? "Edit content directly on the canvas. Customize this element's appearance here."
            : selectedGroup
              ? "Arrange this Group's children and responsive layout."
              : panelMode === "content"
                ? "Edit semantic content."
                : "Customize this Section's presentation."}
        </Text>
      </div>
      {selectedAccordion && childFlow ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-6 xl:px-0">
          {blockSpacingEditor}
          <AccordionElementEditor
            element={selectedAccordion}
            onChange={(element) =>
              changeSharedFlow(updateSectionElement(childFlow, element))
            }
          />
        </div>
      ) : selectedSchedule && childFlow ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-6 xl:px-0">
          {blockSpacingEditor}
          <ScheduleElementEditor
            element={selectedSchedule}
            onChange={(element) =>
              changeSharedFlow(updateSectionElement(childFlow, element))
            }
          />
        </div>
      ) : selectedPeople && childFlow ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-6 xl:px-0">
          {blockSpacingEditor}
          <PeopleEditor
            section={selected}
            content={selectedPeople}
            resolvedMedia={resolvedMedia}
            onMediaResolved={onMediaResolved}
            hideHeading
            itemMediaEnabled
            onChange={(element) =>
              changeSharedFlow(
                updateSectionElement(
                  childFlow,
                  element as typeof selectedPeople,
                ),
              )
            }
          />
        </div>
      ) : selectedDate && childFlow && capabilities ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-6 xl:px-0">
          {blockSpacingEditor}
          <ColorPreviewScopeContext key={selected.id} value={selected.id}>
            <DateElementEditor
              element={selectedDate}
              viewport={authoringViewport}
              templateKey={templateKey}
              library={capabilities.designLibrary}
              allowedFontIds={textFontIds}
              allowedColorIds={textColorIds}
              projectColors={projectColors}
              context={selected.resolvedDesignContext}
              onAddColor={onAddColor}
              onChange={(element) =>
                changeSharedFlow(updateSectionElement(childFlow, element))
              }
            />
          </ColorPreviewScopeContext>
        </div>
      ) : selectedText && childFlow && capabilities ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-6 xl:px-0">
          {blockSpacingEditor}
          <ColorPreviewScopeContext key={selected.id} value={selected.id}>
            <TextElementEditor
              element={selectedText}
              viewport={authoringViewport}
              library={capabilities.designLibrary}
              allowedFontIds={textFontIds}
              allowedColorIds={textColorIds}
              projectColors={projectColors}
              context={selected.resolvedDesignContext}
              onAddColor={onAddColor}
              onAppearanceChange={(appearance) => {
                const next = updateSectionTextAppearance(
                  childFlow,
                  selectedText.id,
                  appearance,
                );
                if (next) changeSharedFlow(next);
              }}
            />
          </ColorPreviewScopeContext>
        </div>
      ) : selectedDivider && childFlow && capabilities ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-6 xl:px-0">
          {blockSpacingEditor}
          <ColorPreviewScopeContext key={selected.id} value={selected.id}>
            <DividerElementEditor
              context={selected.resolvedDesignContext}
              element={selectedDivider}
              templateKey={templateKey}
              library={capabilities.designLibrary}
              allowedColorIds={textColorIds}
              projectColors={projectColors}
              onAddColor={onAddColor}
              onChange={(element) =>
                changeSharedFlow(updateSectionElement(childFlow, element))
              }
            />
          </ColorPreviewScopeContext>
        </div>
      ) : selectedMedia && childFlow ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-6 xl:px-0">
          {blockSpacingEditor}
          <MediaElementEditor
            element={selectedMedia}
            eventId={eventId}
            viewport={authoringViewport}
            mode={panelMode}
            resolvedMedia={resolvedMedia}
            onMediaResolved={onMediaResolved}
            onChange={(element) =>
              changeSharedFlow(updateSectionElement(childFlow, element))
            }
          />
        </div>
      ) : selectedGroup && childFlow ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-6 xl:px-0">
          <ColorPreviewScopeContext key={selected.id} value={selected.id}>
            <GroupElementEditor
              group={selectedGroup}
              viewport={authoringViewport}
              resolvedMedia={resolvedMedia}
              onMediaResolved={onMediaResolved}
              templateKey={templateKey}
              capability={capability?.decorativeAppearance ?? undefined}
              library={capabilities?.designLibrary}
              projectColors={projectColors}
              onAddColor={onAddColor}
              onChange={(group) =>
                changeSharedFlow(updateSectionElement(childFlow, group))
              }
              onUngroup={() => {
                const next = ungroupSectionElement(childFlow, selectedGroup.id);
                changeSharedFlow(next);
              }}
            />
          </ColorPreviewScopeContext>
        </div>
      ) : panelMode === "content" ? (
        <div className="min-h-0 flex-1">
          <SectionEditor
            viewport={authoringViewport}
            section={selected}
            content={workingContent}
            onChange={onContentChange}
            appearance={workingAppearance}
            onAppearanceChange={onAppearanceChange}
            resolvedMedia={resolvedMedia}
            onMediaResolved={onMediaResolved}
          />
        </div>
      ) : capability ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-6 xl:px-0">
            <>
              <ColorPreviewScopeContext key={selected.id} value={selected.id}>
              <AppearancePanel
                appearance={workingAppearance}
                templateKey={templateKey}
                sectionCapability={capability}
                targetViewport={selected.type === "gallery" ? targetViewport : authoringViewport}
                error={appearanceError}
                library={capabilities!.designLibrary}
                projectColors={projectColors}
                onAddColor={onAddColor}
                onChange={onAppearanceChange}
              />
              </ColorPreviewScopeContext>
              {selected.type !== "blank" && (
                <SectionDesignDefaultsPanel
                  appearance={workingAppearance}
                  capability={capability}
                  defaults={selected.designDefaults}
                  resolved={selected.resolvedDesignContext}
                  library={capabilities!.designLibrary}
                  saving={sectionDesignSaving}
                  disabled={appearanceDirty}
                  error={sectionDesignError}
                  onChange={onSectionDesignChange}
                />
              )}
            </>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-1 xl:px-0">
          <p className="rounded-xl bg-surface-muted p-4 text-sm text-foreground-muted">
            This Template does not support appearance controls for this Section.
          </p>
        </div>
      )}
    </section>
  );
}

function EditorLoading({ eventId }: { eventId: string }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
        <Link
          className="flex items-center gap-2 text-sm text-foreground-muted"
          to={`/events/${eventId}`}
        >
          <ArrowLeft size={16} /> Back to Event
        </Link>
        <div className="h-8 w-52 animate-pulse rounded-lg bg-surface-muted" />
      </div>
      <div
        className="grid min-h-0 flex-1 animate-pulse xl:grid-cols-[var(--desktop-editor-grid-columns)]"
        style={desktopEditorGridStyle}
      >
        <div className="hidden border-r border-border bg-surface-muted xl:block" />
        <div className="m-3 rounded-xl bg-surface-muted" />
        <div className="hidden border-l border-border bg-surface-muted xl:block" />
      </div>
    </div>
  );
}
function EditorError({
  eventId,
  message,
  retry,
}: {
  eventId: string;
  message: string;
  retry: () => void;
}) {
  return (
    <div className="grid h-full place-items-center p-6">
      <div className="max-w-md rounded-2xl border border-border bg-surface p-6 text-center">
        <FileWarning className="mx-auto text-danger" />
        <h1 className="mt-3 font-semibold">
          Unable to load the Website builder
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">{message}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Link
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm"
            to={`/events/${eventId}`}
          >
            <ArrowLeft size={15} /> Back to Event
          </Link>
          <button
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm text-accent-foreground"
            type="button"
            onClick={retry}
          >
            <RefreshCw size={15} /> Retry
          </button>
        </div>
      </div>
    </div>
  );
}
function GenericBlockOuterSpacingEditor({
  element,
  viewport,
  onChange,
}: {
  element: Exclude<WebsiteElement, { type: "compositionGroup" }>;
  viewport: ResponsiveViewport;
  onChange: (element: WebsiteElement) => void;
}) {
  const appearance = (
    "appearance" in element ? element.appearance : undefined
  ) as
    | {
        outerSpacing?: FourSidedSpacing;
        responsive?: Partial<
          Record<"tablet" | "mobile", { outerSpacing?: FourSidedSpacing }>
        >;
      }
    | undefined;
  const effective = resolveFourSidedSpacing(
    appearance?.outerSpacing,
    viewport === "desktop"
      ? undefined
      : appearance?.responsive?.[viewport]?.outerSpacing,
  );
  const update = (
    changes: Partial<Record<keyof FourSidedSpacing, SpacingPreset>>,
  ) => {
    const next = structuredClone(element) as WebsiteElement & {
      appearance?: typeof appearance;
    };
    const nextAppearance = { ...appearance };
    for (const [sideKey, value] of Object.entries(changes)) {
      const side = sideKey as keyof FourSidedSpacing;
      if (viewport === "desktop") {
        const outerSpacing = { ...nextAppearance.outerSpacing };
        if (value === "none") delete outerSpacing[side];
        else outerSpacing[side] = value;
        if (Object.keys(outerSpacing).length)
          nextAppearance.outerSpacing = outerSpacing;
        else delete nextAppearance.outerSpacing;
      } else {
        const responsive = { ...nextAppearance.responsive };
        const branch = { ...responsive[viewport] };
        const outerSpacing = { ...branch.outerSpacing };
        if (value === (nextAppearance.outerSpacing?.[side] ?? "none"))
          delete outerSpacing[side];
        else outerSpacing[side] = value;
        if (Object.keys(outerSpacing).length)
          branch.outerSpacing = outerSpacing;
        else delete branch.outerSpacing;
        if (Object.keys(branch).length) responsive[viewport] = branch;
        else delete responsive[viewport];
        if (Object.keys(responsive).length)
          nextAppearance.responsive = responsive;
        else delete nextAppearance.responsive;
      }
    }
    if (Object.keys(nextAppearance).length) next.appearance = nextAppearance;
    else delete next.appearance;
    onChange(next);
  };
  return (
    <div className="border-b border-border px-1 pb-5">
      <p className="mb-2 text-sm xl:text-xs! font-semibold">Outer spacing</p>
      <FourSidedSpacingControl
        spacing={effective}
        kind="Outer"
        onChange={update}
      />
    </div>
  );
}

function EmptyEditor() {
  return (
    <div className="grid min-h-0 flex-1 place-items-center p-6">
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        <FileWarning className="mx-auto text-secondary-accent" />
        <h2 className="mt-3 font-semibold">No Website sections found</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          The draft exists, but it does not currently contain editable sections.
        </p>
      </div>
    </div>
  );
}
