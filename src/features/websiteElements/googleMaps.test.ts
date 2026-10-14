import { expect, it } from "vitest";
import fixture from "./fixtures/google-maps-contract.json";
import { validateGoogleMapsUrl } from "./googleMaps";
import { mapElementSchema, websiteElementSchema } from "./schemas";
import { createSectionElement, duplicateWebsiteElement } from "../websiteEditor/sectionChildFlow";
import { createCustomSectionComposition } from "../websiteEditor/compositionLifecycle";
import { groupAddKinds } from "../websiteEditor/components/sectionChildListHelpers";
import { rootAddElementItems } from "../websiteEditor/components/rootAddElementItems";

it.each(fixture.valid)("accepts and preserves %s", (url) => { expect(validateGoogleMapsUrl(url)).toBe(url); expect(mapElementSchema.parse({ id: "map", type: "map", editorName: "Map", embedUrl: url }).embedUrl).toBe(url); });
it.each(fixture.invalid)("rejects %s", (embedUrl) => { expect(validateGoogleMapsUrl(embedUrl)).toBeNull(); expect(mapElementSchema.safeParse({ id: "map", type: "map", editorName: "Map", embedUrl }).success).toBe(false); });
it("inserts empty maps, duplicates canonical data and respects Group depth", () => {
 const empty = createSectionElement(undefined, "map"); expect(empty).toMatchObject({type:"map",editorName:"Google Maps 1"}); expect(mapElementSchema.safeParse(empty).success).toBe(true);
 const map = {...empty, embedUrl:fixture.url}; const copy = duplicateWebsiteElement({elements:[map],order:[{kind:"element",id:map.id}]}, map); expect(copy.id).not.toBe(map.id); expect(copy).toMatchObject({embedUrl:fixture.url});
 const group = (id:string, children:unknown[]) => ({id,type:"compositionGroup",editorName:"Group",children});
 expect(websiteElementSchema.safeParse(group("g1",[group("g2",[map])])).success).toBe(true);
 expect(websiteElementSchema.safeParse(group("g1",[group("g2",[group("g3",[map])])])).success).toBe(false);
 expect(groupAddKinds(2)).toContain("map"); expect(groupAddKinds(2)).not.toContain("group"); expect(rootAddElementItems(["map"])).toEqual([{type:"map",label:"Google Maps"}]);
});
it("copies independent map content for custom compositions", () => {
 const map = {id:"map",type:"map" as const,editorName:"Map",embedUrl:fixture.url};
 const original = {semantic:{},compositions:{shared:{childFlow:{elements:[map],order:[{kind:"element" as const,id:"map"}]}}}};
 const next = createCustomSectionComposition(original,"mobile");const copied=next.compositions.custom!.mobile!.childFlow.elements[0]; expect(copied.id).not.toBe(map.id); expect(copied).toMatchObject({embedUrl:fixture.url}); expect(original.compositions.shared.childFlow.elements[0]).toEqual(map);
});
it("rejects raw markup, attributes and invalid appearance", () => {for(const extra of [{html:fixture.iframe},{srcdoc:"bad"},{appearance:{height:"huge"}},{appearance:{cornerRadius:5}},{appearance:[]}]) expect(mapElementSchema.safeParse({id:"map",type:"map",editorName:"Map",...extra}).success).toBe(false);});

it.each(["small", "medium", "large", "full"] as const)("round-trips Map width %s and owns custom widths independently", (width) => {
 const map = { id:"map", type:"map" as const, editorName:"Map", embedUrl:fixture.url, appearance:{width} };
 expect(mapElementSchema.parse(map)).toEqual(map);
 const original={semantic:{},compositions:{shared:{childFlow:{elements:[map],order:[{kind:"element" as const,id:"map"}]}}}};
 const next=createCustomSectionComposition(original,"mobile");
 const copy=next.compositions.custom!.mobile!.childFlow.elements[0];expect(copy).toMatchObject({appearance:{width}});
 if(copy.type!=="map")throw Error("Expected Map");copy.appearance!.width=width==="small"?"large":"small";
 expect(original.compositions.shared.childFlow.elements[0].appearance.width).toBe(width);
});
it.each(["wide", "320px", "100%", "", 320, null, false, {}])("rejects invalid Map width %j", (width) => {
 expect(mapElementSchema.safeParse({id:"map",type:"map",editorName:"Map",appearance:{width}}).success).toBe(false);
});
it("keeps legacy and newly created Map width sparse", () => {
 expect(mapElementSchema.parse({id:"map",type:"map",editorName:"Map"})).not.toHaveProperty("appearance");
 expect(createSectionElement(undefined,"map")).not.toHaveProperty("appearance.width");
});

it.each(["none", "soft", "medium", "strong"] as const)("preserves Map shadow %s through duplication and custom ownership", (shadow) => {
 const map={id:"map",type:"map" as const,editorName:"Map",embedUrl:fixture.url,appearance:{shadow}};
 expect(mapElementSchema.parse(map)).toEqual(map);
 const flow={elements:[map],order:[{kind:"element" as const,id:"map"}]};expect(duplicateWebsiteElement(flow,map)).toMatchObject({appearance:{shadow}});
 const original={semantic:{},compositions:{shared:{childFlow:flow}}};
 const custom=createCustomSectionComposition(original,"mobile");const copy=custom.compositions.custom!.mobile!.childFlow.elements[0];
 expect(copy).toMatchObject({appearance:{shadow}});if(copy.type!=="map")throw Error("Expected Map");copy.appearance!.shadow=shadow==="strong"?"none":"strong";
 expect(original.compositions.shared.childFlow.elements[0].appearance.shadow).toBe(shadow);
});
it.each(["subtle", "heavy", "", null, 1, false, {}, []])("rejects invalid Map shadow %j", (shadow) => {
 expect(mapElementSchema.safeParse({id:"map",type:"map",editorName:"Map",appearance:{shadow}}).success).toBe(false);
});
