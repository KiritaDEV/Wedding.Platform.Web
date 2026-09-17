import {
  Children,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { describe, expect, it, vi } from "vitest";
import { Select } from "../../../components/ui/Select";
import { ElementEffectsControl } from "./ElementEffectsControl";

const baseProps = {
  elementId: "text-1",
  state: {},
  colors: [],
  projectColors: [],
  onAddColor: vi.fn(),
  onColorChange: vi.fn(),
};

describe("ElementEffectsControl", () => {
  it("uses a compact dropdown for Text Shadow strength", () => {
    const onEffectChange = vi.fn();
    const tree = ElementEffectsControl({
      ...baseProps,
      shadowLabel: "Text Shadow",
      onEffectChange,
    });
    const shadow = findSelects(tree).find(
      ({ props }) => props["aria-label"] === "Text Shadow",
    );

    expect(shadow?.props.value).toBe("none");
    expect(shadow?.props.options).toEqual([
      { value: "none", label: "None" },
      { value: "soft", label: "Soft" },
      { value: "medium", label: "Medium" },
      { value: "strong", label: "Strong" },
    ]);
    shadow?.props.onChange("strong");
    expect(onEffectChange).toHaveBeenCalledWith("shadow", "strong");
  });

  it("uses a compact dropdown for Glow strength", () => {
    const onEffectChange = vi.fn();
    const tree = ElementEffectsControl({
      ...baseProps,
      shadowLabel: "Text Shadow",
      onEffectChange,
    });
    const glow = findSelects(tree).find(
      ({ props }) => props["aria-label"] === "Glow",
    );

    expect(glow?.props.value).toBe("none");
    expect(glow?.props.options).toEqual([
      { value: "none", label: "None" },
      { value: "soft", label: "Soft" },
      { value: "medium", label: "Medium" },
      { value: "strong", label: "Strong" },
    ]);
    glow?.props.onChange("medium");
    expect(onEffectChange).toHaveBeenCalledWith("glow", "medium");
  });

  it("uses the same compact dropdown for non-text Shadow strength", () => {
    const tree = ElementEffectsControl({
      ...baseProps,
      shadowLabel: "Shadow",
      onEffectChange: vi.fn(),
    });
    const shadow = findSelects(tree).find(
      ({ props }) => props["aria-label"] === "Shadow",
    );
    expect(shadow?.props.value).toBe("none");
    expect(shadow?.props.options).toEqual([
      { value: "none", label: "None" },
      { value: "soft", label: "Soft" },
      { value: "medium", label: "Medium" },
      { value: "strong", label: "Strong" },
    ]);
  });
});

function findSelects(
  node: ReactNode,
): Array<ReactElement<ComponentProps<typeof Select>>> {
  if (Array.isArray(node)) return node.flatMap(findSelects);
  if (!isValidElement(node)) return [];
  const element = node as ReactElement<{ children?: ReactNode }>;
  return [
    ...(element.type === Select
      ? [element as ReactElement<ComponentProps<typeof Select>>]
      : []),
    ...Children.toArray(element.props.children).flatMap(findSelects),
  ];
}
