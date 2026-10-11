import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { Switch } from "../../../components/ui/Switch";
import type { MediaAsset } from "../../media/types";
import {
  carouselIntervalMilliseconds,
  carouselIntervalSeconds,
  directVideoUrlIssue,
  replaceMediaImageSource,
  resolveMediaPresentation,
  setMediaImageDecorative,
  setMediaImageFraming,
  setMediaItems,
  setMediaPresentationProperty,
} from "../../websiteElements/media";
import type { MediaElement } from "../../websiteElements/types";
import { createSemanticId } from "../createSemanticId";
import type { ResponsiveViewport, ResolvedWebsiteMedia } from "../types";
import { FocalPointEditor } from "./FocalPointEditor";
import { InspectorField, InspectorSection } from "./InspectorPrimitives";
import { MediaPickerDialog } from "./MediaPickerDialog";

const choices = (values: readonly string[]) =>
  values.map((value) => ({
    value,
    label: value
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (letter) => letter.toUpperCase()),
  }));
const updateAppearance = (
  element: MediaElement,
  key: keyof NonNullable<MediaElement["appearance"]>,
  value: string,
): MediaElement => ({
  ...element,
  appearance: { ...element.appearance, [key]: value },
});

export function MediaElementEditor({
  element,
  eventId,
  viewport,
  mode,
  resolvedMedia,
  onMediaResolved,
  onChange,
}: {
  element: MediaElement;
  eventId: string;
  viewport: ResponsiveViewport;
  mode: "content" | "appearance";
  resolvedMedia: Record<string, ResolvedWebsiteMedia>;
  onMediaResolved: (media: ResolvedWebsiteMedia) => void;
  onChange: (element: MediaElement) => void;
}) {
  const [picker, setPicker] = useState<{ open: boolean; replaceId?: string }>({
    open: false,
  });
  const selectedPickerItem = element.items.find(
    (item) => item.id === picker.replaceId && item.type === "image",
  );
  const effectivePresentation = resolveMediaPresentation(element, viewport);
  const updateItem = (id: string, update: Record<string, unknown>) =>
    onChange({
      ...element,
      items: element.items.map((item) =>
        item.id === id ? ({ ...item, ...update } as typeof item) : item,
      ),
    });
  const chooseImage = (asset: MediaAsset) => {
    onMediaResolved({
      id: asset.id,
      originalFilename: asset.originalFilename,
      width: asset.width,
      height: asset.height,
      web: asset.variants.web,
    });
    const alt = asset.originalFilename.replace(/\.[^.]+$/, "");
    if (picker.replaceId)
      onChange(
        replaceMediaImageSource(element, picker.replaceId, asset.id, alt),
      );
    else
      onChange(
        setMediaItems(element, [
          ...element.items,
          {
            id: createSemanticId("media-item"),
            type: "image",
            mediaId: asset.id,
            alt,
          },
        ]),
      );
    setPicker({ open: false });
  };
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= element.items.length) return;
    const items = [...element.items];
    [items[index], items[target]] = [items[target], items[index]];
    onChange({ ...element, items });
  };

  if (mode === "content")
    return (
      <div
        className="space-y-5 pt-5"
        data-media-element-editor
        data-media-editor-mode="content"
      >
        <InspectorSection
          title="Media content"
          description="Add one video or up to eight images."
        >
          {element.items.every(({ type }) => type === "image") && (
            <Button
              type="button"
              size="sm"
              disabled={element.items.length >= 8}
              onClick={() => setPicker({ open: true })}
            >
              <Plus size={14} /> Add image
            </Button>
          )}
          {element.items.length === 0 && (
            <AddVideo
              onAdd={(url) =>
                onChange({
                  ...element,
                  items: [
                    {
                      id: createSemanticId("media-item"),
                      type: "video",
                      url,
                      controls: true,
                    },
                  ],
                })
              }
            />
          )}
          <div className="space-y-3">
            {element.items.map((item, index) => (
              <div
                key={item.id}
                className="rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-1">
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                    {item.type === "image" ? "Image" : "Video"} {index + 1}
                  </span>
                  {element.items.length > 1 && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Move ${item.type} ${index + 1} up`}
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp size={13} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Move ${item.type} ${index + 1} down`}
                        disabled={index === element.items.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown size={13} />
                      </Button>
                    </>
                  )}
                  {item.type === "image" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Duplicate image ${index + 1}`}
                      disabled={element.items.length >= 8}
                      onClick={() => {
                        const items = [...element.items];
                        items.splice(index + 1, 0, {
                          ...item,
                          id: createSemanticId("media-item"),
                        });
                        onChange(setMediaItems(element, items));
                      }}
                    >
                      <Copy size={13} />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove ${item.type} ${index + 1}`}
                    onClick={() =>
                      onChange(
                        setMediaItems(
                          element,
                          element.items.filter(({ id }) => id !== item.id),
                        ),
                      )
                    }
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
                {item.type === "image" ? (
                  <ImageItemEditor
                    key={`${item.id}:${item.mediaId}`}
                    item={item}
                    controlId={`${element.id}-${item.id}`}
                    asset={resolvedMedia[item.mediaId]}
                    aspectRatio={effectivePresentation.aspectRatio}
                    fit={effectivePresentation.fit}
                    onChange={(update) => updateItem(item.id, update)}
                    onDecorativeChange={(decorative, meaningfulAlt) =>
                      onChange(
                        setMediaImageDecorative(
                          element,
                          item.id,
                          decorative,
                          meaningfulAlt,
                        ),
                      )
                    }
                    onFramingChange={(point, zoom) =>
                      onChange(
                        setMediaImageFraming(element, item.id, point, zoom),
                      )
                    }
                    onReplace={() =>
                      setPicker({ open: true, replaceId: item.id })
                    }
                  />
                ) : (
                  <VideoItemEditor
                    item={item}
                    onChange={(update) => updateItem(item.id, update)}
                  />
                )}
              </div>
            ))}
          </div>
        </InspectorSection>
        <MediaPickerDialog
          open={picker.open}
          eventId={eventId}
          selectedAssetId={
            selectedPickerItem?.type === "image"
              ? selectedPickerItem.mediaId
              : undefined
          }
          onClose={() => setPicker({ open: false })}
          onSelect={chooseImage}
        />
      </div>
    );

  const presentation = element.presentation ?? {};
  const responsive =
    viewport === "desktop" ? undefined : presentation.responsive?.[viewport];
  const effectiveMode =
    responsive?.mode ??
    presentation.mode ??
    (element.items.length > 1 ? "carousel" : "single");
  const set = (
    key: "mode" | "width" | "aspectRatio" | "alignment" | "fit" | "carousel",
    value: unknown,
  ) => onChange(setMediaPresentationProperty(element, viewport, key, value));
  const carousel = presentation.carousel ?? {};
  return (
    <div
      className="space-y-5 pt-5"
      data-media-element-editor
      data-media-editor-mode="appearance"
    >
      <InspectorSection title="Presentation">
        {element.items.length > 0 && (
          <Field
            label="Layout"
            value={effectiveMode}
            values={element.items.length > 1 ? ["carousel"] : ["single"]}
            onChange={(value) => set("mode", value)}
          />
        )}
        <Field
          label="Width"
          value={responsive?.width ?? presentation.width ?? "full"}
          values={["small", "medium", "large", "full"]}
          onChange={(value) => set("width", value)}
        />
        <Field
          label="Alignment"
          value={presentation.alignment ?? "center"}
          values={["start", "center", "end"]}
          onChange={(value) => set("alignment", value)}
        />
        <Field
          label="Aspect ratio"
          value={
            responsive?.aspectRatio ?? presentation.aspectRatio ?? "natural"
          }
          values={["natural", "square", "portrait", "landscape", "wide"]}
          onChange={(value) => set("aspectRatio", value)}
        />
        <Field
          label="Fit"
          value={presentation.fit ?? "cover"}
          values={["cover", "contain"]}
          onChange={(value) => set("fit", value)}
        />
      </InspectorSection>
      <InspectorSection title="Appearance">
        <Field
          label="Corners"
          value={element.appearance?.corners ?? "square"}
          values={["square", "soft", "rounded", "pill"]}
          onChange={(value) =>
            onChange(updateAppearance(element, "corners", value))
          }
        />
        <Field
          label="Frame"
          value={element.appearance?.frame ?? "none"}
          values={["none", "line", "mat"]}
          onChange={(value) =>
            onChange(updateAppearance(element, "frame", value))
          }
        />
        <Field
          label="Shadow"
          value={element.appearance?.shadow ?? "none"}
          values={["none", "soft", "medium", "strong"]}
          onChange={(value) =>
            onChange(updateAppearance(element, "shadow", value))
          }
        />
      </InspectorSection>
      {effectiveMode === "carousel" &&
        element.items.length >= 2 &&
        element.items.every(({ type }) => type === "image") && (
          <InspectorSection title="Carousel">
            <CarouselSwitch
              label="Autoplay"
              checked={carousel.autoplay ?? false}
              onCheckedChange={(autoplay) =>
                set("carousel", { ...carousel, autoplay })
              }
            />
            <CarouselIntervalInput
              key={carousel.interval ?? "default"}
              intervalMs={carousel.interval}
              disabled={!(carousel.autoplay ?? false)}
              onChange={(interval) =>
                set("carousel", { ...carousel, interval })
              }
            />
            <CarouselSwitch
              label="Show arrows"
              checked={carousel.arrows ?? true}
              onCheckedChange={(arrows) =>
                set("carousel", { ...carousel, arrows })
              }
            />
            <CarouselSwitch
              label="Show dots"
              checked={carousel.dots ?? true}
              onCheckedChange={(dots) => set("carousel", { ...carousel, dots })}
            />
            <CarouselSwitch
              label="Loop"
              checked={carousel.loop ?? true}
              onCheckedChange={(loop) => set("carousel", { ...carousel, loop })}
            />
          </InspectorSection>
        )}
    </div>
  );
}

