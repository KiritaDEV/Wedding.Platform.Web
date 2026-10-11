import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { genericTextSectionChildFlowSchema } from "../websiteEditor/sectionChildFlow";
import { duplicateSectionElement, findSectionElement, type SectionChildFlow } from "../websiteEditor/sectionChildFlow";
import { PeopleElementRenderer } from "../websiteRenderer/PeopleElementRenderer";
import type { PeopleElement } from "./types";

const people = (): PeopleElement => ({ id: "people", type: "people", editorName: "People 1", groups: [{ id: "group", name: "Friends", people: [{ id: "person", name: "Alex", role: "Friend", media: null }] }] });

describe("People block", () => {
  it("is valid in a Blank root and Group and preserves source ordering", () => {
    const root = { elements: [people()], order: [{ kind: "element" as const, id: "people" }] };
    expect(genericTextSectionChildFlowSchema.parse(root).elements[0]).toEqual(people());
    const nested = { elements: [{ id: "outer", type: "compositionGroup" as const, editorName: "Group 1", children: [people()] }], order: [{ kind: "element" as const, id: "outer" }] };
    expect(genericTextSectionChildFlowSchema.safeParse(nested).success).toBe(true);
  });

  it("regenerates block, group, and person IDs on duplication", () => {
    const flow: SectionChildFlow = { elements: [people()], order: [{ kind: "element", id: "people" }] };
    const result = duplicateSectionElement(flow, "people")!;
    const copy = findSectionElement(result.flow, result.elementId) as PeopleElement;
    expect([copy.id, copy.groups[0].id, copy.groups[0].people[0].id]).not.toContain("people");
    expect(copy.groups[0].id).not.toBe("group");
    expect(copy.groups[0].people[0].id).not.toBe("person");
  });

  it.each(["classic-filipiniana-v1", "modern-editorial-v1"])("uses the shared renderer for %s and omits incomplete public entries", (templateKey) => {
    const element = people();
    element.groups[0].people.push({ id: "incomplete", name: "", role: null, media: null });
    const html = renderToStaticMarkup(<PeopleElementRenderer element={element} mode="public" templateKey={templateKey} media={{}} />);
    expect(html).toContain("data-people-block");
    expect(html).toContain("Alex");
    expect(html).not.toContain("Unnamed person");
  });
});
