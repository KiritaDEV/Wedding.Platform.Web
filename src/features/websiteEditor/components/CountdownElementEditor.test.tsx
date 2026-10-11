import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { CountdownElement } from "../../websiteElements/types";
import { friendlyFontWeightOptions } from "../../websiteElements/textAppearance";
import { platformFont } from "../../websiteFonts/platformFonts";
import { CountdownElementEditor } from "./CountdownElementEditor";

const library = { colors: [], fontFamilies: [{ ...platformFont("inter")!, allowedRoles: ["heading", "body"] as Array<"heading" | "body"> }], fontRecommendations: { heading: [], body: [], accent: [] }, palettePresets: [], typographyPresets: [] };
const element: CountdownElement = { id: "countdown", type: "countdown", editorName: "Countdown 1", target: { source: "event" } };

function render(candidate: CountdownElement = element) {
  return renderToStaticMarkup(<CountdownElementEditor onAddColor={vi.fn()} element={candidate} viewport="desktop" library={library} allowedFontIds={["inter"]} allowedColorIds={[]} projectColors={[]} context={{ bodyFontId: "inter" } as never} onChange={vi.fn()} />);
}

describe("Countdown visible-unit controls", () => {
  it("renders the four unit choices as switches rather than checkboxes", () => {
    const html = render();
    const visibleUnits = html.match(/>Visible units<\/h3>([\s\S]*?)>Labels<\/h3>/)?.[1] ?? "";
    expect(visibleUnits.match(/role="switch"/g)).toHaveLength(4);
    for (const label of ["Days", "Hours", "Minutes", "Seconds"]) expect(visibleUnits).toContain(`aria-label="${label}"`);
  });

  it("disables the final visible unit switch", () => {
    const html = render({ ...element, units: { hours: false, minutes: false, seconds: false } });
    expect(html).toMatch(/<button(?=[^>]*role="switch")(?=[^>]*aria-label="Days")(?=[^>]*disabled="")[^>]*>/);
  });
});

describe("Countdown font weight controls", () => {
  it("omits Number case controls and uses Text formatting buttons and effect color pickers", () => {
    const html = render({ ...element, appearance: { numbers: { italic: true, underline: true, textShadow: "soft", glow: "medium" } } });
    const numbers = html.split(">Numbers</h3>")[1]?.split(">Labels</h3>")[0] ?? "";
    expect(numbers).not.toContain("Text transform");
    expect(numbers).toMatch(/aria-label="Italic" aria-pressed="true"/);
    expect(numbers).toMatch(/aria-label="Underline" aria-pressed="true"/);
    expect(numbers).toMatch(/aria-label="Strikethrough" aria-pressed="false"/);
    expect(numbers).not.toContain('type="checkbox"');
    expect(numbers).toContain('aria-label="Text Shadow"');
    expect(numbers).toContain('role="radiogroup" aria-label="Shadow Color"');
    expect(numbers).toContain('role="radiogroup" aria-label="Glow Color"');
    expect(numbers.match(/aria-label="Add color"/g)).toHaveLength(3);
  });

  it("uses the Text swatch picker with custom-color actions for both typography roles", () => {
    const html = render();
    expect(html).toContain('role="radiogroup" aria-label="Numbers color"');
    expect(html).toContain('role="radiogroup" aria-label="Labels color"');
    expect(html.match(/aria-label="Add color"/g)).toHaveLength(2);
  });

  it("uses the canonical Text font-weight labels for Numbers and Labels", () => {
    const html = render();
    expect(friendlyFontWeightOptions("inter")).toEqual([
      { value: "400", label: "Normal" },
      { value: "600", label: "Semi-bold" },
      { value: "700", label: "Bold" },
    ]);
    expect(html).toMatch(/aria-label="Numbers font weight"[^>]*>[\s\S]*?>Bold</);
    expect(html).toMatch(/aria-label="Labels font weight"[^>]*>[\s\S]*?>Normal</);
  });
});
