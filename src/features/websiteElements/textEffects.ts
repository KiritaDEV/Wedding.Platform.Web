import type { TextEffectStrength } from "./text";

const shadowLayers: Record<Exclude<TextEffectStrength, "none">, readonly string[]> = {
  soft: ["0 1px 2px"], medium: ["0 2px 4px", "0 1px 2px"], strong: ["0 3px 8px", "0 1px 3px"],
};
const glowLayers: Record<Exclude<TextEffectStrength, "none">, readonly string[]> = {
  soft: ["0 0 4px"], medium: ["0 0 4px", "0 0 10px"], strong: ["0 0 5px", "0 0 10px", "0 0 18px"],
};

function resolveLayers(strength: TextEffectStrength | undefined, color: string, recipes: typeof shadowLayers | typeof glowLayers): string[] {
  return !strength || strength === "none" ? [] : recipes[strength].map((layer) => `${layer} ${color}`);
}
export const resolveTextShadow = (strength: TextEffectStrength | undefined, color?: string) => resolveLayers(strength, color ?? "rgb(0 0 0 / 0.55)", shadowLayers);
export const resolveTextGlow = (strength: TextEffectStrength | undefined, color?: string) => resolveLayers(strength, color ?? "currentColor", glowLayers);
export function resolveTextEffects(shadow: TextEffectStrength | undefined, shadowColor: string | undefined, glow: TextEffectStrength | undefined, glowColor: string | undefined): string | undefined {
  const layers = [...resolveTextShadow(shadow, shadowColor), ...resolveTextGlow(glow, glowColor)];
  return layers.length ? layers.join(", ") : undefined;
}
export function resolveDropShadowEffects(shadow: TextEffectStrength | undefined, shadowColor: string | undefined, glow: TextEffectStrength | undefined, glowColor: string | undefined): string | undefined {
  const layers = [...resolveTextShadow(shadow, shadowColor), ...resolveTextGlow(glow, glowColor)].map((layer) => `drop-shadow(${layer})`);
  return layers.length ? layers.join(" ") : undefined;
}