function AddVideo({ onAdd }: { onAdd: (url: string) => void }) {
  const [url, setUrl] = useState("");
  const [touched, setTouched] = useState(false);
  const issue = directVideoUrlIssue(url);
  const showIssue =
    Boolean(issue) &&
    (touched || issue?.startsWith("Direct video file required."));
  return (
    <div className="mt-2">
      <Input
        aria-label="Direct video URL"
        aria-describedby={showIssue ? "add-video-url-error" : undefined}
        aria-invalid={showIssue || undefined}
        type="url"
        value={url}
        placeholder="https://example.com/video.mp4"
        onBlur={() => setTouched(true)}
        onChange={(event) => setUrl(event.target.value)}
      />
      {showIssue && (
        <p
          id="add-video-url-error"
          role="alert"
          className="mt-1 text-xs text-danger"
        >
          {issue}
        </p>
      )}
      <p className="mt-1 text-[11px] text-foreground-muted">
        Use a direct HTTPS video file URL. Provider page links are not
        supported.
      </p>
      <Button
        className="mt-2"
        type="button"
        size="sm"
        disabled={Boolean(issue)}
        onClick={() => onAdd(url.trim())}
      >
        <Plus size={14} /> Add video
      </Button>
    </div>
  );
}
function VideoItemEditor({
  item,
  onChange,
}: {
  item: Extract<MediaElement["items"][number], { type: "video" }>;
  onChange: (update: Record<string, unknown>) => void;
}) {
  const [draft, setDraft] = useState(item.url);
  const issue = directVideoUrlIssue(draft);
  return (
    <div className="mt-2 space-y-2">
      <Input
        aria-label="Direct video URL"
        aria-describedby={issue ? `${item.id}-video-url-error` : undefined}
        aria-invalid={issue ? true : undefined}
        type="url"
        value={draft}
        onChange={(event) => {
          const value = event.target.value;
          setDraft(value);
          if (!directVideoUrlIssue(value)) onChange({ url: value.trim() });
        }}
      />
      {issue && (
        <p
          id={`${item.id}-video-url-error`}
          role="alert"
          className="text-xs text-danger"
        >
          {issue}
        </p>
      )}
      <SwitchRow
        label="Show video controls"
        checked={item.controls ?? true}
        onCheckedChange={(controls) => onChange({ controls })}
      />
      <p className="text-[11px] text-foreground-muted">
        Direct HTTPS video files only. YouTube and Vimeo page links are not
        supported. Playback can still depend on codec, server, and network
        support.
      </p>
    </div>
  );
}
function ImageItemEditor({
  item,
  asset,
  controlId,
  aspectRatio,
  fit,
  onChange,
  onDecorativeChange,
  onFramingChange,
  onReplace,
}: {
  item: Extract<MediaElement["items"][number], { type: "image" }>;
  asset?: ResolvedWebsiteMedia;
  controlId: string;
  aspectRatio: "natural" | "square" | "portrait" | "landscape" | "wide";
  fit: "cover" | "contain";
  onChange: (update: Record<string, unknown>) => void;
  onDecorativeChange: (decorative: boolean, meaningfulAlt: string) => void;
  onFramingChange: (point: { x: number; y: number }, zoom: number) => void;
  onReplace: () => void;
}) {
  const filenameAlt =
    asset?.originalFilename.replace(/\.[^.]+$/, "").trim() || "Image";
  const [altDraft, setAltDraft] = useState(item.alt ?? "");
  const previousAlt = useRef(item.alt?.trim() || filenameAlt);
  const altIssue =
    !item.decorative && !altDraft.trim()
      ? "Alt text is required unless the image is decorative."
      : null;
  return (
    <div className="mt-2">
      {!item.decorative && (
        <>
          <Input
            aria-label="Alt text"
            aria-describedby={altIssue ? `${item.id}-alt-error` : undefined}
            aria-invalid={altIssue ? true : undefined}
            maxLength={500}
            value={altDraft}
            placeholder="Describe this image"
            onChange={(event) => setAltDraft(event.target.value)}
            onBlur={() => {
              const value = altDraft.trim();
              if (value) {
                previousAlt.current = value;
                setAltDraft(value);
                onChange({ alt: value });
              }
            }}
          />
          {altIssue && (
            <p
              id={`${item.id}-alt-error`}
              role="alert"
              className="mt-1 text-xs text-danger"
            >
              {altIssue}
            </p>
          )}
        </>
      )}
      <div className="mt-2">
        <SwitchRow
          label="Decorative image"
          checked={item.decorative ?? false}
          onCheckedChange={(checked) => {
            if (checked) {
              if (altDraft.trim()) previousAlt.current = altDraft.trim();
              onDecorativeChange(true, previousAlt.current);
            } else {
              const restored = previousAlt.current || filenameAlt;
              setAltDraft(restored);
              onDecorativeChange(false, restored);
            }
          }}
        />
      </div>
      {item.decorative && (
        <p className="mt-1 text-[11px] text-foreground-muted">
          Decorative images use empty alternative text publicly.
        </p>
      )}
      {asset && (
        <div className="mt-3">
          <FocalPointEditor
            controlId={controlId}
            url={asset.web.url}
            sourceWidth={asset.web.width}
            sourceHeight={asset.web.height}
            aspectRatio={aspectRatio}
            fit={fit}
            point={item.focalPoint ?? { x: 0.5, y: 0.5 }}
            zoom={item.zoom}
            onChange={({ point, zoom }) => onFramingChange(point, zoom)}
          />
          <p className="mt-1 truncate text-xs text-foreground-muted">
            {asset.originalFilename}
          </p>
          <Button
            aria-label="Replace image"
            className="mt-2"
            size="sm"
            type="button"
            variant="secondary"
            onClick={onReplace}
          >
            Change image
          </Button>
        </div>
      )}
    </div>
  );
}
function Field({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <InspectorField label={label}>
      <Select value={value} options={choices(values)} onChange={onChange} />
    </InspectorField>
  );
}
function CarouselSwitch({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <SwitchRow
      label={label}
      checked={checked}
      onCheckedChange={onCheckedChange}
    />
  );
}

function SwitchRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs font-medium">
      <span>{label}</span>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={label}
      />
    </div>
  );
}

function CarouselIntervalInput({
  intervalMs,
  disabled,
  onChange,
}: {
  intervalMs?: number;
  disabled: boolean;
  onChange: (intervalMs: number) => void;
}) {
  const [draft, setDraft] = useState(
    String(carouselIntervalSeconds(intervalMs)),
  );
  return (
    <InspectorField label="Autoplay interval (seconds)">
      <Input
        aria-label="Autoplay interval in seconds"
        type="number"
        min={2}
        max={15}
        step={1}
        disabled={disabled}
        value={draft}
        onChange={(event) => {
          const value = event.target.value;
          setDraft(value);
          const milliseconds = carouselIntervalMilliseconds(value);
          if (milliseconds !== undefined) onChange(milliseconds);
        }}
      />
    </InspectorField>
  );
}
