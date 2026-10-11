import { describe, expect, it } from "vitest";
import { syncEditorPreviewTheme } from "./editorPreviewTheme";

describe("editor preview theme synchronization", () => {
  it.each(["light", "dark"])("copies the %s editor theme used by every semantic preview into the portal root", (theme) => {
    const source = { className: `editor ${theme}`, dataset: { theme } };
    const target = { className: "", dataset: {} as Record<string, string> };
    syncEditorPreviewTheme(source as never, target as never);
    expect(target).toEqual({ className: `editor ${theme}`, dataset: { theme } });
  });

  it("removes a stale preview theme when the editor returns to the default theme", () => {
    const target = { className: "dark", dataset: { theme: "dark" } };
    syncEditorPreviewTheme({ className: "", dataset: {} } as never, target as never);
    expect(target).toEqual({ className: "", dataset: {} });
  });
});
