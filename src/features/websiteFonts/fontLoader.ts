import { platformFont, type PlatformFontDefinition } from "./platformFonts";

const installed = new WeakMap<Document, Set<string>>();
const previewInstalled = new WeakMap<Document, Set<string>>();
const targetWeights = [400, 600, 700];

export function fontStylesheetUrl(font: PlatformFontDefinition): string | null {
  if (font.source.type !== "googleFonts") return null;
  const weights = targetWeights.filter((weight) => font.weights.includes(weight));
  const variants = font.styles.includes("italic")
    ? [...weights.map((weight) => `0,${weight}`), ...weights.map((weight) => `1,${weight}`)]
    : weights.map(String);
  const axis = font.styles.includes("italic") ? "ital,wght" : "wght";
  return `https://fonts.googleapis.com/css2?family=${font.source.apiFamily}:${axis}@${variants.join(";")}&display=swap`;
}

function ensureFonts(documentTarget: Document, fontIds: string[], cacheStore: WeakMap<Document, Set<string>>, attribute: "platformFont" | "fontPreview") {
  const cache = cacheStore.get(documentTarget) ?? new Set<string>();
  cacheStore.set(documentTarget, cache);
  for (const id of fontIds) {
    const font = platformFont(id);
    if (!font) continue;
    const href = fontStylesheetUrl(font);
    if (!href || cache.has(href)) continue;
    if (Array.from(documentTarget.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).some((link) => link.href === href)) {
      cache.add(href);
      continue;
    }
    cache.add(href);
    const link = documentTarget.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset[attribute] = id;
    link.addEventListener("error", () => cache.delete(href), { once: true });
    documentTarget.head.appendChild(link);
  }
}

export function ensureProjectFonts(documentTarget: Document, fontIds: string[]) {
  ensureFonts(documentTarget, fontIds, installed, "platformFont");
}

export function ensureFontPreview(documentTarget: Document, fontId: string) {
  ensureFonts(documentTarget, [fontId], previewInstalled, "fontPreview");
}
