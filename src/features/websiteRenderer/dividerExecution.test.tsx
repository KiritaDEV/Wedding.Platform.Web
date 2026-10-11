import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { classicDecorativeAssets, resolveDecorativeExecutionById } from "./templateDecorativeAssets";
import { dividerAssetsForTemplate, resolveDividerAsset } from "../websiteElements/divider";
import { getDecorativeAssetStyle } from "./decorativeExecution";
import { DividerElementRenderer } from "./DividerElementRenderer";
import { GroupElementRenderer } from "./GroupElementRenderer";
import { SectionChildFlowRenderer } from "./SectionChildFlowRenderer";
import type { DividerElement } from "../websiteElements/types";
import type { TemplateDesignLibrary } from "../websiteCapabilities/types";
import { validateDecorativeAssetDefinition } from "./decorativeRegistryValidation";

const templateKey = "classic-filipiniana-v1";
const library = { colors: [{ id: "accent", value: "#123456" }, { id: "authored", value: "#abcdef" }] } as TemplateDesignLibrary;
const context = { headingFontId: "", bodyFontId: "", headingColorId: "accent", bodyColorId: "accent", accentColorId: "accent" };
const base: DividerElement = { id: "divider", type: "divider", editorName: "Divider 1" };
const render = (element: DividerElement, mode: "editor" | "public" = "public") => renderToStaticMarkup(<DividerElementRenderer element={element} mode={mode} templateKey={templateKey} library={library} context={context} />);

describe("shared Divider execution", () => {
  it.each(dividerAssetsForTemplate(templateKey))("preserves $id intrinsic artwork in both modes", (asset) => {
    const resolved = resolveDecorativeExecutionById(templateKey, asset.id)!;
    expect(resolved.source).toBe(asset.sourcePath);
    expect(resolved.execution.renderMode).toBe("mask");
    expect(resolved.execution.tintToken).toBe("accent");
    const png = readFileSync(new URL(`../../../public${asset.sourcePath}`, import.meta.url));
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([asset.intrinsicWidth, asset.intrinsicHeight]);
    expect(validateDecorativeAssetDefinition(asset, classicDecorativeAssets.assetRoot)).toEqual([]);
    const style = getDecorativeAssetStyle(resolved);
    expect(style.maskSize).toBe("contain");
    expect(style.backgroundImage).toBeUndefined();
    for (const width of ["small", "medium", "large", "full"] as const) {
      const element = { ...base, appearance: { assetId: asset.id, width, opacity: 63 } };
      const html = render(element);
      expect(render(element, "editor")).toBe(html);
      expect(html).toContain(`aspect-ratio:${asset.intrinsicWidth} / ${asset.intrinsicHeight}`);
      expect(html).toContain("opacity:0.63");
      expect(html).not.toMatch(/min-height|height:|object-fit|overflow:|padding:|margin:|background-image:/);
    }
  });

  it.each([["authored", "#abcdef"], ["missing", "#123456"], [undefined, "#123456"]])("resolves authored/default tint %s", (colorId, expected) => {
    expect(render({ ...base, appearance: { colorId } })).toContain(`background-color:${expected}`);
  });

  it("supports project colors and final currentColor fallback", () => {
    const element = { ...base, appearance: { colorId: "project-color-example" } };
    expect(renderToStaticMarkup(<DividerElementRenderer element={element} templateKey={templateKey} library={library} projectColors={[{ id: "project-color-example", value: "#FEDCBA" }]} />)).toContain("background-color:#FEDCBA");
    expect(renderToStaticMarkup(<DividerElementRenderer element={base} templateKey={templateKey} library={library} />)).toContain("background-color:currentColor");
  });

  it("shares image execution without artwork-specific JSX", () => {
    const resolved = resolveDecorativeExecutionById(templateKey, "classic-divider-botanical-vine")!;
    const style = getDecorativeAssetStyle({ ...resolved, execution: { ...resolved.execution, renderMode: "image" } });
    expect(style.backgroundImage).toContain(resolved.source);
    expect(style.maskImage).toBeUndefined();
  });

  it.each(["pending", "missing-source", "invalid-dimensions"])("diagnoses %s without substituting another asset", (failure) => {
    const original = classicDecorativeAssets.assets.find(({ kind }) => kind === "divider")!;
    const unavailable = { ...original, ...(failure === "pending" ? { status: "pending" as const } : failure === "missing-source" ? { sourcePath: "/template-assets/classic-filipiniana/missing.png" } : { intrinsicHeight: 0 }) };
    const originalAssets = classicDecorativeAssets.assets;
    classicDecorativeAssets.assets = [unavailable];
    try {
      expect(resolveDividerAsset(templateKey)).toBeUndefined();
      expect(dividerAssetsForTemplate(templateKey)).toEqual([]);
      expect(render(base)).toBe("");
      expect(render(base, "editor")).toContain("data-divider-unavailable");
    } finally { classicDecorativeAssets.assets = originalAssets; }
  });

  it.each(["vertical", "horizontal"] as const)("omits unavailable public children before %s Group layout", (direction) => {
    const group = { id: "group", type: "compositionGroup" as const, editorName: "Group 1", layout: { direction, gap: "m" as const }, children: [{ ...base, appearance: { assetId: "missing" } }, base] };
    const html = renderToStaticMarkup(<GroupElementRenderer group={group} sectionId="date" mode="public" viewport="desktop" templateKey={templateKey} library={library} projectColors={[]} />);
    expect(html.match(/data-section-child-element=/g)).toHaveLength(1);
    expect(html).toContain("gap:1rem");
  });

  it("omits Modern Divider frames at Section root", () => {
    const html = renderToStaticMarkup(<SectionChildFlowRenderer sectionId="date" flow={{ elements: [base], order: [{ kind: "element", id: base.id }] }} specialized={null} mode="public" viewport="desktop" templateKey="modern-editorial-v1" library={library} projectColors={[]} />);
    expect(html).not.toContain("data-section-child-element");
    expect(html).not.toContain("data-website-element");
  });
});
