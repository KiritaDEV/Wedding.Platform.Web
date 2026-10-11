import { describe, expect, it } from "vitest";
import { colorIdForWebsiteColorChoice, selectedWebsiteColorChoiceId, websiteColorChoices } from "./websiteColorSwatches";

const projectColor = { id: "project-color-01KED9H9XR7WQBP4JTKP1YYQ3F", value: "#1A1A1A" };
const templateColors = [
  { id: "classic-heading", displayName: "Classic Heading", value: "#111111" },
  { id: "classic-body", displayName: "Classic Body", value: "#222222" },
];

describe("websiteColorChoices", () => {
  it("orders inherit, role-compatible template colors, project colors, and Add", () => {
    const choices = websiteColorChoices(["classic-heading"], templateColors, [projectColor]);
    expect(choices.map(({ kind }) => kind)).toEqual(["inherit", "template", "project", "add"]);
    expect(choices.map(({ id }) => id)).toEqual([null, "classic-heading", projectColor.id, "add"]);
  });

  it("uses the same capability-driven model for different template catalogs", () => {
    const modern = [{ id: "modern-heading", displayName: "Modern Heading", value: "#333333" }];
    expect(websiteColorChoices(["modern-heading"], modern, [projectColor]).map(({ id }) => id))
      .toEqual([null, "modern-heading", projectColor.id, "add"]);
  });

  it("shows stronger capability-approved backgrounds without changing text filtering or project ordering", () => {
    const classic = [
      { id: "terracotta-canvas", displayName: "Terracotta Canvas", value: "#F8F0E4" },
      { id: "terracotta-accent", displayName: "Terracotta Accent", value: "#9D5B45" },
      { id: "classic-wine-text", displayName: "Wine Text", value: "#5A2635" },
    ];
    const background = websiteColorChoices(["terracotta-canvas", "terracotta-accent"], classic, [projectColor]);
    expect(background.map(({ id }) => id)).toEqual([null, "terracotta-canvas", "terracotta-accent", projectColor.id, "add"]);
    expect(websiteColorChoices(["classic-wine-text"], classic, [projectColor]).map(({ id }) => id))
      .toEqual([null, "classic-wine-text", projectColor.id, "add"]);

    const modern = [{ id: "navy-accent", displayName: "Navy Accent", value: "#263C5A" }];
    expect(websiteColorChoices(["navy-accent"], modern, []).map(({ id }) => id)).toEqual([null, "navy-accent", "add"]);
  });

  it("represents inherit, template, project, and missing selected states", () => {
    const choices = websiteColorChoices(["classic-heading"], templateColors, [projectColor]);
    expect(selectedWebsiteColorChoiceId(undefined, choices)).toBeNull();
    expect(selectedWebsiteColorChoiceId("classic-heading", choices)).toBe("classic-heading");
    expect(selectedWebsiteColorChoiceId(projectColor.id, choices)).toBe(projectColor.id);
    expect(selectedWebsiteColorChoiceId("project-color-01KED9H9XR7WQBP4JTKP1YYQ3G", choices)).toBeUndefined();
  });

  it("maps swatch choices to the existing sparse semantic color contract", () => {
    const choices = websiteColorChoices(["classic-heading"], templateColors, [projectColor]);
    expect(colorIdForWebsiteColorChoice(choices[0] as Extract<(typeof choices)[number], { kind: "inherit" }>)).toBeUndefined();
    expect(colorIdForWebsiteColorChoice(choices[1] as Extract<(typeof choices)[number], { kind: "template" }>)).toBe("classic-heading");
    expect(colorIdForWebsiteColorChoice(choices[2] as Extract<(typeof choices)[number], { kind: "project" }>)).toBe(projectColor.id);
  });
});
