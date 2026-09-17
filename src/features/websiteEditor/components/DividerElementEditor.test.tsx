import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { TemplateDesignLibrary } from "../../websiteCapabilities/types";
import { DividerElementEditor } from "./DividerElementEditor";

const library = { colors: [{ id: "accent", displayName: "Accent", value: "#a6553f" }], fontFamilies: [], fontRecommendations: { heading: [], body: [], accent: [] }, palettePresets: [], typographyPresets: [] } as unknown as TemplateDesignLibrary;
const props = { templateKey: "classic-filipiniana-v1", library, allowedColorIds: ["accent"], projectColors: [], onAddColor: async (value: string) => ({ id: "project-color-00000000000000000000000000", value }), onChange: () => undefined };

describe("DividerElementEditor", () => {
  it("always offers color and the locked appearance controls", () => {
    const html = renderToStaticMarkup(<DividerElementEditor {...props} element={{ id: "divider", type: "divider", editorName: "Divider 1" }} />);
    expect(html).toContain("Style");
    expect(html).toContain("Botanical");
    expect(html).not.toContain("Use template");
    expect(html).toContain("Color");
    expect(html).toContain("Width");
    expect(html).toContain("Alignment");
    expect(html).toContain("Opacity");
    expect(html.match(/type="range"/g)).toHaveLength(1);
  });

  it("uses semantic width choices and keeps alignment available", () => {
    const html = renderToStaticMarkup(<DividerElementEditor {...props} element={{ id: "divider", type: "divider", editorName: "Divider 1", appearance: { width: "full" } }} />);
    expect(html).not.toContain('aria-label="Divider width"');
    expect(html).toContain('aria-label="Alignment"');
    expect(html).toMatch(/aria-label="Alignment"[^>]*>[\s\S]*?>Center</);
    expect(html).toContain("Full");
  });

  it("supports every integer opacity between 25 and 100", () => {
    const html = renderToStaticMarkup(<DividerElementEditor {...props} element={{ id: "divider", type: "divider", editorName: "Divider 1", appearance: { opacity: 63 } }} />);
    expect(html).toContain('aria-label="Divider opacity"');
    expect(html).toContain('min="25"');
    expect(html).toContain('max="100"');
    expect(html).toContain('value="63"');
  });
});
