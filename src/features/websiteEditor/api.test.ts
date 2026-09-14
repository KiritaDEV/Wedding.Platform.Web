import { describe, expect, it } from "vitest";
import { canonicalizeWebsiteSectionContentForApi } from "./api";

describe("Website section API serialization", () => {
  it("does not synthesize obsolete Hero semantic background media", () => {
    const content = {
      semantic: {},
      compositions: { shared: { childFlow: { elements: [], order: [] } } },
    };

    expect(canonicalizeWebsiteSectionContentForApi(content)).toEqual({
      semantic: {},
      compositions: { shared: { childFlow: { elements: [], order: [] } } },
    });
    expect(content.semantic).toEqual({});
  });

  it("removes obsolete authored responsive state from root and nested Group backgrounds", () => {
    const backgroundMedia = { assetId: "01M00000000000000000000000", responsive: { mobile: { assetId: null } } };
    const content = {
      semantic: {},
      compositions: { shared: { childFlow: { elements: [{
        id: "outer", type: "compositionGroup", backgroundMedia, children: [{
          id: "inner", type: "compositionGroup", backgroundMedia, children: [],
        }],
      }], order: [{ kind: "element", id: "outer" }] } } },
    };

    const serialized = canonicalizeWebsiteSectionContentForApi(content);

    const elements = (serialized.compositions as typeof content.compositions).shared.childFlow.elements;
    expect(elements[0].backgroundMedia).toEqual({ assetId: backgroundMedia.assetId });
    expect(elements[0].children[0].backgroundMedia).toEqual({ assetId: backgroundMedia.assetId });
    expect(content.compositions.shared.childFlow.elements[0].backgroundMedia.responsive.mobile).toEqual({ assetId: null });
  });
});
