import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { ResponsiveViewport } from "../types";
import { resolveFloatingToolbarPosition, resolveFloatingToolbarResizeObserver, resolveRangeToolbarAnchor, translateToolbarAnchorToHost, type ToolbarPosition } from "../floatingToolbarPosition";

export function FloatingFormattingToolbar({ label, viewport, children, observeInOwnerRealm = false, range }: { label: string; viewport: ResponsiveViewport; children: ReactNode; observeInOwnerRealm?: boolean; range?: Range | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<ToolbarPosition | null>(null);
  useLayoutEffect(() => {
    const toolbar = ref.current;
    const anchor = toolbar?.parentElement;
    const hostDocument = toolbar?.ownerDocument;
    const view = hostDocument?.defaultView;
    const sourceDocument = range?.startContainer.ownerDocument;
    const sourceView = sourceDocument?.defaultView;
    if (!toolbar || !anchor || !hostDocument || !view) return;
    const update = () => {
      const localAnchor = range === undefined ? anchor.getBoundingClientRect() : range ? resolveRangeToolbarAnchor(range) : null;
      const hostAnchor = localAnchor && sourceDocument
        ? translateToolbarAnchorToHost(localAnchor, sourceDocument, hostDocument)
        : localAnchor;
      setPosition(hostAnchor ? resolveFloatingToolbarPosition(hostAnchor, toolbar.getBoundingClientRect(), { width: view.innerWidth, height: view.innerHeight }) : null);
    };
    update();
    view.addEventListener("resize", update);
    view.addEventListener("scroll", update, true);
    if (sourceView && sourceView !== view) {
      sourceView.addEventListener("resize", update);
      sourceView.addEventListener("scroll", update, true);
    }
    const ResizeObserverConstructor = observeInOwnerRealm
      ? resolveFloatingToolbarResizeObserver(view)
      : typeof ResizeObserver === "undefined" ? undefined : ResizeObserver;
    const observer = ResizeObserverConstructor ? new ResizeObserverConstructor(update) : null;
    if (range === undefined) observer?.observe(anchor);
    if (range && sourceDocument) {
      const rangeElement = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
        ? range.commonAncestorContainer as Element
        : range.commonAncestorContainer.parentElement;
      const frame = sourceDocument === hostDocument
        ? null
        : Array.from(hostDocument.querySelectorAll("iframe")).find((candidate) => candidate.contentDocument === sourceDocument);
      const zoomRoot = sourceDocument === hostDocument
        ? rangeElement?.closest<HTMLElement>("[data-editor-zoom-viewport]")
        : frame?.closest<HTMLElement>("[data-editor-zoom-viewport]");
      if (zoomRoot) observer?.observe(zoomRoot);
    }
    observer?.observe(toolbar);
    return () => { view.removeEventListener("resize", update); view.removeEventListener("scroll", update, true); sourceView?.removeEventListener("resize", update); sourceView?.removeEventListener("scroll", update, true); observer?.disconnect(); };
  }, [observeInOwnerRealm, range]);
  const style: CSSProperties = position ? { left: position.left, top: position.top } : { left: "50%", top: 0, transform: "translate(-50%, calc(-100% - .5rem))" };
  if (range === null) return null;
  const toolbar = <div ref={ref} className="fixed z-50 flex flex-row flex-nowrap gap-1 whitespace-nowrap rounded-lg border border-border bg-surface p-1 text-foreground shadow-[var(--shadow-dialog)]" style={style} role="toolbar" aria-label={label} data-floating-formatting-toolbar data-toolbar-viewport={viewport} data-toolbar-placement={position?.placement} onPointerDown={(event) => event.preventDefault()}>{children}</div>;
  return range === undefined || typeof document === "undefined" ? toolbar : createPortal(toolbar, document.body);
}
