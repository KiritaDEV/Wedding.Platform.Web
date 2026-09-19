import { DndContext, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS as DndCSS } from "@dnd-kit/utilities";
import { Copy, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Dialog, DialogFooter, DialogHeader } from "../../../components/ui/Dialog";
import type { MediaAsset } from "../../media/types";
import { ZoomedMediaImage } from "../../websiteRenderer/ZoomedMediaImage";
import { resolveGalleryGridAppearance } from "../../websiteRenderer/galleryGridAppearance";
import type { GalleryItem, ResolvedWebsiteMedia, ResponsiveViewport, WebsiteSectionAppearance } from "../types";
import { addGalleryImages, duplicateGalleryItem, frameGalleryItem, removeGalleryItem, reorderGalleryItem, replaceGalleryImage } from "../gallery";
import { FocalPointEditor } from "./FocalPointEditor";
import { MediaPickerDialog } from "./MediaPickerDialog";
import { resetImageFraming } from "./resetImageFraming";
import { SortableDragHandle } from "./SortableDragHandle";
import { StructureActionMenu, StructureMenuAction } from "./StructureActionMenu";

type EditorOrigin = "toolbar" | string;

export function GalleryCollectionEditor({ sectionId, eventId, items, resolvedMedia, onMediaResolved, onChange, appearance, viewport = "desktop" }: {
  appearance?: WebsiteSectionAppearance;
  viewport?: ResponsiveViewport;
  sectionId: string;
  eventId: string;
  items: GalleryItem[];
  resolvedMedia: Record<string, ResolvedWebsiteMedia>;
  onMediaResolved: (media: ResolvedWebsiteMedia) => void;
  onChange: (items: GalleryItem[]) => void;
}) {
  const [picker, setPicker] = useState<{ replaceId?: string; session: number } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const activeIndex = useRef(0);
  const editorOrigin = useRef<EditorOrigin>("toolbar");
  const pendingEditorFocus = useRef<EditorOrigin | null>(null);
  const pendingControlFocus = useRef<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const session = useRef(0);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
  );
  const frameRatio = resolveGalleryGridAppearance(appearance ?? {} as WebsiteSectionAppearance, viewport).aspectRatio;

  useEffect(() => () => { session.current += 1; }, []);
  useEffect(() => {
    const index = items.findIndex(({ id }) => id === activeItemId);
    if (index >= 0) activeIndex.current = index;
  }, [activeItemId, items]);
  useEffect(() => {
    const selector = pendingControlFocus.current;
    if (!selector) return;
    requestAnimationFrame(() => {
      const control = root.current?.querySelector<HTMLElement>(selector);
      if (!control) return;
      pendingControlFocus.current = null;
      control.focus();
    });
  }, [items]);
  const restoreEditorFocus = () => {
    if (pendingEditorFocus.current === null) return;
    const origin = pendingEditorFocus.current;
    pendingEditorFocus.current = null;
    window.setTimeout(() => {
      const selector = origin === "toolbar" ? "[data-gallery-edit]" : `[data-gallery-tile="${CSS.escape(origin)}"]`;
      (root.current?.querySelector<HTMLElement>(selector) ?? root.current?.querySelector<HTMLElement>("[data-gallery-add]"))?.focus();
    }, 0);
  };
  useEffect(() => {
    if (editorOpen || pendingEditorFocus.current === null) return;
    const origin = pendingEditorFocus.current;
    pendingEditorFocus.current = null;
    const timeout = window.setTimeout(() => {
      const selector = origin === "toolbar" ? "[data-gallery-edit]" : `[data-gallery-tile="${CSS.escape(origin)}"]`;
      (root.current?.querySelector<HTMLElement>(selector) ?? root.current?.querySelector<HTMLElement>("[data-gallery-add]"))?.focus();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [editorOpen]);
  useEffect(() => {
    if (!editorOpen) return;
    if (activeItemId && items.some(({ id }) => id === activeItemId)) return;
    if (items.length > 0) {
      setActiveItemId(items[Math.min(activeIndex.current, items.length - 1)].id);
      return;
    }
    setEditorOpen(false);
    setActiveItemId(null);
    requestAnimationFrame(() => root.current?.querySelector<HTMLElement>("[data-gallery-add]")?.focus());
  }, [activeItemId, editorOpen, items]);

  const focusControl = (selector: string) => {
    pendingControlFocus.current = selector;
    requestAnimationFrame(() => {
      const control = root.current?.querySelector<HTMLElement>(selector);
      if (!control) return;
      pendingControlFocus.current = null;
      control.focus();
    });
  };
  const commit = (next: GalleryItem[], message: string) => {
    if (next === items) return false;
    onChange(next);
    setAnnouncement(message);
    return true;
  };
  const resolve = (asset: MediaAsset) => onMediaResolved({ id: asset.id, originalFilename: asset.originalFilename, width: asset.width, height: asset.height, web: asset.variants.web });
  const appendAssets = (assets: MediaAsset[], pickerSession: number) => {
    if (session.current !== pickerSession || assets.length === 0) return;
    const available = Math.max(0, 24 - items.length);
    const accepted = assets.slice(0, available);
    accepted.forEach(resolve);
    const next = addGalleryImages(items, accepted.map(({ id }) => id));
    if (next !== items) {
      const added = next.length - items.length;
      commit(next, added === 1 ? "Image added." : `${added} images added.`);
      focusControl(`[data-gallery-tile="${CSS.escape(next[next.length - 1].id)}"]`);
    }
    if (assets.length > available) setAnnouncement(`Gallery reached its 24-image limit. ${available} of ${assets.length} images were added.`);
  };
  const invalidateSession = () => { session.current += 1; };
  const openPicker = (replaceId?: string) => {
    const nextSession = session.current + 1;
    session.current = nextSession;
    setPicker({ replaceId, session: nextSession });
  };
  const openEditor = (itemId?: string, origin: EditorOrigin = "toolbar") => {
    const nextId = itemId && items.some(({ id }) => id === itemId) ? itemId : activeItemId && items.some(({ id }) => id === activeItemId) ? activeItemId : items[0]?.id;
    if (!nextId) return;
    editorOrigin.current = origin;
    setActiveItemId(nextId);
    setEditorOpen(true);
  };
  const closeEditor = () => {
    pendingEditorFocus.current = editorOrigin.current;
    setEditorOpen(false);
  };
  const dragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex(({ id }) => id === active.id);
    const to = items.findIndex(({ id }) => id === over.id);
    if (from < 0 || to < 0) return;
    if (commit(reorderGalleryItem(items, from, to), `Image moved to position ${to + 1}.`)) focusControl(`[data-gallery-drag="${CSS.escape(String(active.id))}"]`);
  };

  return <div ref={root} className="w-full min-w-0 max-w-full space-y-4" data-gallery-collection-editor>
    <p className="text-xs text-foreground-muted">Up to 24 images. Surrounding content is managed in Structure.</p>
    <div className="flex flex-wrap gap-2">
      <Button data-gallery-add={sectionId} type="button" disabled={items.length >= 24} onClick={() => openPicker()}>Add images</Button>
      {items.length > 0 && <Button data-gallery-edit type="button" variant="secondary" onClick={() => openEditor()}>Edit images</Button>}
    </div>
    <p role="status" aria-live="polite" className="sr-only">{announcement}</p>
    {items.length > 0 && <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
      <SortableContext items={items.map(({ id }) => id)} strategy={rectSortingStrategy}>
        <div className="grid w-full min-w-0 max-w-full grid-cols-[repeat(2,minmax(0,1fr))] gap-2.5" data-gallery-thumbnail-grid>
          {items.map((item, index) => <GalleryThumbnailItem key={item.id} item={item} index={index} asset={resolvedMedia[item.mediaId]} full={items.length >= 24}
            onEdit={() => openEditor(item.id, item.id)}
            onReplace={() => openPicker(item.id)}
            onDuplicate={() => {
              const next = duplicateGalleryItem(items, item.id);
              if (commit(next, "Image duplicated.")) {
                const duplicate = next[index + 1];
                focusControl(`[data-gallery-tile="${CSS.escape(duplicate.id)}"]`);
                requestAnimationFrame(() => root.current?.querySelector<HTMLElement>(`[data-gallery-tile="${CSS.escape(duplicate.id)}"]`)?.scrollIntoView({ block: "nearest" }));
              }
            }}
            onDelete={() => {
              const next = removeGalleryItem(items, item.id);
              if (!commit(next, "Image deleted. Media asset retained.")) return;
              const fallback = next[index]?.id ?? next[index - 1]?.id;
              focusControl(fallback ? `[data-gallery-tile="${CSS.escape(fallback)}"]` : "[data-gallery-add]");
            }} />)}
        </div>
      </SortableContext>
    </DndContext>}
    <GalleryImageEditorDialog open={editorOpen} sectionId={sectionId} items={items} activeItemId={activeItemId} media={resolvedMedia} frameRatio={frameRatio} onActiveChange={setActiveItemId} onClose={closeEditor} onAfterClose={restoreEditorFocus}
      onFramingChange={(id, point, zoom) => commit(frameGalleryItem(items, id, point, zoom), "Image framing updated.")} />
    {picker && <MediaPickerDialog open eventId={eventId} selectionMode={picker.replaceId ? "single" : "multiple"} maxSelection={Math.max(0, 24 - items.length)} selectedAssetId={items.find(item => item.id === picker.replaceId)?.mediaId} onClose={() => { invalidateSession(); setPicker(null); }} onUploadComplete={assets => appendAssets(assets, picker.session)} onSelectMultiple={assets => {
      appendAssets(assets, picker.session);
      invalidateSession();
      setPicker(null);
    }} onSelect={asset => {
      if (session.current !== picker.session) return;
      if (picker.replaceId) {
        resolve(asset);
        commit(replaceGalleryImage(items, picker.replaceId, asset.id), "Image replaced.");
        focusControl(`[data-gallery-tile="${CSS.escape(picker.replaceId)}"]`);
      }
      invalidateSession();
      setPicker(null);
    }} />}
  </div>;
}

function GalleryThumbnailItem({ item, index, asset, full, onEdit, onReplace, onDuplicate, onDelete }: {
  item: GalleryItem; index: number; asset?: ResolvedWebsiteMedia; full: boolean;
  onEdit: () => void; onReplace: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return <div ref={setNodeRef} style={{ transform: DndCSS.Transform.toString(transform), transition }} className={`group relative aspect-square w-full min-w-0 max-w-full ${isDragging ? "z-20 opacity-70 shadow-lg" : ""}`} data-gallery-thumbnail-item={item.id}>
    <button type="button" className="absolute inset-0 block h-full w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-border bg-surface-muted text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" data-gallery-tile={item.id} aria-label={`Edit image ${index + 1}`} onClick={onEdit}>
      {asset ? <ZoomedMediaImage className="h-full w-full" src={asset.web.url} width={asset.web.width} height={asset.web.height} reference={item} alt="" /> : <span className="grid h-full place-items-center p-3 text-center text-xs text-foreground-muted">Media unavailable</span>}
    </button>
    <div className="absolute left-1 top-1" onClick={event => event.stopPropagation()}>
      <SortableDragHandle label={`Drag image ${index + 1} to reorder`} className="size-11 bg-surface/90 text-foreground shadow-sm hover:bg-surface" data-gallery-drag={item.id} {...attributes} {...listeners} />
    </div>
    <div className="absolute right-1 top-1" onClick={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()}>
      <StructureActionMenu align={index % 2 === 0 ? "left" : "right"} triggerClassName="size-11 bg-surface/90 text-foreground shadow-sm" label={`Image ${index + 1} actions`}>
        <StructureMenuAction icon={<RefreshCw size={14} />} onClick={onReplace}>Replace</StructureMenuAction>
        <StructureMenuAction icon={<Copy size={14} />} disabled={full} onClick={onDuplicate}>Duplicate</StructureMenuAction>
        <StructureMenuAction icon={<Trash2 size={14} />} danger onClick={onDelete}>Delete</StructureMenuAction>
      </StructureActionMenu>
    </div>
  </div>;
}

function GalleryImageEditorDialog({ open, sectionId, items, activeItemId, media, frameRatio, onActiveChange, onClose, onAfterClose, onFramingChange }: {
  open: boolean; sectionId: string; items: GalleryItem[]; activeItemId: string | null; media: Record<string, ResolvedWebsiteMedia>; frameRatio: string;
  onActiveChange: (id: string) => void; onClose: () => void; onAfterClose: () => void; onFramingChange: (id: string, point?: { x: number; y: number }, zoom?: number) => void;
}) {
  const index = items.findIndex(({ id }) => id === activeItemId);
  const active = index >= 0 ? items[index] : undefined;
  const asset = active ? media[active.mediaId] : undefined;
  if (!active) return null;
  const [frameWidth = 1, frameHeight = 1] = frameRatio.split("/").map(Number);
  const frameRatioNumber = Number.isFinite(frameWidth / frameHeight) ? frameWidth / frameHeight : 1;
  const widePreviewStyle = {
    "--gallery-preview-height": "max(18rem, min(55dvh, 544px))",
    "--gallery-preview-width": `min(100%, max(${18 * frameRatioNumber}rem, min(${55 * frameRatioNumber}dvh, ${544 * frameRatioNumber}px)))`,
  } as React.CSSProperties;
  return <Dialog open={open} onClose={onClose} onAfterClose={onAfterClose} titleId="gallery-image-editor-title" descriptionId="gallery-image-editor-description" size="xl" mobileFullScreen contained className="overflow-hidden xl:max-w-[1200px]!">
    <div className="flex h-[min(760px,calc(90dvh-2px))] min-h-0 flex-col max-sm:h-dvh max-sm:max-h-dvh">
      <DialogHeader className="shrink-0 border-b border-border bg-surface px-4 py-3 sm:px-5" title="Edit images" titleId="gallery-image-editor-title" description="Adjust image framing. Gallery appearance stays in Appearance." descriptionId="gallery-image-editor-description" onClose={onClose} />
      <div className="grid min-h-0 min-w-0 flex-1 md:grid-cols-[132px_minmax(0,1fr)] xl:grid-cols-[132px_minmax(0,1fr)_18rem]" data-gallery-editor-body>
        <nav className="hidden min-h-0 overflow-y-auto border-r border-border bg-surface-muted/40 p-3 md:block" aria-label="Gallery images">
          <p className="mb-3 text-center text-xs tabular-nums text-foreground-muted">Image {index + 1} of {items.length}</p>
          <div className="space-y-2">{items.map((item, itemIndex) => <GalleryNavigatorThumbnail key={item.id} item={item} index={itemIndex} asset={media[item.mediaId]} active={item.id === active.id} onClick={() => onActiveChange(item.id)} />)}</div>
        </nav>
        <div className="min-h-0 min-w-0 overflow-y-auto overscroll-contain px-4 py-4 pb-8 sm:px-6 xl:col-span-2 xl:pb-2 xl:pt-2" data-gallery-editor-scroll-body>
          <div className="mx-auto flex min-w-0 max-w-5xl flex-col gap-6 xl:grid! xl:max-w-none xl:grid-cols-[minmax(0,1fr)_18rem] xl:content-start xl:gap-x-4 xl:gap-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1 md:hidden" aria-label="Gallery images">{items.map((item, itemIndex) => <GalleryNavigatorThumbnail key={item.id} item={item} index={itemIndex} asset={media[item.mediaId]} active={item.id === active.id} compact onClick={() => onActiveChange(item.id)} />)}</div>
            {asset ? <FocalPointEditor className="contents" helpText="Click or drag to set focal point." helpClassName="order-2 mb-0 xl:hidden" previewClassName="order-1 xl:order-none xl:col-start-1 xl:row-start-1 xl:mx-auto xl:h-auto xl:max-h-[var(--gallery-preview-height)] xl:w-[var(--gallery-preview-width)]! xl:max-w-full xl:self-start" previewStyle={widePreviewStyle} controlsClassName="order-3 mt-0 xl:order-none xl:col-start-2 xl:row-start-1 xl:self-start" controlButtonClassName="size-9 border border-border bg-surface-muted hover:bg-surface" controlsHeading={<><h3 className="text-base font-semibold">Framing</h3><p className="mt-1 hidden text-xs text-foreground-muted xl:block">Click or drag on the image to set its focal point.</p></>} controlsFooter={<><p className="text-xs text-foreground-muted">1× fills the frame. Increase to zoom in.</p><Button className="mt-3" type="button" size="sm" variant="secondary" onClick={() => { const { point, zoom } = resetImageFraming(); onFramingChange(active.id, point, zoom); }}>Reset framing</Button></>} url={asset.web.url} point={active.focalPoint ?? { x: .5, y: .5 }} zoom={active.zoom ?? 1} sourceWidth={asset.web.width} sourceHeight={asset.web.height} previewAspectRatio={frameRatio} controlId={`${sectionId}-${active.id}`} fit="cover" showReset={false} onPointChange={point => onFramingChange(active.id, point)} onZoomChange={zoom => onFramingChange(active.id, undefined, zoom)} onChange={({ point, zoom }) => onFramingChange(active.id, point, zoom)} /> : <div className="order-1 grid aspect-square place-items-center rounded-lg bg-surface-muted text-sm text-foreground-muted xl:order-none xl:col-start-1 xl:row-start-1">Media unavailable</div>}
          </div>
        </div>
      </div>
      <DialogFooter className="shrink-0 items-center justify-between border-t border-border bg-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 md:justify-end">
        <span className="text-sm tabular-nums text-foreground-muted md:hidden">Image {index + 1} of {items.length}</span>
        <div className="flex items-center gap-2">
          <Button className="min-h-11 sm:hidden" type="button" size="sm" variant="secondary" disabled={index === 0} onClick={() => onActiveChange(items[index - 1].id)}>Previous</Button>
          <Button className="min-h-11 sm:hidden" type="button" size="sm" variant="secondary" disabled={index === items.length - 1} onClick={() => onActiveChange(items[index + 1].id)}>Next</Button>
          <Button type="button" onClick={onClose}>Done</Button>
        </div>
      </DialogFooter>
    </div>
  </Dialog>;
}

function GalleryNavigatorThumbnail({ item, index, asset, active, compact = false, onClick }: { item: GalleryItem; index: number; asset?: ResolvedWebsiteMedia; active: boolean; compact?: boolean; onClick: () => void }) {
  return <button type="button" className={`${compact ? "w-20 shrink-0" : "w-full"} overflow-hidden rounded-md border-2 ${active ? "border-accent" : "border-transparent hover:border-border"}`} aria-label={`Edit image ${index + 1}`} aria-current={active ? "true" : undefined} onClick={onClick}>
    <span className="block aspect-square overflow-hidden bg-surface-muted">{asset ? <ZoomedMediaImage className="h-full w-full" src={asset.web.url} width={asset.web.width} height={asset.web.height} reference={item} alt="" /> : <span className="grid h-full place-items-center text-[10px] text-foreground-muted">Unavailable</span>}</span>
  </button>;
}
