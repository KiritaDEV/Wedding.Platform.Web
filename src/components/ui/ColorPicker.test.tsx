import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ColorPicker } from "./ColorPicker";

describe("ColorPicker", () => {
  it("uses unique React-generated IDs for multiple mounted instances", () => {
    const markup = renderToStaticMarkup(<><ColorPicker value="#111111" onChange={() => undefined} /><ColorPicker value="#222222" onChange={() => undefined} /></>);
    const hueIds = [...markup.matchAll(/id="([^"]+-hue)"/g)].map((match) => match[1]);
    const hexIds = [...markup.matchAll(/id="([^"]+-hex)"/g)].map((match) => match[1]);
    expect(new Set(hueIds).size).toBe(2);
    expect(new Set(hexIds).size).toBe(2);
  });
});
