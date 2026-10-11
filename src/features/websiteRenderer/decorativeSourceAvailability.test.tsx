import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { isDecorativeSourceAvailable, observeDecorativeSource, subscribeDecorativeSourceAvailability } from "./decorativeSourceAvailability";
import { resolveDividerAsset } from "../websiteElements/divider";
import { isElementRenderable } from "./elementRenderability";
import { DividerElementRenderer } from "./DividerElementRenderer";
import type { TemplateDesignLibrary } from "../websiteCapabilities/types";

it("handles a browser source-load failure at the shared renderability boundary", () => {
  const probe: { src: string; onerror: (() => void) | null } = { src: "", onerror: null };
  const ImageMock = class {
    set src(value: string) { probe.src = value; }
    set onerror(handler: (() => void) | null) { probe.onerror = handler; }
  };
  vi.stubGlobal("Image", ImageMock);
  try {
    const templateKey = "classic-filipiniana-v1";
    const element = { id: "d", type: "divider" as const, editorName: "Divider 1" };
    const source = resolveDividerAsset(templateKey)!.sourcePath;
    expect(isDecorativeSourceAvailable(source)).toBe(true);
    expect(isDecorativeSourceAvailable("/template-assets/missing.png")).toBe(false);
    observeDecorativeSource(source);
    expect(probe?.src).toBe(source);
    const parentRerender = vi.fn();
    const unsubscribe = subscribeDecorativeSourceAvailability(parentRerender);
    probe?.onerror?.();
    expect(parentRerender).toHaveBeenCalledOnce();
    unsubscribe();
    expect(isDecorativeSourceAvailable(source)).toBe(false);
    expect(isElementRenderable(element, templateKey, "public")).toBe(false);
    expect(isElementRenderable(element, templateKey, "editor")).toBe(true);
    const library = { colors: [] } as unknown as TemplateDesignLibrary;
    expect(renderToStaticMarkup(<DividerElementRenderer element={element} templateKey={templateKey} library={library} />)).toBe("");
    expect(renderToStaticMarkup(<DividerElementRenderer element={element} templateKey={templateKey} library={library} mode="editor" />)).toContain("data-divider-unavailable");
  } finally { vi.unstubAllGlobals(); }
});
