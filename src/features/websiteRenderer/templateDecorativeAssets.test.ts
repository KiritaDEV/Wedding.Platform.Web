import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DECORATIVE_CORNER_PLACEMENTS,
  getDecorativeAssetStyle,
  getDecorativeCssFrameStyle,
  resolveDecorativeStrengthOpacity,
} from "./decorativeExecution";
import {
  validateDecorativeAssetDefinition,
  validateDecorativeRegistry,
} from "./decorativeRegistryValidation";
import {
  classicDecorativeAssets,
  modernDecorativeAssets,
  resolveDecorativeAsset,
  resolveDecorativeDefaultStrength,
  resolveDecorativeExecution,
  resolveResponsiveDecorativeSource,
  type TemplateDecorativeAssetDefinition,
} from "./templateDecorativeAssets";

const responsiveAsset: TemplateDecorativeAssetDefinition = {
  id: "test",
  status: "active",
  kind: "frame",
  semanticIntent: "test",
  sourcePath: "/assets/base.svg",
  responsiveVariants: {
    desktop: "/assets/desktop.svg",
    tablet: "/assets/tablet.svg",
    mobile: "/assets/mobile.svg",
  },
  execution: { renderMode: "image" },
};

describe("decorative asset registries", () => {
  it("keeps IDs unique and template semantics distinct", () => {
    for (const registry of [classicDecorativeAssets, modernDecorativeAssets])
      expect(new Set(registry.assets.map(({ id }) => id)).size).toBe(
        registry.assets.length,
      );
    expect(classicDecorativeAssets.mappings.pattern.heritage).toBeNull();
    expect(modernDecorativeAssets.mappings.pattern.geometric).not.toBeNull();
    expect(classicDecorativeAssets.mappings.mediaFrame).toEqual({});
    expect(modernDecorativeAssets.mappings.mediaFrame).toEqual({});
  });
  it("keeps pending and missing assets non-rendering", () => {
    expect(
      resolveDecorativeAsset(
        "classic-filipiniana-v1",
        "pattern",
        "botanical",
        "desktop",
      ),
    ).toBe("/template-assets/classic-filipiniana/patterns/botanical-01.png");
    expect(
      resolveDecorativeAsset(
        "classic-filipiniana-v1",
        "texture",
        "grain",
        "desktop",
      ),
    ).toBeNull();
    expect(resolveDecorativeAsset("classic-filipiniana-v1", "frame", "ornamental", "desktop"))
      .toBe("/template-assets/classic-filipiniana/frames/classic-media-frame-ornamental-corner-01.png");
    expect(
      resolveDecorativeAsset(
        "classic-filipiniana-v1",
        "frame",
        "corners",
        "desktop",
      ),
    ).toBeNull();
    expect(
      resolveDecorativeAsset(
        "modern-editorial-v1",
        "frame",
        "corners",
        "desktop",
      ),
    ).toBeNull();
    expect(
      resolveDecorativeAsset(
        "modern-editorial-v1",
        "frame",
        "missing",
        "desktop",
      ),
    ).toBeNull();
  });
  it("uses mobile, tablet, desktop, base responsive fallback order", () => {
    expect(resolveResponsiveDecorativeSource(responsiveAsset, "mobile")).toBe(
      "/assets/mobile.svg",
    );
    expect(
      resolveResponsiveDecorativeSource(
        {
          ...responsiveAsset,
          responsiveVariants: {
            desktop: "/assets/desktop.svg",
            tablet: "/assets/tablet.svg",
          },
        },
        "mobile",
      ),
    ).toBe("/assets/tablet.svg");
    expect(
      resolveResponsiveDecorativeSource(
        {
          ...responsiveAsset,
          responsiveVariants: { desktop: "/assets/desktop.svg" },
        },
        "tablet",
      ),
    ).toBe("/assets/desktop.svg");
    expect(
      resolveResponsiveDecorativeSource(
        { ...responsiveAsset, responsiveVariants: undefined },
        "desktop",
      ),
    ).toBe("/assets/base.svg");
  });
  it("validates active assets and accepts empty manifests while assets are pending", () => {
    const manifest = JSON.parse(
      readFileSync(
        new URL(
          "../../../public/template-assets/classic-filipiniana/manifest.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    expect(
      validateDecorativeRegistry(classicDecorativeAssets, manifest, (source) =>
        existsSync(new URL(`../../../public${source}`, import.meta.url)),
      ),
    ).toEqual([]);
    expect(
      validateDecorativeRegistry(
        modernDecorativeAssets,
        { templateKey: modernDecorativeAssets.templateKey, assets: [] },
        () => false,
      ),
    ).toEqual([]);
  });
  it("validates bounded metadata and safe repository sources", () => {
    expect(
      validateDecorativeAssetDefinition(
        {
          ...responsiveAsset,
          sourcePath: "https://example.com/x.svg",
          execution: { renderMode: "mask", opacity: 2 },
        },
        "/assets/",
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Unsafe"),
        expect.stringContaining("Opacity"),
        expect.stringContaining("tint"),
      ]),
    );
  });
  it("validates texture strength metadata", () => {
    expect(
      validateDecorativeAssetDefinition(
        {
          ...responsiveAsset,
          kind: "texture",
          execution: {
            renderMode: "image",
            strength: { default: 9, minOpacity: 0.4, maxOpacity: 0.2 },
          },
        },
        "/assets/",
      ),
    ).toContain("Invalid texture strength metadata: test");
  });
});

describe("decorative execution helpers", () => {
  it("resolves the active Classic ornamental Section Frame as a tinted four-corner mask", () => {
    const definition = classicDecorativeAssets.assets.find(
      ({ id }) => id === "classic-media-frame-ornamental-corner-01",
    );
    expect(definition).toMatchObject({
      status: "active",
      kind: "frame",
      semanticIntent: "ornamental",
      execution: {
        renderMode: "mask",
        position: "fourCorners",
        size: "corners",
        tintToken: "decorative",
      },
    });
    const resolved = resolveDecorativeExecution(
      "classic-filipiniana-v1",
      "frame",
      "ornamental",
      "desktop",
    );
    expect(resolved?.type).toBe("asset");
    if (resolved?.type !== "asset") return;
    expect(resolved.source).toBe(
      "/template-assets/classic-filipiniana/frames/classic-media-frame-ornamental-corner-01.png",
    );
    expect(resolved.tint).toBe("var(--cf-secondary)");
    expect(getDecorativeAssetStyle(resolved)).toMatchObject({
      backgroundColor: "var(--cf-secondary)",
      maskSize: "clamp(48px, 8vw, 112px)",
    });
    expect(classicDecorativeAssets.mappings.frame.ornamental).toEqual({
      type: "asset",
      assetId: "classic-media-frame-ornamental-corner-01",
    });
  });
  it.each([
    ["paper", "/template-assets/classic-filipiniana/textures/paper-01.png", 30],
    [
      "fabric",
      "/template-assets/classic-filipiniana/textures/fabric-01.png",
      35,
    ],
  ] as const)(
    "resolves active Classic %s through the shared texture contract",
    (intent, source, defaultStrength) => {
      expect(
        resolveDecorativeAsset(
          "classic-filipiniana-v1",
          "texture",
          intent,
          "desktop",
        ),
      ).toBe(source);
      expect(
        resolveDecorativeDefaultStrength(
          "classic-filipiniana-v1",
          "texture",
          intent,
        ),
      ).toBe(defaultStrength);
      const resolved = resolveDecorativeExecution(
        "classic-filipiniana-v1",
        "texture",
        intent,
        "desktop",
      );
      expect(resolved?.type).toBe("asset");
      if (resolved?.type === "asset") {
        expect(resolved.execution.strength).toBeDefined();
        expect(getDecorativeAssetStyle(resolved).backgroundImage).toBe(
          `url("${source}")`,
        );
      }
    },
  );
  it("can execute a future texture from pending registry metadata without a renderer branch", () => {
    const grain = modernDecorativeAssets.assets.find(
      ({ semanticIntent }) => semanticIntent === "grain",
    );
    expect(grain?.status).toBe("pending");
    expect(grain?.execution.strength).toBeDefined();
    if (!grain?.execution.strength) return;
    const style = getDecorativeAssetStyle({
      type: "asset",
      source: grain.sourcePath,
      tint: null,
      execution: {
        ...grain.execution,
        opacity: resolveDecorativeStrengthOpacity(grain.execution.strength),
      },
    });
    expect(style.backgroundImage).toBe(
      'url("/template-assets/modern-editorial/textures/grain-01.webp")',
    );
    expect(style.backgroundRepeat).toBe("repeat repeat");
  });
  it("maps normalized texture strength through safe opacity bounds and clamps it", () => {
    const strength = { default: 35, minOpacity: 0.06, maxOpacity: 0.28 };
    expect(resolveDecorativeStrengthOpacity(strength, 10)).toBeCloseTo(0.06);
    expect(resolveDecorativeStrengthOpacity(strength, 100)).toBeCloseTo(0.28);
    expect(resolveDecorativeStrengthOpacity(strength, 0)).toBeCloseTo(0.06);
    expect(resolveDecorativeStrengthOpacity(strength, 110)).toBeCloseTo(0.28);
    expect(resolveDecorativeStrengthOpacity(strength)).toBeCloseTo(0.1211, 3);
  });
  it("uses the asset default unless an authored strength overrides it", () => {
    expect(
      resolveDecorativeDefaultStrength(
        "classic-filipiniana-v1",
        "texture",
        "paper",
      ),
    ).toBe(30);
    expect(
      resolveDecorativeDefaultStrength(
        "classic-filipiniana-v1",
        "texture",
        "fabric",
      ),
    ).toBe(35);
    const inherited = resolveDecorativeExecution(
      "classic-filipiniana-v1",
      "texture",
      "fabric",
      "desktop",
    );
    const authored = resolveDecorativeExecution(
      "classic-filipiniana-v1",
      "texture",
      "fabric",
      "desktop",
      100,
    );
    expect(
      inherited?.type === "asset" ? inherited.execution.opacity : null,
    ).toBeCloseTo(0.1211, 3);
    expect(
      authored?.type === "asset" ? authored.execution.opacity : null,
    ).toBeCloseTo(0.28);
  });
  it("uses the shared strength path for Botanical defaults and authored overrides", () => {
    expect(
      resolveDecorativeDefaultStrength(
        "classic-filipiniana-v1",
        "pattern",
        "botanical",
      ),
    ).toBe(45);
    const inherited = resolveDecorativeExecution(
      "classic-filipiniana-v1",
      "pattern",
      "botanical",
      "desktop",
    );
    const authored = resolveDecorativeExecution(
      "classic-filipiniana-v1",
      "pattern",
      "botanical",
      "desktop",
      100,
    );
    expect(
      inherited?.type === "asset" ? inherited.execution.opacity : null,
    ).toBeCloseTo(0.4833, 3);
    expect(
      authored?.type === "asset" ? authored.execution.opacity : null,
    ).toBeCloseTo(0.85);
    expect(inherited?.type === "asset" ? inherited.execution.renderMode : null).toBe("mask");
    expect(inherited?.type === "asset" ? inherited.execution.tintToken : null).toBe("decorative");
    expect(inherited?.type === "asset" ? inherited.tint : null).toBe("var(--cf-secondary)");
    if (inherited?.type === "asset") {
      const style = getDecorativeAssetStyle(inherited);
      expect(style.backgroundImage).toBeUndefined();
      expect(style.backgroundColor).toBe("var(--cf-secondary)");
      expect(style.maskImage).toBe('url("/template-assets/classic-filipiniana/patterns/botanical-01.png")');
      expect(style.maskRepeat).toBe("repeat repeat");
      expect(style.maskSize).toBe("320px");
    }
  });
  it("can execute pending Geometric strength metadata without a renderer branch", () => {
    const geometric = modernDecorativeAssets.assets.find(
      ({ semanticIntent }) => semanticIntent === "geometric",
    );
    expect(geometric?.status).toBe("pending");
    expect(geometric?.execution.strength).toBeDefined();
    if (!geometric?.execution.strength) return;
    const style = getDecorativeAssetStyle({
      type: "asset",
      source: geometric.sourcePath,
      tint: "var(--me-muted)",
      execution: {
        ...geometric.execution,
        opacity: resolveDecorativeStrengthOpacity(geometric.execution.strength),
      },
    });
    expect(style.maskImage).toBe(
      'url("/template-assets/modern-editorial/patterns/geometric-01.svg")',
    );
  });
  it("builds image and tinted mask styles from resolved registry metadata", () => {
    expect(
      getDecorativeAssetStyle({
        type: "asset",
        source: "/assets/a.webp",
        tint: null,
        execution: { renderMode: "image", size: "cover" },
      }).backgroundImage,
    ).toBe('url("/assets/a.webp")');
    const mask = getDecorativeAssetStyle({
      type: "asset",
      source: "/assets/a.svg",
      tint: "var(--accent)",
      execution: { renderMode: "mask", tintToken: "accent" },
    });
    expect(mask.maskImage).toBe('url("/assets/a.svg")');
    expect(mask.backgroundColor).toBe("var(--accent)");
  });
  it("resolves template-specific CSS fine frames", () => {
    const classic = resolveDecorativeExecution(
      "classic-filipiniana-v1",
      "frame",
      "fine",
      "desktop",
    );
    const modern = resolveDecorativeExecution(
      "modern-editorial-v1",
      "frame",
      "fine",
      "desktop",
    );
    expect(classic?.type).toBe("cssFrame");
    expect(modern?.type).toBe("cssFrame");
    if (classic?.type === "cssFrame")
      expect(
        getDecorativeCssFrameStyle(classic.execution, classic.tint).borderWidth,
      ).toBe("1px");
  });
  it.each([
    ["classic-filipiniana-v1", "fine", 1, 0.42],
    ["classic-filipiniana-v1", "ornamental", null, 0.6],
    ["modern-editorial-v1", "fine", 2, 0.28],
  ] as const)("resolves defaults and absolute overrides for %s %s", (templateKey, style, baseWidth, defaultOpacity) => {
    const inherited = resolveDecorativeExecution(templateKey, "frame", style, "desktop");
    expect(inherited?.execution.opacity).toBe(defaultOpacity);
    for (const strength of [0, 25, 50, 100]) {
      const resolved = resolveDecorativeExecution(templateKey, "frame", style, "desktop", undefined, { size: 200, strength, tint: "#123456" });
      expect(resolved?.execution.opacity).toBe(strength / 100);
      expect(resolved?.tint).toBe("#123456");
      if (resolved?.type === "cssFrame") expect(resolved.execution.baseThicknessPx).toBe(baseWidth! * 2);
      if (resolved?.type === "asset") expect(resolved.execution.cornerBaseSize).toEqual({ minimumPx: 96, fluidVw: 16, maximumPx: 224 });
    }
  });
  it("reflects the top-left source into four complete, inward-facing corner orientations", () => {
    expect(DECORATIVE_CORNER_PLACEMENTS).toEqual([
      { key: "top-left", style: { top: 0, left: 0, transform: "none", transformOrigin: "center" } },
      { key: "top-right", style: { top: 0, right: 0, transform: "scaleX(-1)", transformOrigin: "center" } },
      { key: "bottom-right", style: { right: 0, bottom: 0, transform: "scale(-1, -1)", transformOrigin: "center" } },
      { key: "bottom-left", style: { bottom: 0, left: 0, transform: "scaleY(-1)", transformOrigin: "center" } },
    ]);
  });
});
