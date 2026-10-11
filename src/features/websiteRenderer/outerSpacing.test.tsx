import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CompositionGroup, TextElement } from "../websiteElements/types";
import { GroupElementRenderer } from "./GroupElementRenderer";
import { OuterSpacingWrapper } from "./OuterSpacingWrapper";

const text = (appearance?: TextElement["appearance"]): TextElement => ({ id: "text", type: "text", editorName: "Text 1", document: { type: "doc", children: [{ type: "paragraph", children: [{ text: "Copy" }] }] }, appearance });
const library = { colors: [] } as never;

describe("outer spacing execution", () => {
  it("resolves sparse Mobile directly from Desktop and never from Tablet", () => {
    const element = text({ outerSpacing: { top: "m", right: "l", bottom: "m", left: "l" }, responsive: { tablet: { outerSpacing: { top: "xl", left: "xs" } }, mobile: { outerSpacing: { right: "s", left: "s" } } } });
    const html = renderToStaticMarkup(<OuterSpacingWrapper element={element} viewport="mobile"><div data-actual-boundary /></OuterSpacingWrapper>);
    expect(html).toContain("padding-top:1rem");
    expect(html).toContain("padding-right:0.5rem");
    expect(html).toContain("padding-bottom:1rem");
    expect(html).not.toContain("padding-top:2rem");
    expect(html.indexOf("data-block-outer-spacing")).toBeLessThan(html.indexOf("data-actual-boundary"));
  });

  it("keeps Group outer spacing outside its boundary/background and inner spacing inside", () => {
    const group: CompositionGroup = { id: "group", type: "compositionGroup", editorName: "Group 1", appearance: { outerSpacing: { top: "m" }, backgroundColorId: "surface" }, layout: { padding: { top: "s" } }, backgroundMedia: undefined, children: [text({ outerSpacing: { top: "m" } })] };
    const html = renderToStaticMarkup(<OuterSpacingWrapper element={group} viewport="desktop"><GroupElementRenderer group={group} sectionId="blank" mode="public" viewport="desktop" templateKey="modern-editorial-v1" library={library} projectColors={[]} /></OuterSpacingWrapper>);
    const outer = html.indexOf("data-block-outer-spacing");
    const boundary = html.indexOf('data-website-element="group"');
    const childOuter = html.indexOf("data-block-outer-spacing", outer + 1);
    expect(outer).toBeLessThan(boundary);
    expect(boundary).toBeLessThan(childOuter);
    expect(html).toContain("padding-top:1rem");
    expect(html).toContain("padding-top:0.5rem");
  });

  it.each(["50-50", "60-40", "40-60", "thirds"] as const)("preserves %s tracks and constrains outer spacing to each slot", (division) => {
    const group: CompositionGroup = { id: "group", type: "compositionGroup", editorName: "Group 1", layout: { direction: "horizontal", division }, children: [text({ outerSpacing: { left: "xl", right: "xl" } })] };
    const html = renderToStaticMarkup(<GroupElementRenderer group={group} sectionId="blank" mode="public" viewport="desktop" templateKey="modern-editorial-v1" library={library} projectColors={[]} />);
    expect(html).toContain("minmax(0,");
    expect(html).toContain('data-block-outer-spacing="true"');
    expect(html).toContain("box-sizing:border-box");
    expect(html).not.toContain("margin-");
  });
});
