import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createColorPreviewStore, createCustomColorSession } from "./colorPreview";
import { DividerElementRenderer } from "../websiteRenderer/DividerElementRenderer";
import type { TemplateDesignLibrary } from "../websiteCapabilities/types";
import { colorIdForWebsiteColorChoice } from "./components/websiteColorSwatches";

describe("shared custom-color preview lifecycle", () => {
  it.each([undefined, "template", "project-color-existing"])("never changes committed %s while probing or cancelling", (colorId) => {
    const store = createColorPreviewStore();
    const state = { colorId };
    const add = vi.fn(async () => ({ id: "new" }));
    const commit = vi.fn();
    const session = createCustomColorSession(store.begin("element:color"), add, commit);
    expect(store.get("element:color")).toBeUndefined();
    for (const color of ["#FF0000", "#00FF00", "#0000FF"]) session.probe(color);
    expect(store.get("element:color")).toBe("#0000FF");
    expect(state).toEqual({ colorId });
    expect(add).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
    session.cancel();
    expect(store.get("element:color")).toBeUndefined();
  });

  it.each(["Cancel", "Escape", "dismiss", "unmount"])("discards preview on %s", () => {
    const store = createColorPreviewStore();
    const session = createCustomColorSession(store.begin("target"), vi.fn(), vi.fn());
    session.probe("#ABCDEF");
    session.cancel();
    session.probe("#123456");
    expect(store.get("target")).toBeUndefined();
  });

  it("adds once, commits the canonical ID, then clears preview", async () => {
    const store = createColorPreviewStore();
    let complete!: (value: { id: string }) => void;
    const add = vi.fn(() => new Promise<{ id: string }>((resolve) => { complete = resolve; }));
    const commit = vi.fn();
    const session = createCustomColorSession(store.begin("target"), add, commit);
    session.probe("#ABCDEF");
    const result = session.add("#ABCDEF");
    expect(await session.add("#ABCDEF")).toBe(false);
    expect(add).toHaveBeenCalledTimes(1);
    expect(commit).not.toHaveBeenCalled();
    complete({ id: "project-color-new" });
    expect(await result).toBe(true);
    expect(commit).toHaveBeenCalledExactlyOnceWith("project-color-new");
    expect(store.get("target")).toBeUndefined();
  });

  it("keeps failed Add usable without partial commitment", async () => {
    const store = createColorPreviewStore();
    const add = vi.fn().mockRejectedValueOnce(new Error("Failed")).mockResolvedValueOnce({ id: "canonical" });
    const commit = vi.fn();
    const session = createCustomColorSession(store.begin("target"), add, commit);
    session.probe("#ABCDEF");
    await expect(session.add("#ABCDEF")).rejects.toThrow("Failed");
    expect(commit).not.toHaveBeenCalled();
    expect(store.get("target")).toBe("#ABCDEF");
    session.probe("#123456");
    expect(await session.add("#123456")).toBe(true);
    expect(commit).toHaveBeenCalledExactlyOnceWith("canonical");
  });

  it("does not commit a late response after cancellation or clear a newer preview", async () => {
    const store = createColorPreviewStore();
    let complete!: (value: { id: string }) => void;
    const commit = vi.fn();
    const old = createCustomColorSession(store.begin("old"), () => new Promise((resolve) => { complete = resolve; }), commit);
    const pending = old.add("#ABCDEF");
    old.cancel();
    store.begin("new").update("#123456");
    complete({ id: "late" });
    expect(await pending).toBe(false);
    expect(commit).not.toHaveBeenCalled();
    expect(store.get("new")).toBe("#123456");
  });

  it("keeps normal swatch IDs and Default pruning unchanged", () => {
    expect(colorIdForWebsiteColorChoice({ kind: "template", id: "accent", label: "Accent", value: "#123456" })).toBe("accent");
    expect(colorIdForWebsiteColorChoice({ kind: "inherit", id: null, label: "Default" })).toBeUndefined();
  });

  it("previews Divider mask tint only in editor output and restores canonical fallback", () => {
    const props = { element: { id: "divider", type: "divider" as const, editorName: "Divider 1" }, templateKey: "classic-filipiniana-v1", library: { colors: [{ id: "accent", value: "#123456" }] } as unknown as TemplateDesignLibrary, context: { headingFontId: "", bodyFontId: "", headingColorId: "accent", bodyColorId: "accent", accentColorId: "accent" } };
    expect(renderToStaticMarkup(<DividerElementRenderer {...props} mode="editor" previewColor="#ABCDEF" />)).toContain("background-color:#ABCDEF");
    expect(renderToStaticMarkup(<DividerElementRenderer {...props} mode="public" previewColor="#ABCDEF" />)).toContain("background-color:#123456");
    expect(renderToStaticMarkup(<DividerElementRenderer {...props} mode="editor" />)).toContain("background-color:#123456");
    expect(props.element).not.toHaveProperty("appearance");
  });
});
