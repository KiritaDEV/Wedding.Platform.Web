import type { CSSProperties } from "react";
import type { ResponsiveViewport } from "../websiteEditor/types";
import { resolveDecorativeStrengthOpacity } from "./decorativeExecution";

export type DecorativeAssetKind =
  | "texture"
  | "pattern"
  | "frame"
  | "divider"
  | "edge";
export type DecorativeRenderMode = "image" | "mask";
export type DecorativeBlendMode =
  | "normal"
  | "multiply"
  | "soft-light"
  | "overlay";
export type DecorativeAssetSize =
  | "auto"
  | "cover"
  | "contain"
  | "tileSmall"
  | "tileMedium"
  | "tileLarge"
  | "fullFrame"
  | "corners";
export type DecorativeAssetPosition =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "fourCorners";
export type DecorativeTintToken =
  | "accent"
  | "heading"
  | "body"
  | "muted"
  | "decorative";
export type DecorativeStrength = {
  default: number;
  minOpacity: number;
  maxOpacity: number;
};
export type DecorativeAssetExecution = {
  renderMode: DecorativeRenderMode;
  opacity?: number;
  strength?: DecorativeStrength;
  blendMode?: DecorativeBlendMode;
  size?: DecorativeAssetSize;
  position?: DecorativeAssetPosition;
  tintToken?: DecorativeTintToken;
  repeat?: { x: boolean; y: boolean };
  cornerBaseSize?: { minimumPx: number; fluidVw: number; maximumPx: number };
};
export type DecorativeCssFrameExecution = {
  baseThicknessPx: number;
  inset: "small" | "medium";
  opacity: number;
  tintToken: DecorativeTintToken;
};
export type TemplateDecorativeAssetDefinition = {
  id: string;
  status: "pending" | "active";
  kind: DecorativeAssetKind;
  semanticIntent: string;
  label?: string;
  intrinsicWidth?: number;
  intrinsicHeight?: number;
  sourcePath: string;
  responsiveVariants?: Partial<Record<ResponsiveViewport, string>>;
  execution: DecorativeAssetExecution;
};
export type DecorativeSemanticMapping =
  | { type: "asset"; assetId: string }
  | { type: "cssFrame"; execution: DecorativeCssFrameExecution }
  | null;
export type TemplateDecorativeAssetRegistry = {
  templateKey: string;
  assetRoot: string;
  tintTokens: Readonly<Record<DecorativeTintToken, string>>;
  defaultAssetIds?: Partial<Record<DecorativeAssetKind, string>>;
  assets: readonly TemplateDecorativeAssetDefinition[];
  mappings: {
    texture: Readonly<Record<string, DecorativeSemanticMapping>>;
    pattern: Readonly<Record<string, DecorativeSemanticMapping>>;
    frame: Readonly<Record<string, DecorativeSemanticMapping>>;
    mediaFrame: Readonly<Record<string, DecorativeSemanticMapping>>;
  };
  overlays: Readonly<Record<string, CSSProperties | null>>;
};
export type ResolvedDecorativeAsset = {
  type: "asset";
  source: string;
  intrinsicWidth?: number;
  intrinsicHeight?: number;
  execution: DecorativeAssetExecution;
  tint: string | null;
};
export type ResolvedDecorativeExecution =
  | ResolvedDecorativeAsset
  | { type: "cssFrame"; execution: DecorativeCssFrameExecution; tint: string };

export type DecorativeExecutionOverrides = {
  size?: number;
  strength?: number;
  tint?: string;
};

const pending = (
  definition: Omit<TemplateDecorativeAssetDefinition, "status">,
): TemplateDecorativeAssetDefinition => ({ ...definition, status: "pending" });

