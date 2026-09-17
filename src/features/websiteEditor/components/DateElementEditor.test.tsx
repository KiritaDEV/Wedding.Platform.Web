import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { Select } from "../../../components/ui/Select";
import type { TemplateDesignLibrary } from "../../websiteCapabilities/types";
import { DateElementEditor } from "./DateElementEditor";
import { FONT_SIZE_OPTIONS } from "./fontSizeOptions";

const library = { colors: [], fontFamilies: [], fontRecommendations: { heading: [], body: [], accent: [] }, palettePresets: [], typographyPresets: [] } as unknown as TemplateDesignLibrary;
const props = { viewport: "desktop" as const, templateKey: "classic-filipiniana-v1", library, allowedFontIds: [], allowedColorIds: [], projectColors: [], context: null, onAddColor: vi.fn(), onChange: vi.fn() };

describe("DateElementEditor typography", () => {
  it("starts directly with canonical typography controls", () => {
    const tree = DateElementEditor({ ...props, element: { id: "date", type: "date", editorName: "Date 1" } });
    const html = JSON.stringify(tree);
    expect(html).not.toContain("Text Style");
    expect(html).toContain("Font family");
  });
  it("uses the shared Font size dropdown and persists an exact-device value", () => {
    const onChange = vi.fn();
    const tree = DateElementEditor({ ...props, viewport: "mobile", onChange, element: { id: "date", type: "date", editorName: "Date 1" } });
    const fontSize = findSelects(tree).find(({ props: selectProps }) => selectProps["aria-label"] === "Font size");
    expect(fontSize?.props.options).toEqual(FONT_SIZE_OPTIONS);
    expect(fontSize?.props.value).toBe("l");
    fontSize?.props.onChange("7xl");
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ appearance: { responsive: { mobile: { fontSize: "7xl" } } } }));
  });
  it("uses a compact line-height dropdown with the Date default", () => {
    const tree = DateElementEditor({ ...props, element: { id: "date", type: "date", editorName: "Date 1" } });
    const lineHeight = findSelects(tree).find(({ props: selectProps }) => selectProps["aria-label"] === "Line height");
    expect(lineHeight?.props.value).toBe("tight");
    expect(lineHeight?.props.options).toEqual([
      { value: "tight", label: "Tight" },
      { value: "normal", label: "Normal" },
      { value: "relaxed", label: "Relaxed" },
    ]);
  });
  it("uses a compact letter-spacing dropdown", () => {
    const tree = DateElementEditor({ ...props, element: { id: "date", type: "date", editorName: "Date 1" } });
    const letterSpacing = findSelects(tree).find(({ props: selectProps }) => selectProps["aria-label"] === "Letter spacing");
    expect(letterSpacing?.props.value).toBe("normal");
    expect(letterSpacing?.props.options).toEqual([
      { value: "tight", label: "Tight" },
      { value: "normal", label: "Normal" },
      { value: "wide", label: "Wide" },
    ]);
  });
  it("uses a compact alignment dropdown", () => {
    const tree = DateElementEditor({ ...props, element: { id: "date", type: "date", editorName: "Date 1" } });
    const alignment = findSelects(tree).find(({ props: selectProps }) => selectProps["aria-label"] === "Alignment");
    expect(alignment?.props.value).toBe("start");
    expect(alignment?.props.options).toEqual([
      { value: "start", label: "Start" },
      { value: "center", label: "Center" },
      { value: "end", label: "End" },
    ]);
  });
});

function findSelects(node: ReactNode): Array<ReactElement<ComponentProps<typeof Select>>> {
  if (Array.isArray(node)) return node.flatMap(findSelects);
  if (!isValidElement(node)) return [];
  const element = node as ReactElement<{ children?: ReactNode }>;
  return [...(element.type === Select ? [element as ReactElement<ComponentProps<typeof Select>>] : []), ...Children.toArray(element.props.children).flatMap(findSelects)];
}
