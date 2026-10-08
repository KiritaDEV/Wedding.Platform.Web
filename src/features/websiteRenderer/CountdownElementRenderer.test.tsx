import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CountdownElement } from "../websiteElements/types";
import { CountdownElementRenderer } from "./CountdownElementRenderer";
import { EventTimingProvider } from "./EventTimingContext";

const library = { colors: [], fontFamilies: [], fontRecommendations: { heading: [], body: [], accent: [] }, palettePresets: [], typographyPresets: [] };
const element: CountdownElement = { id: "countdown", type: "countdown", editorName: "Countdown 1", target: { source: "custom", instant: "2030-01-01T00:00:00Z", timeZone: "UTC" } };
const render = (candidate: CountdownElement, mode: "editor" | "public" = "editor", event: Record<string, string | null> = {}) => renderToStaticMarkup(<EventTimingProvider value={event}><CountdownElementRenderer element={candidate} mode={mode} viewport="desktop" templateKey="classic-filipiniana-v1" library={library} /></EventTimingProvider>);

describe("CountdownElementRenderer", () => {
  it("resolves independently selected project colors for Numbers and Labels", () => {
    const candidate: CountdownElement = { ...element, appearance: {
      numbers: { colorId: "project-color-numbers" },
      labels: { colorId: "project-color-labels" },
    } };
    const html = renderToStaticMarkup(<CountdownElementRenderer element={candidate} mode="editor" viewport="desktop" templateKey="classic-filipiniana-v1" library={library} projectColors={[
      { id: "project-color-numbers", value: "#123456" },
      { id: "project-color-labels", value: "#ABCDEF" },
    ]} />);
    expect(html).toMatch(/color:#123456[^>]*>12</);
    expect(html).toMatch(/color:#ABCDEF[^>]*>Days</);
  });

  it("uses the exact frozen Edit sample and stable accessible timer semantics", () => {
    const html = render(element);
    expect(html).toContain('role="timer"');
    expect(html).toContain('aria-live="off"');
    expect(html).toContain('aria-label="12 days, 8 hours, 34 minutes, 56 seconds"');
    expect(html).toContain('font-variant-numeric:tabular-nums');
    expect(html).toContain('>12<');
    expect(html).toContain('>08<');
    expect(html).toContain('>34<');
    expect(html).toContain('>56<');
  });
  it("renders only enabled units", () => {
    const html = render({ ...element, units: { days: false, seconds: false } });
    expect(html).not.toContain('>Days<');
    expect(html).toContain('>Hours<');
    expect(html).toContain('>Minutes<');
    expect(html).not.toContain('>Seconds<');
  });
  it("omits an unresolved Event target at runtime and shows an Edit configuration state", () => {
    const eventElement: CountdownElement = { ...element, target: { source: "event" } };
    expect(render(eventElement, "public")).toBe("");
    expect(render(eventElement, "editor")).toContain("Set the Event date and start time");
  });
});
