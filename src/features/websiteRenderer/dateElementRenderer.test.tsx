import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DateElementRenderer } from "./DateElementRenderer";
import { formatDateOnly } from "./formatDateOnly";

const library = { colors: [{ id: "heading", value: "#123456" }, { id: "accent", value: "#abcdef" }] } as never;
const context = { headingFontId: "", bodyFontId: "", headingColorId: "heading", bodyColorId: "heading", accentColorId: "accent" };

describe("Date block formatting", () => {
  it("preserves the existing default and supports bounded formats", () => {
    expect(formatDateOnly("2026-12-22")).toBe("Tuesday, December 22, 2026");
    expect(formatDateOnly("2026-12-22", { showWeekday: false })).toBe("December 22, 2026");
    expect(formatDateOnly("2026-12-22", { format: "medium" })).toBe("December 22, 2026");
    expect(formatDateOnly("2026-12-22", { format: "short" })).toBe("Dec 22, 2026");
    expect(formatDateOnly("2026-12-22", { format: "numeric" })).toBe("12/22/2026");
  });

  it("applies authored typography, alignment, and color", () => {
    const html = renderToStaticMarkup(<DateElementRenderer element={{ id: "date", type: "date", editorName: "Date 1", appearance: { format: "short", alignment: "end", fontSize: "m", fontWeight: 400, lineHeight: "normal", colorId: "accent" } }} eventDate="2026-12-22" mode="public" viewport="desktop" templateKey="classic-filipiniana-v1" library={library} context={context} />);
    expect(html).toContain("Dec 22, 2026");
    expect(html).toContain("text-align:end");
    expect(html).toContain("display:block");
    expect(html).toContain("font-size:1rem");
    expect(html).toContain("color:#abcdef");
    expect(html).toContain('dateTime="2026-12-22"');
  });

  it("uses live color preview only in editor mode", () => {
    const element = { id: "date", type: "date", editorName: "Date 1", appearance: { colorId: "accent" } } as const;
    const editor = renderToStaticMarkup(<DateElementRenderer element={element} eventDate="2026-12-22" mode="editor" viewport="desktop" previewColor="#fedcba" templateKey="classic-filipiniana-v1" library={library} context={context} />);
    const published = renderToStaticMarkup(<DateElementRenderer element={element} eventDate="2026-12-22" mode="public" viewport="desktop" previewColor="#fedcba" templateKey="classic-filipiniana-v1" library={library} context={context} />);
    expect(editor).toContain("color:#fedcba");
    expect(published).toContain("color:#abcdef");
    expect(published).not.toContain("#fedcba");
  });

  it("uses shared typography fields and responsive overrides", () => {
    const html = renderToStaticMarkup(<DateElementRenderer element={{ id: "date", type: "date", editorName: "Date 1", appearance: { fontSize: "l", fontWeight: 700, lineHeight: "relaxed", letterSpacing: "wide", responsive: { mobile: { fontSize: "s", alignment: "center" } } } }} eventDate="2026-12-22" mode="public" viewport="mobile" templateKey="classic-filipiniana-v1" library={library} context={context} />);
    expect(html).toContain("font-size:0.875rem");
    expect(html).toContain("font-weight:700");
    expect(html).toContain("line-height:1.75");
    expect(html).toContain("letter-spacing:0.08em");
    expect(html).toContain("text-align:center");
  });
});
