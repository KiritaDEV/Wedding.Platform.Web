import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { accordionElementSchema } from "./schemas";
import { createSectionElement, duplicateWebsiteElement, type SectionChildFlow } from "../websiteEditor/sectionChildFlow";
import { AccordionElementRenderer } from "../websiteRenderer/AccordionElementRenderer";
import { isElementRenderable } from "../websiteRenderer/elementRenderability";
import { validateSectionContent } from "../websiteEditor/schemas";

const element = { id: "accordion", type: "accordion" as const, editorName: "Accordion 1", items: [{ id: "one", title: "Travel", content: "Allow extra time." }] };

describe("Accordion block", () => {
  it("validates a narrow strict contract and unique item IDs", () => {
    expect(accordionElementSchema.safeParse({ ...element, items: [] }).success).toBe(true);
    expect(accordionElementSchema.safeParse(element).success).toBe(true);
    expect(accordionElementSchema.safeParse({ ...element, extra: true }).success).toBe(false);
    expect(accordionElementSchema.safeParse({ ...element, items: [element.items[0], element.items[0]] }).success).toBe(false);
  });

  it("validates through the complete Blank save contract", () => {
    const content = { semantic: {}, compositions: { shared: { childFlow: { elements: [element], order: [{ kind: "element", id: element.id }] } } } };
    expect(validateSectionContent("blank", content, "classic-filipiniana-v1").success).toBe(true);
    expect(validateSectionContent("blank", content, "modern-editorial-v1").success).toBe(true);
  });

  it("uses native disclosure semantics without leaking editor identity", () => {
    const html = renderToStaticMarkup(<AccordionElementRenderer element={element} mode="public" />);
    expect(html).toContain("<details");
    expect(html).toContain("<summary");
    expect(html).not.toContain("Accordion 1");
  });

  it("omits empty public geometry and keeps an editor prompt", () => {
    const empty = { ...element, items: [] };
    expect(isElementRenderable(empty, "classic-filipiniana-v1", "public")).toBe(false);
    expect(isElementRenderable({ ...element, items: [{ id: "empty", title: "  ", content: "\n" }] }, "classic-filipiniana-v1", "public")).toBe(false);
    expect(renderToStaticMarkup(<AccordionElementRenderer element={empty} mode="public" />)).toBe("");
    expect(renderToStaticMarkup(<AccordionElementRenderer element={empty} mode="editor" />)).toContain("Add an item");
  });

  it("uses shared naming and regenerates block and item identities on duplication", () => {
    const flow: SectionChildFlow = { elements: [element], order: [{ kind: "element", id: element.id }] };
    expect(createSectionElement(flow, "accordion").editorName).toBe("Accordion 2");
    const copy = duplicateWebsiteElement(flow, element);
    expect(copy.id).not.toBe(element.id);
    expect(copy.editorName).toBe("Accordion 2");
    expect(copy.items[0].id).not.toBe(element.items[0].id);
  });
});
