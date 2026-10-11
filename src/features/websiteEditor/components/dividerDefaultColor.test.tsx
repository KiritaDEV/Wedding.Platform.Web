import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DividerElementEditor } from "./DividerElementEditor";
import { WebsiteColorSwatchControl } from "./WebsiteColorSwatchControl";
import { DividerElementRenderer } from "../../websiteRenderer/DividerElementRenderer";
import { resolveDividerColors } from "../../websiteElements/dividerColor";
import type { DividerElement } from "../../websiteElements/types";
import type { TemplateDesignLibrary } from "../../websiteCapabilities/types";

vi.mock("../../websiteRenderer/decorativeSourceAvailability", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../websiteRenderer/decorativeSourceAvailability")>(),
  useDecorativeSourceAvailability: () => undefined,
}));

const library = { colors: [{ id: "accent", displayName: "Accent", value: "#123456" }, { id: "authored", displayName: "Authored", value: "#ABCDEF" }] } as unknown as TemplateDesignLibrary;
const context = { headingFontId: "", bodyFontId: "", headingColorId: "accent", bodyColorId: "accent", accentColorId: "accent" };
const projectColors = [{ id: "project-color-01KED9H9XR7WQBP4JTKP1YYQ3F", value: "#FEDCBA" }];
const base: DividerElement = { id: "divider", type: "divider", editorName: "Divider 1" };
const props = { templateKey: "classic-filipiniana-v1", library, context, projectColors, allowedColorIds: ["accent", "authored"], onAddColor: vi.fn(async () => projectColors[0]), onChange: vi.fn() };

function swatch(node: ReactNode): ReactElement<ComponentProps<typeof WebsiteColorSwatchControl>> | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<{ children?: ReactNode }>(child)) continue;
    if (child.type === WebsiteColorSwatchControl) return child as ReactElement<ComponentProps<typeof WebsiteColorSwatchControl>>;
    const found = swatch(child.props.children);
    if (found) return found;
  }
}

describe("Divider resolved Default color", () => {
  it.each([undefined, "missing", "authored", projectColors[0].id])("shows renderer-equivalent state for %s without persisting defaults", (colorId) => {
    const element = { ...base, appearance: { colorId } };
    const onChange = vi.fn();
    const tree = DividerElementEditor({ ...props, element, onChange });
    const control = swatch(tree)!;
    const colors = resolveDividerColors(colorId, context, library, projectColors);
    expect(control.props.inheritColor).toBe("#123456");
    expect(control.props.inheritLabel).toBe("Default");
    expect(control.props.colorId).toBe(colors.authoredColor ? colorId : undefined);
    const html = renderToStaticMarkup(tree);
    expect(html).toMatch(/aria-label="Default"[^>]*background-color:#123456/);
    expect(html).not.toContain("Inherited / Default");
    expect(html).not.toContain("The Template color is shown instead");
    if (colorId === "missing") expect(html).toContain("The selected color is unavailable. Default is shown.");
    expect(renderToStaticMarkup(<DividerElementRenderer {...props} element={element} />)).toContain(`background-color:${colors.effectiveColor}`);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("prunes only colorId on Default and preserves canonical custom-color authoring", () => {
    const element: DividerElement = { ...base, appearance: { width: "small", colorId: "authored", opacity: 63 } };
    const onChange = vi.fn();
    const control = swatch(DividerElementEditor({ ...props, element, onChange }))!;
    control.props.onChange(undefined);
    expect(onChange).toHaveBeenLastCalledWith({ ...base, appearance: { width: "small", opacity: 63 } });
    control.props.onChange(projectColors[0].id);
    expect(onChange).toHaveBeenLastCalledWith({ ...element, appearance: { ...element.appearance, colorId: projectColors[0].id } });
    expect(JSON.stringify(onChange.mock.calls)).not.toContain("#");
    const onlyColor = swatch(DividerElementEditor({ ...props, element: { ...base, appearance: { colorId: "authored" } }, onChange }))!;
    onlyColor.props.onChange(undefined);
    expect(onChange).toHaveBeenLastCalledWith({ ...base, appearance: undefined });
  });

  it("uses currentColor only when no resolved default exists", () => {
    const tree = DividerElementEditor({ ...props, context: null, element: base });
    expect(swatch(tree)!.props.inheritColor).toBe("currentColor");
    expect(resolveDividerColors("missing", null, library, projectColors).effectiveColor).toBe("currentColor");
  });

  it("keeps other swatch consumers' inherited control unchanged", () => {
    const html = renderToStaticMarkup(<WebsiteColorSwatchControl label="Other color" allowedTemplateColorIds={[]} templateColors={[]} projectColors={[]} onChange={() => undefined} onAddColor={props.onAddColor} />);
    expect(html).toContain('aria-label="Use Template"');
    expect(html).toContain("lucide-circle-slash");
  });
});
