import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import type {
  ResolvedWebsiteMedia,
  ResponsiveViewport,
} from "../websiteEditor/types";
import {
  carouselAutoplayStep,
  carouselIndex,
  mediaAutoplayAllowed,
  resolveMediaPresentation,
  shouldShowMediaVideoLoadError,
} from "../websiteElements/media";
import type { MediaElement } from "../websiteElements/types";
import { ZoomedMediaImage } from "./ZoomedMediaImage";
import { resolveElementInlineAlignment } from "./elementInlineAlignment";
import { resolvedMediaItems } from "./elementRenderability";
import { resolveMediaAspectRatio } from "../websiteElements/mediaCrop";
import { SURFACE_RADIUS_CSS, SURFACE_SHADOW_CSS } from "./surfaceEffects";

const widths = {
  small: "20rem",
  medium: "32rem",
  large: "48rem",
  full: "100%",
} as const;
export function MediaElementRenderer({
  element,
  viewport,
  media,
  mode = "public",
}: {
  element: MediaElement;
  viewport: ResponsiveViewport;
  media: Record<string, ResolvedWebsiteMedia>;
  mode?: "editor" | "public";
}) {
  const renderedItems = useMemo(() => mode === "public" ? resolvedMediaItems(element, media) : element.items, [element, media, mode]);
  const runtimeElement = renderedItems === element.items ? element : { ...element, items: renderedItems };
  const presentation = resolveMediaPresentation(runtimeElement, viewport);
  const modeName = renderedItems.length > 1 ? presentation.mode : "single";
  const carousel = presentation.carousel ?? {};
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const paused = useRef(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const activeIndex = renderedItems.findIndex(({ id }) => id === activeItemId);
  const safeActive = activeIndex >= 0 ? activeIndex : 0;
  useEffect(() => {
    const ownerWindow = carouselRef.current?.ownerDocument.defaultView;
    if (!ownerWindow) return;
    const query = ownerWindow.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (
      modeName !== "carousel" ||
      !mediaAutoplayAllowed(
        carousel.autoplay ?? false,
        renderedItems.length,
        reducedMotion,
        mode,
      )
    )
      return;
    const ownerWindow = carouselRef.current?.ownerDocument.defaultView;
    if (!ownerWindow) return;
    const timer = ownerWindow.setInterval(() => {
      if (paused.current) return;
      setActiveItemId((value) => {
        const current = Math.max(0, renderedItems.findIndex(({ id }) => id === value));
        const step = carouselAutoplayStep(
          current,
          renderedItems.length,
          carousel.loop !== false,
        );
        if (step.stop) ownerWindow.clearInterval(timer);
        return renderedItems[step.next]?.id ?? null;
      });
    }, carousel.interval ?? 5000);
    return () => ownerWindow.clearInterval(timer);
  }, [
    carousel.autoplay,
    carousel.interval,
    carousel.loop,
    mode,
    renderedItems,
    reducedMotion,
    modeName,
  ]);

  if (!renderedItems.length)
    return mode === "editor" ? (
      <div
        data-media-empty
        className="grid min-h-32 place-items-center rounded-lg border border-dashed border-border text-sm text-foreground-muted"
      >
        Choose an image or add a video
      </div>
    ) : null;

  const appearance = element.appearance ?? {};
  const frame = appearance.frame ?? "none";
  const cardStyle: CSSProperties = {
    overflow: "hidden",
    borderRadius: SURFACE_RADIUS_CSS[appearance.corners ?? "square"],
    boxShadow: SURFACE_SHADOW_CSS[appearance.shadow ?? "none"],
    border: frame === "line" ? "1px solid currentColor" : undefined,
    padding: frame === "mat" ? ".5rem" : undefined,
    background: frame === "mat" ? "#fff" : undefined,
  };
  const renderItem = (item: MediaElement["items"][number]) => {
    if (item.type === "video")
      return (
        <div style={{ ...cardStyle, aspectRatio: presentation.aspectRatio === "natural" ? undefined : resolveMediaAspectRatio(presentation.aspectRatio, { width: 1, height: 1 }) }}>
          <MediaVideo url={item.url} controls={item.controls ?? true} fit={presentation.fit} mode={mode} />
        </div>
      );
    const asset = media[item.mediaId];
    if (!asset)
      return (
        <div
          style={{ ...cardStyle, aspectRatio: resolveMediaAspectRatio(presentation.aspectRatio, { width: 1, height: 1 }) }}
          className="grid min-h-32 place-items-center bg-surface-muted text-sm text-foreground-muted"
        >
          Media unavailable
        </div>
      );
    return (
      <div style={{ ...cardStyle, aspectRatio: resolveMediaAspectRatio(presentation.aspectRatio, asset.web) }}>
        {presentation.fit === "contain" ? (
          <img
            className="block h-full w-full object-contain"
            src={asset.web.url}
            width={asset.web.width}
            height={asset.web.height}
            alt={item.decorative ? "" : (item.alt ?? "")}
          />
        ) : (
          <ZoomedMediaImage
            className="h-full w-full"
            height={asset.web.height}
            width={asset.web.width}
            src={asset.web.url}
            reference={item}
            alt={item.decorative ? "" : (item.alt ?? "")}
          />
        )}
      </div>
    );
  };
  const alignedStyle: CSSProperties = {
    display: "flex",
    justifyContent: resolveElementInlineAlignment(
      presentation.alignment === "start"
        ? "flex-start"
        : presentation.alignment === "end"
          ? "flex-end"
          : "center",
    ),
    width: "100%",
  };
  const widthStyle: CSSProperties = {
    width: "100%",
    maxWidth: widths[presentation.width],
  };
  if (modeName === "single")
    return (
      <div data-media-presentation="single" style={alignedStyle}>
        <div style={widthStyle}>{renderItem(renderedItems[0])}</div>
      </div>
    );

  const last = renderedItems.length - 1;
  const loop = carousel.loop !== false;
  const previous = () => setActiveItemId((value) => {
    const current = renderedItems.findIndex(({ id }) => id === value);
    return renderedItems[carouselIndex(current < 0 ? 0 : current, -1, renderedItems.length, loop)]?.id ?? null;
  });
  const next = () => setActiveItemId((value) => {
    const current = renderedItems.findIndex(({ id }) => id === value);
    return renderedItems[carouselIndex(current < 0 ? 0 : current, 1, renderedItems.length, loop)]?.id ?? null;
  });
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    if (event.key === "ArrowLeft") previous();
    else next();
  };
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget))
      paused.current = false;
  };
  const controlInset =
    viewport === "mobile"
      ? ".625rem"
      : viewport === "tablet"
        ? ".75rem"
        : "1rem";
  const renderDots = () =>
    carousel.dots !== false ? (
      <div
        data-carousel-dots
        className="absolute left-1/2 z-10 flex -translate-x-1/2 items-center text-white"
        style={{ bottom: controlInset }}
      >
        {renderedItems.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-label={`Show photo ${index + 1} of ${renderedItems.length}`}
            aria-current={index === safeActive ? "true" : undefined}
            className="grid size-4 place-items-center rounded-full outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-white/80 sm:size-5"
            onClick={() => setActiveItemId(item.id)}
          >
            <span
              aria-hidden="true"
              className={`border border-white/80 drop-shadow-[0_1px_2px_rgb(0_0_0/.7)] ${index === safeActive ? "h-1 w-3 rounded-sm bg-white sm:h-1.5 sm:w-3.5" : "size-1 rounded-full bg-white/40 sm:size-1.5"}`}
            />
          </button>
        ))}
      </div>
    ) : null;
  return (
    <div style={alignedStyle}>
      <div
        ref={carouselRef}
        data-media-presentation="carousel"
        role="region"
        aria-roledescription="carousel"
        aria-label="Photo carousel"
        tabIndex={0}
        style={widthStyle}
        onKeyDown={onKeyDown}
        onMouseEnter={() => {
          paused.current = true;
        }}
        onMouseLeave={() => {
          paused.current = false;
        }}
        onFocus={() => {
          paused.current = true;
        }}
        onBlur={onBlur}
      >
        <div
          data-carousel-viewport
          style={{ position: "relative", width: "100%" }}
        >
          <div
            data-carousel-item={renderedItems[safeActive].id}
            data-carousel-state="active"
            data-carousel-active-card="true"
            aria-current="true"
            style={{ position: "relative" }}
          >
            {renderItem(renderedItems[safeActive])}
            {renderDots()}
          </div>
          {carousel.arrows !== false && (
            <div
              data-carousel-arrows
              className="pointer-events-none absolute inset-0 z-10 flex items-center justify-between"
              style={{ paddingInline: controlInset }}
            >
              <button
                type="button"
                aria-label="Previous photo"
                disabled={!loop && safeActive === 0}
                className="pointer-events-auto grid size-11 place-items-center rounded-full bg-black/20 text-2xl leading-none text-white shadow-sm backdrop-blur-[2px] outline-none transition-colors hover:bg-black/35 focus-visible:bg-black/40 focus-visible:ring-2 focus-visible:ring-white/80 disabled:cursor-not-allowed disabled:opacity-30 sm:size-10"
                onClick={previous}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next photo"
                disabled={!loop && safeActive === last}
                className="pointer-events-auto grid size-11 place-items-center rounded-full bg-black/20 text-2xl leading-none text-white shadow-sm backdrop-blur-[2px] outline-none transition-colors hover:bg-black/35 focus-visible:bg-black/40 focus-visible:ring-2 focus-visible:ring-white/80 disabled:cursor-not-allowed disabled:opacity-30 sm:size-10"
                onClick={next}
              >
                ›
              </button>
            </div>
          )}
        </div>
        <p data-carousel-position className="sr-only">
          Photo {safeActive + 1} of {renderedItems.length}
        </p>
      </div>
    </div>
  );
}

function MediaVideo({ url, controls, fit, mode }: { url: string; controls: boolean; fit: "cover" | "contain"; mode: "editor" | "public" }) {
  const [failed, setFailed] = useState(false);
  return <><video className="block h-full w-full" style={{ objectFit: fit }} src={url} controls={controls} playsInline onError={() => setFailed(true)} />{shouldShowMediaVideoLoadError(mode, failed) && <p data-media-video-error role="status" className="p-3 text-sm text-foreground-muted">This video could not be loaded. Check the direct URL, codec, server, or network.</p>}</>;
}