export const classicDecorativeAssets: TemplateDecorativeAssetRegistry = {
  templateKey: "classic-filipiniana-v1",
  defaultAssetIds: { divider: "classic-divider-botanical-vine" },
  assetRoot: "/template-assets/classic-filipiniana/",
  tintTokens: {
    accent: "var(--cf-section-accent)",
    heading: "var(--cf-text)",
    body: "var(--cf-section-body)",
    muted: "var(--cf-muted)",
    decorative: "var(--cf-secondary)",
  },
  assets: [
    { id: "classic-divider-botanical-vine", label: "Botanical", status: "active", kind: "divider", semanticIntent: "ornament", sourcePath: "/template-assets/classic-filipiniana/dividers/botanical-vine.png", intrinsicWidth: 2116, intrinsicHeight: 328, execution: { renderMode: "mask", size: "contain", position: "center", tintToken: "accent" } },
    { id: "classic-divider-filigree-center", label: "Filigree", status: "active", kind: "divider", semanticIntent: "ornament", sourcePath: "/template-assets/classic-filipiniana/dividers/filigree-center.png", intrinsicWidth: 2134, intrinsicHeight: 340, execution: { renderMode: "mask", size: "contain", position: "center", tintToken: "accent" } },
    { id: "classic-divider-floral-silhouette", label: "Floral Flourish", status: "active", kind: "divider", semanticIntent: "ornament", sourcePath: "/template-assets/classic-filipiniana/dividers/floral-silhouette.png", intrinsicWidth: 2095, intrinsicHeight: 284, execution: { renderMode: "mask", size: "contain", position: "center", tintToken: "accent" } },
    { id: "classic-divider-ornamental-flourish", label: "Ornamental Centerpiece", status: "active", kind: "divider", semanticIntent: "ornament", sourcePath: "/template-assets/classic-filipiniana/dividers/ornamental-flourish.png", intrinsicWidth: 2154, intrinsicHeight: 345, execution: { renderMode: "mask", size: "contain", position: "center", tintToken: "accent" } },
    {
      id: "classic-paper-01",
      status: "active",
      kind: "texture",
      semanticIntent: "paper",
      sourcePath: "/template-assets/classic-filipiniana/textures/paper-01.png",
      execution: {
        renderMode: "image",
        strength: { default: 30, minOpacity: 0.08, maxOpacity: 0.35 },
        blendMode: "multiply",
        size: "tileMedium",
        position: "center",
        repeat: { x: true, y: true },
      },
    },
    {
      id: "classic-fabric-01",
      status: "active",
      kind: "texture",
      semanticIntent: "fabric",
      sourcePath: "/template-assets/classic-filipiniana/textures/fabric-01.png",
      execution: {
        renderMode: "image",
        strength: { default: 35, minOpacity: 0.06, maxOpacity: 0.28 },
        blendMode: "multiply",
        size: "tileLarge",
        position: "center",
        repeat: { x: true, y: true },
      },
    },
    {
      id: "classic-botanical-01",
      status: "active",
      kind: "pattern",
      semanticIntent: "botanical",
      sourcePath:
        "/template-assets/classic-filipiniana/patterns/botanical-01.png",
      execution: {
        renderMode: "mask",
        strength: { default: 45, minOpacity: 0.25, maxOpacity: 0.85 },
        blendMode: "normal",
        size: "tileLarge",
        position: "center",
        tintToken: "decorative",
        repeat: { x: true, y: true },
      },
    },
    {
      id: "classic-media-frame-ornamental-corner-01",
      status: "active",
      kind: "frame",
      semanticIntent: "ornamental",
      sourcePath:
        "/template-assets/classic-filipiniana/frames/classic-media-frame-ornamental-corner-01.png",
      execution: {
        renderMode: "mask",
        opacity: 0.6,
        size: "corners",
        cornerBaseSize: { minimumPx: 48, fluidVw: 8, maximumPx: 112 },
        position: "fourCorners",
        tintToken: "decorative",
      },
    },
  ],
  mappings: {
    texture: {
      none: null,
      paper: { type: "asset", assetId: "classic-paper-01" },
      fabric: { type: "asset", assetId: "classic-fabric-01" },
      grain: null,
    },
    pattern: {
      none: null,
      botanical: { type: "asset", assetId: "classic-botanical-01" },
      heritage: null,
    },
    frame: {
      none: null,
      fine: {
        type: "cssFrame",
        execution: {
          baseThicknessPx: 1,
          inset: "medium",
          opacity: 0.42,
          tintToken: "decorative",
        },
      },
      ornamental: { type: "asset", assetId: "classic-media-frame-ornamental-corner-01" },
    },
    mediaFrame: {},
  },
  overlays: {
    none: null,
    soft: {
      backgroundColor: "rgb(255 248 238 / 16%)",
      mixBlendMode: "soft-light",
    },
    warm: { backgroundColor: "rgb(154 79 42 / 13%)", mixBlendMode: "multiply" },
    deep: { backgroundColor: "rgb(55 34 25 / 17%)", mixBlendMode: "multiply" },
  },
};

