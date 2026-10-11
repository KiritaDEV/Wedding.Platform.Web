import type { ResponsiveViewport } from "../websiteEditor/types";
import { getDecorativeAssetStyle } from "./decorativeExecution";
import { resolveDecorativeExecution } from "./templateDecorativeAssets";

export type DecorativeBackgroundAppearance = { texture?: string; textureStrength?: number; pattern?: string; patternStrength?: number };

export function DecorativeBackgroundLayers({ templateKey, appearance, viewport, className = "" }: { templateKey: string; appearance?: DecorativeBackgroundAppearance; viewport: ResponsiveViewport; className?: string }) {
  const texture = resolveDecorativeExecution(templateKey, "texture", appearance?.texture, viewport, appearance?.textureStrength);
  const pattern = resolveDecorativeExecution(templateKey, "pattern", appearance?.pattern, viewport, appearance?.patternStrength);
  return <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true" data-background-decoration>
    {texture?.type === "asset" && <span className="absolute inset-0 z-[2]" style={getDecorativeAssetStyle(texture)} />}
    {pattern?.type === "asset" && <span className="absolute inset-0 z-[3]" style={getDecorativeAssetStyle(pattern)} />}
  </div>;
}
