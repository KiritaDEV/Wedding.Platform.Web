import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createSectionElement, duplicateWebsiteElement, type SectionChildFlow } from "../websiteEditor/sectionChildFlow";
import { isElementRenderable } from "../websiteRenderer/elementRenderability";
import { ScheduleElementRenderer } from "../websiteRenderer/ScheduleElementRenderer";
import { scheduleElementSchema } from "./schemas";

const element = { id: "schedule", type: "schedule" as const, editorName: "Schedule 1", items: [{ id: "entry-1", time: "15:30", title: "Ceremony", details: "Garden level" }] };

describe("Schedule block", () => {
  it("validates the strict canonical contract and rejects malformed time and duplicate identities", () => {
    expect(scheduleElementSchema.safeParse(element).success).toBe(true);
    expect(scheduleElementSchema.safeParse({ ...element, items: [] }).success).toBe(true);
    expect(scheduleElementSchema.safeParse({ ...element, extra: true }).success).toBe(false);
    expect(scheduleElementSchema.safeParse({ ...element, items: [{ ...element.items[0], time: "3:30 PM" }] }).success).toBe(false);
    expect(scheduleElementSchema.safeParse({ ...element, items: [element.items[0], element.items[0]] }).success).toBe(false);
    expect(scheduleElementSchema.safeParse({ ...element, items: Array.from({ length: 101 }, (_, index) => ({ ...element.items[0], id: `entry-${index}` })) }).success).toBe(false);
  });

  it.each(["classic-filipiniana-v1", "modern-editorial-v1"])("renders one semantic ordered itinerary in %s", (templateKey) => {
    const html = renderToStaticMarkup(<ScheduleElementRenderer element={element} mode="public" templateKey={templateKey} />);
    expect(html).toContain("<ol");
    expect(html).toContain("<li");
    expect(html).toContain('datetime="15:30"');
    expect(html).toContain("3:30 PM");
    expect(html).not.toContain("Schedule 1");
    expect(html).not.toContain("entry-1");
  });

  it("omits empty, hidden, and incomplete schedules publicly while retaining an editor prompt", () => {
    const empty = { ...element, items: [] };
    const incomplete = { ...element, items: [{ ...element.items[0], title: "  " }] };
    expect(renderToStaticMarkup(<ScheduleElementRenderer element={empty} mode="public" templateKey="classic-filipiniana-v1" />)).toBe("");
    expect(renderToStaticMarkup(<ScheduleElementRenderer element={incomplete} mode="public" templateKey="classic-filipiniana-v1" />)).toBe("");
    expect(renderToStaticMarkup(<ScheduleElementRenderer element={empty} mode="editor" templateKey="classic-filipiniana-v1" />)).toContain("Add an entry to this Schedule.");
    expect(isElementRenderable(empty, "classic-filipiniana-v1", "public")).toBe(false);
    expect(isElementRenderable({ ...element, isHidden: true }, "classic-filipiniana-v1", "public")).toBe(false);
  });

  it("uses shared Block Identity and regenerates block and item IDs on duplication", () => {
    const flow: SectionChildFlow = { elements: [element], order: [{ kind: "element", id: element.id }] };
    expect(createSectionElement(flow, "schedule").editorName).toBe("Schedule 2");
    const copy = duplicateWebsiteElement(flow, element);
    expect(copy.id).not.toBe(element.id);
    expect(copy.editorName).toBe("Schedule 2");
    expect(copy.items[0].id).not.toBe(element.items[0].id);
    expect(copy.items[0]).toMatchObject({ time: "15:30", title: "Ceremony", details: "Garden level" });
  });
});