export const modernDecorativeAssets: TemplateDecorativeAssetRegistry = {
  templateKey: "modern-editorial-v1",
  assetRoot: "/template-assets/modern-editorial/",
  tintTokens: {
    accent: "var(--me-section-accent)",
    heading: "var(--me-text)",
    body: "var(--me-section-body)",
    muted: "var(--me-muted)",
    decorative: "var(--me-section-accent)",
  },
  assets: [
    pending({
      id: "modern-grain-01",
      kind: "texture",
      semanticIntent: "grain",
      sourcePath: "/template-assets/modern-editorial/textures/grain-01.webp",
      execution: {
        renderMode: "image",
        strength: { default: 30, minOpacity: 0.03, maxOpacity: 0.26 },
        blendMode: "soft-light",
        size: "tileMedium",
        position: "center",
        repeat: { x: true, y: true },
      },
    }),
    pending({
      id: "modern-geometric-01",
      kind: "pattern",
      semanticIntent: "geometric",
      sourcePath: "/template-assets/modern-editorial/patterns/geometric-01.svg",
      execution: {
        renderMode: "mask",
        strength: { default: 30, minOpacity: 0.04, maxOpacity: 0.22 },
        size: "tileLarge",
        position: "center",
        tintToken: "muted",
        repeat: { x: true, y: true },
      },
    }),
  ],
  mappings: {
    texture: {
      none: null,
      paper: null,
      grain: { type: "asset", assetId: "modern-grain-01" },
    },
    pattern: {
      none: null,
      geometric: { type: "asset", assetId: "modern-geometric-01" },
      botanical: null,
    },
    frame: {
      none: null,
      fine: {
        type: "cssFrame",
        execution: {
          baseThicknessPx: 2,
          inset: "small",
          opacity: 0.28,
          tintToken: "muted",
        },
      },
    },
    mediaFrame: {},
  },
  overlays: {
    none: null,
    soft: {
      backgroundColor: "rgb(255 255 255 / 11%)",
      mixBlendMode: "soft-light",
    },
    deep: { backgroundColor: "rgb(15 23 42 / 14%)", mixBlendMode: "multiply" },
  },
};

export const decorativeAssetRegistries: Readonly<
  Record<string, TemplateDecorativeAssetRegistry>
> = {
  [classicDecorativeAssets.templateKey]: classicDecorativeAssets,
  [modernDecorativeAssets.templateKey]: modernDecorativeAssets,
};

export function resolveResponsiveDecorativeSource(
  asset: TemplateDecorativeAssetDefinition,
  viewport: ResponsiveViewport,
): string {
  const variants = asset.responsiveVariants;
  if (viewport === "mobile")
    return (
      variants?.mobile ??
      variants?.tablet ??
      variants?.desktop ??
      asset.sourcePath
    );
  if (viewport === "tablet")
    return variants?.tablet ?? variants?.desktop ?? asset.sourcePath;
  return variants?.desktop ?? asset.sourcePath;
}

