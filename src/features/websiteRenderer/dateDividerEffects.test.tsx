import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { dateElementSchema, dividerElementSchema } from "../websiteElements/schemas";
import { resolveDropShadowEffects } from "../websiteElements/textEffects";
import { DateElementRenderer } from "./DateElementRenderer";
import { DividerElementRenderer } from "./DividerElementRenderer";
const library = { colors: [{ id: "foreground", displayName: "Foreground", value: "#FFFFFF" }, { id: "shadow", displayName: "Shadow", value: "#000000" }, { id: "glow", displayName: "Glow", value: "#FFD700" }], fontFamilies: [], fontRecommendations: { heading: [], body: [], accent: [] }, palettePresets: [], typographyPresets: [] } as never;
const context = { headingFontId: "", bodyFontId: "", headingColorId: "foreground", bodyColorId: "foreground", accentColorId: "foreground" };
describe("Date and Divider effects", () => {
  it("strictly validates their distinct canonical contracts", () => {
    expect(dateElementSchema.safeParse({ id: "date", type: "date", editorName: "Date 1", appearance: { textShadow: "soft", textShadowColorId: "shadow", glow: "strong", glowColorId: "glow" } }).success).toBe(true);
    expect(dividerElementSchema.safeParse({ id: "divider", type: "divider", editorName: "Divider 1", appearance: { shadow: "soft", shadowColorId: "shadow", glow: "strong", glowColorId: "glow" } }).success).toBe(true);
    expect(dateElementSchema.safeParse({ id: "date", type: "date", editorName: "Date 1", appearance: { shadow: "soft" } }).success).toBe(false);
    expect(dividerElementSchema.safeParse({ id: "divider", type: "divider", editorName: "Divider 1", appearance: { textShadow: "soft" } }).success).toBe(false);
  });
  it("renders Date with Text recipes and unchanged semantic geometry", () => {
    const html = renderToStaticMarkup(<DateElementRenderer element={{ id: "date", type: "date", editorName: "Date 1", appearance: { colorId: "foreground", textShadow: "medium", textShadowColorId: "shadow", glow: "soft", glowColorId: "glow" } }} eventDate="2026-12-22" mode="public" viewport="desktop" templateKey="classic-filipiniana-v1" library={library} context={context} />);
    expect(html).toContain("color:#FFFFFF"); expect(html).toContain("text-shadow:0 2px 4px #000000, 0 1px 2px #000000, 0 0 4px #FFD700"); expect(html).toContain('dateTime="2026-12-22"'); expect(html).toContain("padding:0");
  });
  it("composes Divider shadow and glow as silhouette-following filters", () => {
    expect(resolveDropShadowEffects("medium", "#000000", "soft", "#FFD700")).toBe("drop-shadow(0 2px 4px #000000) drop-shadow(0 1px 2px #000000) drop-shadow(0 0 4px #FFD700)");
    const html = renderToStaticMarkup(<DividerElementRenderer element={{ id: "divider", type: "divider", editorName: "Divider 1", appearance: { shadow: "medium", shadowColorId: "shadow", glow: "soft", glowColorId: "glow" } }} templateKey="classic-filipiniana-v1" library={library} context={context} />);
    expect(html).toContain("filter:drop-shadow(0 2px 4px #000000) drop-shadow(0 1px 2px #000000) drop-shadow(0 0 4px #FFD700)"); expect(html).not.toContain("box-shadow");
  });
});
