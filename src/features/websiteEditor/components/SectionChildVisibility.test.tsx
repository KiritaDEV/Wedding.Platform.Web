import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ElementVisibilityAction, SectionChildList } from "./SectionChildList";
import { StructureMenuAction } from "./StructureActionMenu";

describe("generic element visibility action", () => {
  it.each(["text", "text", "media", "divider", "compositionGroup"] as const)("shows Hide for a visible %s", (type) => {
    const element = { id: type, type } as never;
    expect(renderToStaticMarkup(<ElementVisibilityAction element={element} onToggle={vi.fn()} />)).toContain("Hide");
  });

  it.each(["text", "text", "media", "divider", "compositionGroup"] as const)("shows Show for a hidden %s", (type) => {
    const element = { id: type, type, isHidden: true } as never;
    expect(renderToStaticMarkup(<ElementVisibilityAction element={element} onToggle={vi.fn()} />)).toContain("Show");
  });

  it("keeps hidden elements visible and clearly marked in Structure", () => {
    const html = renderToStaticMarkup(<SectionChildList
      sectionLabel="Date"
      flow={{ elements: [{ id: "hidden-text", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Hidden copy" }] }] }, isHidden: true }], order: [{ kind: "specialized", key: "content" }, { kind: "element", id: "hidden-text" }] }}
      selected={null}
      onSelect={vi.fn()}
      onChange={vi.fn()}
      onRenameSave={vi.fn(async () => null)}
      onDuplicate={vi.fn()}
      onDelete={vi.fn()}
    />);
    expect(html).toContain('data-element-hidden="true"');
    expect(html).toContain("opacity-60");
    expect(html).toContain("Text 1");
    expect(html).not.toContain("Hidden copy");
    expect(html).not.toContain('role="img" aria-label="Hidden"');
    expect(html).toContain("text-foreground-muted opacity-50");
    const hiddenRowOpeningTag = html.match(/<div[^>]*data-element-hidden="true"[^>]*>/)?.[0];
    expect(hiddenRowOpeningTag).not.toContain("opacity-");
    expect(html).toContain('aria-label="Text block: Text 1, hidden"');
    expect(html).toContain('aria-label="Text block: Text 1, hidden actions"');
  });

  it("keeps hidden-row menu actions enabled and reserves disabled state for unavailable actions", () => {
    const show = renderToStaticMarkup(<ElementVisibilityAction element={{ id: "hidden", type: "text", editorName: "Text 1", document: { type: "doc" as const, children: [{ type: "paragraph" as const, children: [{ text: "Hidden" }] }] }, isHidden: true }} onToggle={vi.fn()} />);
    const enabled = renderToStaticMarkup(<StructureMenuAction icon={<span />} onClick={vi.fn()}>Duplicate</StructureMenuAction>);
    const disabled = renderToStaticMarkup(<StructureMenuAction icon={<span />} disabled onClick={vi.fn()}>Move up</StructureMenuAction>);
    expect(show).toContain("Show");
    expect(show).not.toContain('disabled=""');
    expect(enabled).not.toContain('disabled=""');
    expect(disabled).toContain('disabled=""');
  });
});