export function resolveDecorativeExecution(
  templateKey: string,
  kind: "texture" | "pattern" | "frame" | "mediaFrame",
  semanticIntent: string | undefined,
  viewport: ResponsiveViewport,
  authoredStrength?: number,
  overrides?: DecorativeExecutionOverrides,
): ResolvedDecorativeExecution | null {
  if (!semanticIntent) return null;
  const registry = decorativeAssetRegistries[templateKey];
  const mapping = registry?.mappings[kind][semanticIntent];
  if (!registry || !mapping) return null;
  if (mapping.type === "cssFrame")
    return {
      type: "cssFrame",
      execution: {
        ...mapping.execution,
        baseThicknessPx: mapping.execution.baseThicknessPx * ((overrides?.size ?? 100) / 100),
        opacity: overrides?.strength === undefined ? mapping.execution.opacity : overrides.strength / 100,
      },
      tint: overrides?.tint ?? registry.tintTokens[mapping.execution.tintToken],
    };
  const resolved = resolveDecorativeExecutionById(templateKey, mapping.assetId, viewport, authoredStrength);
  if (!resolved) return null;
  const execution = { ...resolved.execution };
  if (overrides?.strength !== undefined) execution.opacity = overrides.strength / 100;
  if (execution.cornerBaseSize && overrides?.size !== undefined) {
    const scale = overrides.size / 100;
    const { minimumPx, fluidVw, maximumPx } = execution.cornerBaseSize;
    execution.cornerBaseSize = { minimumPx: minimumPx * scale, fluidVw: fluidVw * scale, maximumPx: maximumPx * scale };
  }
  return { ...resolved, execution, tint: overrides?.tint ?? resolved.tint };
}

export function resolveDecorativeExecutionById(templateKey: string, assetId: string, viewport: ResponsiveViewport = "desktop", authoredStrength?: number, tintTokens?: Partial<Record<DecorativeTintToken, string>>): ResolvedDecorativeAsset | null {
  const registry = decorativeAssetRegistries[templateKey];
  const asset = registry?.assets.find(({ id }) => id === assetId);
  if (!asset || asset.status !== "active") return null;
  const execution = asset.execution.strength
    ? {
        ...asset.execution,
        opacity: resolveDecorativeStrengthOpacity(
          asset.execution.strength,
          authoredStrength,
        ),
      }
    : asset.execution;
  return {
    type: "asset",
    source: resolveResponsiveDecorativeSource(asset, viewport),
    intrinsicWidth: asset.intrinsicWidth,
    intrinsicHeight: asset.intrinsicHeight,
    execution,
    tint: execution.tintToken ? tintTokens?.[execution.tintToken] ?? registry.tintTokens[execution.tintToken] : null,
  };
}

export function resolveDecorativeDefaultStrength(
  templateKey: string,
  kind: "texture" | "pattern",
  semanticIntent: string | undefined,
): number {
  const registry = decorativeAssetRegistries[templateKey];
  const mapping = semanticIntent
    ? registry?.mappings[kind][semanticIntent]
    : null;
  if (!registry || mapping?.type !== "asset") return 50;
  return (
    registry.assets.find(({ id }) => id === mapping.assetId)?.execution.strength
      ?.default ?? 50
  );
}

export function resolveFrameDefaults(templateKey: string, semanticIntent: string | undefined): { size: number; strength: number; tint: string } {
  const registry = decorativeAssetRegistries[templateKey];
  const mapping = semanticIntent ? registry?.mappings.frame[semanticIntent] : null;
  if (!registry || !mapping) return { size: 100, strength: 100, tint: 'currentColor' };
  if (mapping.type === 'cssFrame') return { size: 100, strength: Math.round(mapping.execution.opacity * 100), tint: registry.tintTokens[mapping.execution.tintToken] };
  const asset = registry.assets.find(({ id }) => id === mapping.assetId);
  return { size: 100, strength: Math.round((asset?.execution.opacity ?? 1) * 100), tint: asset?.execution.tintToken ? registry.tintTokens[asset.execution.tintToken] : 'currentColor' };
}

export function resolveDecorativeAsset(
  templateKey: string,
  kind: "texture" | "pattern" | "frame" | "mediaFrame",
  semanticIntent: string,
  viewport: ResponsiveViewport,
): string | null {
  const resolved = resolveDecorativeExecution(
    templateKey,
    kind,
    semanticIntent,
    viewport,
  );
  return resolved?.type === "asset" ? resolved.source : null;
}
export function resolveDecorativeOverlayStyle(
  templateKey: string,
  semanticIntent: string | undefined,
): CSSProperties | null {
  return semanticIntent
    ? (decorativeAssetRegistries[templateKey]?.overlays[semanticIntent] ?? null)
    : null;
}
export const SECTION_DECORATIVE_LAYER_ORDER = [
  "base",
  "backgroundImage",
  "texture",
  "pattern",
  "overlay",
  "content",
  "frame",
  "foregroundEdge",
] as const;
