import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { countdownElementSchema } from "../../websiteElements/schemas";
import { createSectionElement, gallerySectionChildFlowSchema, rsvpSectionChildFlowSchema, type SectionChildFlow } from "../sectionChildFlow";
import { groupAddKinds } from "./sectionChildListHelpers";
import { createRootAddResult, rootAddElementItems } from "./rootAddElementItems";
import { SectionChildList } from "./SectionChildList";

const full = ["text", "date", "accordion", "schedule", "people", "countdown", "divider", "media", "compositionGroup"] as const;

describe("real Countdown Add Element availability", () => {
  it.each(["Hero", "Blank"])("includes Countdown in the %s root menu capability intersection", () => {
    expect(rootAddElementItems(full).map(({ label }) => label)).toEqual(["Text", "Date", "Accordion", "Schedule", "People", "Countdown", "Divider", "Media", "Group"]);
  });

  it("creates the strict canonical Event-target block selected by the root menu", () => {
    const menuItem = rootAddElementItems(full).find(({ type }) => type === "countdown");
    expect(menuItem?.label).toBe("Countdown");
    const { element: created, flow } = createRootAddResult(undefined, menuItem!.type);
    expect(created).toMatchObject({ type: "countdown", editorName: "Countdown 1", target: { source: "event" } });
    expect(created.id).toMatch(/^countdown-/);
    expect(countdownElementSchema.safeParse(created).success).toBe(true);
    expect(created).not.toEqual(expect.objectContaining({ appearance: expect.anything() }));
    expect(flow.elements).toContainEqual(created);
    expect(flow.order).toContainEqual({ kind: "element", id: created.id });
  });

  it("includes Countdown in Group and nested Group menus within the existing depth limit", () => {
    expect(groupAddKinds(1)).toContain("countdown");
    expect(groupAddKinds(2)).toContain("countdown");
  });

  it("keeps Countdown outside Gallery and RSVP composition contracts", () => {
    const countdown = createSectionElement(undefined, "countdown");
    const gallery = { elements: [countdown], order: [{ kind: "specialized" as const, key: "content" as const }, { kind: "element" as const, id: countdown.id }] };
    expect(gallerySectionChildFlowSchema.safeParse(gallery).success).toBe(false);
    expect(rsvpSectionChildFlowSchema.safeParse(gallery).success).toBe(false);
  });

  it("renders the created Countdown as a selectable Structure row", () => {
    const countdown = createSectionElement(undefined, "countdown");
    const flow: SectionChildFlow = { elements: [countdown], order: [{ kind: "element", id: countdown.id }] };
    const html = renderToStaticMarkup(<SectionChildList sectionLabel="Hero" flow={flow} selected={{ kind: "element", id: countdown.id }} allowedGenericTypes={[...full]} onSelect={vi.fn()} onChange={vi.fn()} onRenameSave={vi.fn(async () => null)} onDuplicate={vi.fn()} onDelete={vi.fn()} />);
    expect(html).toContain("Countdown block: Countdown 1");
    expect(html).toContain('aria-current="true"');
  });
});
