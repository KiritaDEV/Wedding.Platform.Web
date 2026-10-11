import { describe, expect, it } from "vitest";
import { projectColorSchema, projectColorsSchema, resolveWebsiteColor } from "./projectColors";

const projectId = "project-color-01KED9H9XR7WQBP4JTKP1YYQ3F";
const library = { colors: [{ id: "terracotta-accent", value: "#9D5B45" }, { id: projectId, value: "#FFFFFF" }] };
const projectColors = [{ id: projectId, value: "#1A1A1A" }] as const;

describe("ProjectColor", () => {
  it("accepts the canonical namespace and uppercase opaque hex", () => {
    expect(projectColorSchema.parse(projectColors[0])).toEqual(projectColors[0]);
  });

  it.each(["custom-01KED9H9XR7WQBP4JTKP1YYQ3F", "project-color-not-a-ulid"])("rejects invalid ID %s", (id) => {
    expect(() => projectColorSchema.parse({ id, value: "#1A1A1A" })).toThrow();
  });

  it.each(["#1a1a1a", "#FFF", "#1A1A1AFF", "red"])("rejects invalid value %s", (value) => {
    expect(() => projectColorSchema.parse({ id: projectId, value })).toThrow();
  });

  it("rejects duplicate values and more than 32 entries", () => {
    expect(() => projectColorsSchema.parse([projectColors[0], { id: "project-color-01KED9H9XR7WQBP4JTKP1YYQ3G", value: "#1A1A1A" }])).toThrow();
    const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    expect(() => projectColorsSchema.parse(Array.from({ length: 33 }, (_, index) => ({
      id: `project-color-01KED9H9XR7WQBP4JTKP1YYQ${alphabet[Math.floor(index / 32)]}${alphabet[index % 32]}`,
      value: `#${index.toString(16).padStart(6, "0").toUpperCase()}`,
    })))).toThrow();
  });
});

describe("resolveWebsiteColor", () => {
  it("resolves template and project namespaces independently", () => {
    expect(resolveWebsiteColor("terracotta-accent", library, projectColors)).toBe("#9D5B45");
    expect(resolveWebsiteColor(projectId, library, projectColors)).toBe("#1A1A1A");
  });

  it("fails safely and never falls across namespaces", () => {
    expect(resolveWebsiteColor("missing-template", library, projectColors)).toBeUndefined();
    expect(resolveWebsiteColor("project-color-01KED9H9XR7WQBP4JTKP1YYQ3G", library, projectColors)).toBeUndefined();
    expect(resolveWebsiteColor(projectId, library, [])).toBeUndefined();
  });
});
