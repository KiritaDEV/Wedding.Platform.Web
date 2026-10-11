import { describe, expect, it } from "vitest";
import fixtures from "./fixtures/divider-contract.json";
import manifest from "../../../public/template-assets/classic-filipiniana/manifest.json";
import { dividerElementSchema } from "./schemas";
import { dividerAssetsForTemplate, resolveDividerWidthPercent } from "./divider";
import { validateSectionContent } from "../websiteEditor/schemas";

function content(element: unknown, depth: number) {
  let root = element;
  for (let index = 0; index < depth; index++) root = { id: `group-${index}`, type: "compositionGroup", editorName: `Group ${index + 1}`, children: [root] };
  return { semantic: {}, compositions: { shared: { childFlow: { elements: [root], order: [{ kind: "element", id: depth ? `group-${depth - 1}` : "divider-1" }] } } } };
}

describe("Divider canonical contract (mirrored API fixtures)", () => {
  it.each([...fixtures.schemaCases, ...fixtures.jsonShapeCases])("$name", ({ element, valid }) => {
    const parsed = dividerElementSchema.safeParse(element);
    expect(parsed.success).toBe(valid);
    if (parsed.success) expect(parsed.data).toEqual(element);
  });

  describe.each([0, 1, 2])("template validation at Group depth %s", (depth) => {
    it.each(fixtures.templateCases)("$name", ({ element, templateKey, valid }) => {
      const candidate = content(element, depth);
      const parsed = validateSectionContent("blank", candidate, templateKey);
      expect(parsed.success).toBe(valid);
      if (parsed.success) expect(parsed.data).toEqual(candidate);
    });

    it("preserves the complete canonical fixture through JSON hydration", () => {
      const candidate = content(fixtures.schemaCases.find(({ name }) => name === "complete")!.element, depth);
      const parsed = validateSectionContent("blank", JSON.parse(JSON.stringify(candidate)), "classic-filipiniana-v1");
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data).toEqual(candidate);
    });
  });

  it.each([["small", 25], ["medium", 50], ["large", 75], ["full", 100]] as const)("resolves %s to %s percent for all templates", (width, percentage) => {
    expect(resolveDividerWidthPercent(width)).toBe(percentage);
  });

  it("uses only the manifest's canonical Divider IDs and paths", () => {
    expect(dividerAssetsForTemplate("classic-filipiniana-v1").map(({ id, sourcePath }) => ({ id, assetPath: sourcePath }))).toEqual(
      manifest.assets.filter(({ kind }) => kind === "divider").map(({ id, repositoryPath }) => ({ id, assetPath: repositoryPath })),
    );
    expect(dividerAssetsForTemplate("modern-editorial-v1")).toEqual([]);
  });
});
