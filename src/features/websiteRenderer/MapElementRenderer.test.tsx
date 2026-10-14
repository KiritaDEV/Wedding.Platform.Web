import { SURFACE_SHADOW_CSS, SURFACE_SHADOWS } from "./surfaceEffects";
import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MapElementRenderer } from "./MapElementRenderer";
import { isElementRenderable } from "./elementRenderability";
import fixture from "../websiteElements/fixtures/google-maps-contract.json";
const map = {id:"map",type:"map" as const,editorName:"Google Maps",embedUrl:fixture.url};
it("uses controlled attributes and never renders unsafe frames",()=>{
 const html=renderToStaticMarkup(<MapElementRenderer element={map}/>);
 expect(html).toContain('title="Location on Google Maps"');expect(html).toContain('loading="lazy"');expect(html).not.toContain('srcdoc');expect(html).not.toContain('key=');
 for(const embedUrl of fixture.invalid)expect(renderToStaticMarkup(<MapElementRenderer element={{...map,embedUrl}}/>)).toBe("");
});
it("shows empty maps only in the editor and honors visibility",()=>{
 const empty={id:"map",type:"map" as const,editorName:"Map"};expect(isElementRenderable(empty,"modern-editorial-v1","public")).toBe(false);expect(isElementRenderable(empty,"modern-editorial-v1","editor")).toBe(true);
 expect(isElementRenderable({...map,isHidden:true},"modern-editorial-v1","editor")).toBe(false);
 expect(renderToStaticMarkup(<MapElementRenderer element={empty} mode="editor"/>)).toContain('role="status"');expect(renderToStaticMarkup(<MapElementRenderer element={empty}/>)).toBe("");
});
it("supports every radius preset and full available width",()=>{
 for(const [cornerRadius, radius] of [["none",0],["small",8],["medium",16],["large",24]] as const){const html=renderToStaticMarkup(<MapElementRenderer element={{...map,appearance:{cornerRadius}}}/>);expect(html).toContain('border-radius:'+radius+(radius?'px':''));expect(html).toContain('width:100%');expect(html).toContain('overflow:hidden');}
});

it("defaults legacy Map shadow to none and reuses canonical surface CSS",()=>{
 expect(renderToStaticMarkup(<MapElementRenderer element={map}/>)).toContain("box-shadow:none");
 for(const shadow of SURFACE_SHADOWS)expect(renderToStaticMarkup(<MapElementRenderer element={{...map,appearance:{shadow}}}/>)).toContain("box-shadow:"+SURFACE_SHADOW_CSS[shadow]);
});
