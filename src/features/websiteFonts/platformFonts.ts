import type { RenderableWebsite } from "../websiteEditor/types";
import { listSectionCompositions } from "../websiteEditor/sectionComposition";
import type { WebsiteElement } from "../websiteElements/types";

export type FontCategory = "serif" | "sans" | "script" | "display" | "mono" | "legacy";
export type FontRole = "heading" | "body" | "accent";
type HostedSource = { type: "googleFonts"; apiFamily: string; upstreamUrl: string; version: string };
export type PlatformFontDefinition = { id: string; family: string; displayName: string; category: FontCategory; source: HostedSource | { type: "system" } | { type: "legacyAlias" }; fallback: string; weights: number[]; styles: Array<"normal" | "italic">; allowedRoles: FontRole[]; recommendedRoles: FontRole[]; license: { id: string; url?: string } };

const commit = "ade3d1533e06b2b1462ffcde8e08b129627ca360";
const ofl = { id: "OFL-1.1", url: "https://openfontlicense.org/open-font-license-official-text/" };
type HostedRow = [string, string, Exclude<FontCategory, "legacy">, string, string, number[], Array<"normal" | "italic">, ("ofl" | "apache")?];
const hostedRows: HostedRow[] = [
  ["cormorant-garamond", "Cormorant Garamond", "serif", "Cormorant+Garamond", "cormorantgaramond", [400, 600, 700], ["normal", "italic"]], ["playfair-display", "Playfair Display", "serif", "Playfair+Display", "playfairdisplay", [400, 600, 700], ["normal", "italic"]],
  ["libre-baskerville", "Libre Baskerville", "serif", "Libre+Baskerville", "librebaskerville", [400, 600, 700], ["normal", "italic"]], ["eb-garamond", "EB Garamond", "serif", "EB+Garamond", "ebgaramond", [400, 600, 700], ["normal", "italic"]],
  ["crimson-text", "Crimson Text", "serif", "Crimson+Text", "crimsontext", [400, 600, 700], ["normal", "italic"]], ["lora", "Lora", "serif", "Lora", "lora", [400, 600, 700], ["normal", "italic"]], ["merriweather", "Merriweather", "serif", "Merriweather", "merriweather", [400, 600, 700], ["normal", "italic"]], ["spectral", "Spectral", "serif", "Spectral", "spectral", [400, 600, 700], ["normal", "italic"]],
  ["dm-serif-display", "DM Serif Display", "serif", "DM+Serif+Display", "dmserifdisplay", [400], ["normal", "italic"]], ["old-standard-tt", "Old Standard TT", "serif", "Old+Standard+TT", "oldstandardtt", [400, 700], ["normal", "italic"]], ["cardo", "Cardo", "serif", "Cardo", "cardo", [400, 700], ["normal", "italic"]], ["sorts-mill-goudy", "Sorts Mill Goudy", "serif", "Sorts+Mill+Goudy", "sortsmillgoudy", [400], ["normal", "italic"]],
  ["cormorant-infant", "Cormorant Infant", "serif", "Cormorant+Infant", "cormorantinfant", [400, 600, 700], ["normal", "italic"]], ["crimson-pro", "Crimson Pro", "serif", "Crimson+Pro", "crimsonpro", [400, 600, 700], ["normal", "italic"]], ["bodoni-moda", "Bodoni Moda", "serif", "Bodoni+Moda", "bodonimoda", [400, 600, 700], ["normal", "italic"]],
  ["montserrat", "Montserrat", "sans", "Montserrat", "montserrat", [400, 600, 700], ["normal", "italic"]], ["lato", "Lato", "sans", "Lato", "lato", [400, 600, 700], ["normal", "italic"]], ["raleway", "Raleway", "sans", "Raleway", "raleway", [400, 600, 700], ["normal", "italic"]], ["josefin-sans", "Josefin Sans", "sans", "Josefin+Sans", "josefinsans", [400, 600, 700], ["normal", "italic"]],
  ["quicksand", "Quicksand", "sans", "Quicksand", "quicksand", [400, 600, 700], ["normal"]], ["nunito", "Nunito", "sans", "Nunito", "nunito", [400, 600, 700], ["normal", "italic"]], ["poppins", "Poppins", "sans", "Poppins", "poppins", [400, 600, 700], ["normal", "italic"]], ["inter", "Inter", "sans", "Inter", "inter", [400, 600, 700], ["normal", "italic"]],
  ["work-sans", "Work Sans", "sans", "Work+Sans", "worksans", [400, 600, 700], ["normal", "italic"]], ["mulish", "Mulish", "sans", "Mulish", "mulish", [400, 600, 700], ["normal", "italic"]], ["dm-sans", "DM Sans", "sans", "DM+Sans", "dmsans", [400, 600, 700], ["normal", "italic"]], ["source-sans-3", "Source Sans 3", "sans", "Source+Sans+3", "sourcesans3", [400, 600, 700], ["normal", "italic"]],
  ["cabin", "Cabin", "sans", "Cabin", "cabin", [400, 600, 700], ["normal", "italic"]], ["karla", "Karla", "sans", "Karla", "karla", [400, 600, 700], ["normal", "italic"]], ["outfit", "Outfit", "sans", "Outfit", "outfit", [400, 600, 700], ["normal"]], ["space-grotesk", "Space Grotesk", "sans", "Space+Grotesk", "spacegrotesk", [400, 600, 700], ["normal"]], ["syne", "Syne", "sans", "Syne", "syne", [400, 600, 700], ["normal"]],
  ["jetbrains-mono", "JetBrains Mono", "mono", "JetBrains+Mono", "jetbrainsmono", [400, 600, 700], ["normal", "italic"]], ["ibm-plex-mono", "IBM Plex Mono", "mono", "IBM+Plex+Mono", "ibmplexmono", [400, 600, 700], ["normal", "italic"]], ["space-mono", "Space Mono", "mono", "Space+Mono", "spacemono", [400, 700], ["normal", "italic"]], ["fira-code", "Fira Code", "mono", "Fira+Code", "firacode", [400, 600, 700], ["normal"]],
  ["great-vibes", "Great Vibes", "script", "Great+Vibes", "greatvibes", [400], ["normal"]], ["dancing-script", "Dancing Script", "script", "Dancing+Script", "dancingscript", [400, 600, 700], ["normal"]], ["parisienne", "Parisienne", "script", "Parisienne", "parisienne", [400], ["normal"]], ["alex-brush", "Alex Brush", "script", "Alex+Brush", "alexbrush", [400], ["normal"]], ["sacramento", "Sacramento", "script", "Sacramento", "sacramento", [400], ["normal"]], ["allura", "Allura", "script", "Allura", "allura", [400], ["normal"]], ["pinyon-script", "Pinyon Script", "script", "Pinyon+Script", "pinyonscript", [400], ["normal"]], ["tangerine", "Tangerine", "script", "Tangerine", "tangerine", [400, 700], ["normal"]], ["rouge-script", "Rouge Script", "script", "Rouge+Script", "rougescript", [400], ["normal"]], ["mrs-saint-delafield", "Mrs Saint Delafield", "script", "Mrs+Saint+Delafield", "mrssaintdelafield", [400], ["normal"]], ["homemade-apple", "Homemade Apple", "script", "Homemade+Apple", "homemadeapple", [400], ["normal"], "apache"],
  ["cinzel", "Cinzel", "display", "Cinzel", "cinzel", [400, 600, 700], ["normal"]], ["cinzel-decorative", "Cinzel Decorative", "display", "Cinzel+Decorative", "cinzeldecorative", [400, 700], ["normal"]], ["antic-didone", "Antic Didone", "display", "Antic+Didone", "anticdidone", [400], ["normal"]], ["marcellus", "Marcellus", "display", "Marcellus", "marcellus", [400], ["normal"]], ["poiret-one", "Poiret One", "display", "Poiret+One", "poiretone", [400], ["normal"]], ["tenor-sans", "Tenor Sans", "display", "Tenor+Sans", "tenorsans", [400], ["normal"]], ["cormorant-upright", "Cormorant Upright", "display", "Cormorant+Upright", "cormorantupright", [400, 600, 700], ["normal"]], ["forum", "Forum", "display", "Forum", "forum", [400], ["normal"]], ["bebas-neue", "Bebas Neue", "display", "Bebas+Neue", "bebasneue", [400], ["normal"]], ["archivo-black", "Archivo Black", "display", "Archivo+Black", "archivoblack", [400], ["normal"]],
];

const fallback = (category: FontCategory) => category === "sans" ? "ui-sans-serif, system-ui, sans-serif" : category === "script" ? '"Segoe Script", "Snell Roundhand", cursive' : category === "display" ? "Georgia, ui-serif, serif" : category === "mono" ? '"SFMono-Regular", Consolas, "Liberation Mono", monospace' : 'Georgia, Cambria, "Times New Roman", serif';
const hosted = ([id, family, category, apiFamily, path, weights, styles, directory = "ofl"]: HostedRow): PlatformFontDefinition => ({ id, family, displayName: family, category, source: { type: "googleFonts", apiFamily, upstreamUrl: `https://github.com/google/fonts/tree/${commit}/${directory}/${path}`, version: commit }, fallback: fallback(category), weights, styles, allowedRoles: ["heading", "body"], recommendedRoles: category === "script" || category === "display" ? ["heading", "accent"] : category === "mono" ? [] : ["heading", "body"], license: directory === "apache" ? { id: "APACHE-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" } : ofl });
const local = (id: string, family: string, category: FontCategory, stack: string, type: "system" | "legacyAlias" = "system"): PlatformFontDefinition => ({ id, family, displayName: family, category, source: { type }, fallback: stack, weights: [400, 600, 700], styles: ["normal", "italic"], allowedRoles: ["heading", "body"], recommendedRoles: [], license: { id: type === "system" ? "system-font" : "system-font-stack" } });

export const platformFonts: PlatformFontDefinition[] = [
  ...hostedRows.map(hosted),
  local("times-new-roman", "Times New Roman", "serif", '"Times New Roman", Times, serif'), local("courier-new", "Courier New", "mono", '"Courier New", Courier, monospace'),
  local("editorial-serif", "Editorial Serif", "legacy", 'Georgia, Cambria, "Times New Roman", serif', "legacyAlias"), local("modern-sans", "Modern Sans", "legacy", 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', "legacyAlias"),
  local("romantic-serif", "Romantic Serif", "legacy", '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif', "legacyAlias"), local("classic-serif", "Classic Serif", "legacy", 'Georgia, Cambria, "Times New Roman", serif', "legacyAlias"),
  local("fashion-serif", "Fashion Serif", "legacy", 'Didot, "Bodoni MT", "Times New Roman", serif', "legacyAlias"), local("fashion-sans", "Fashion Sans", "legacy", 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', "legacyAlias"),
];
export const platformFont = (id: string) => platformFonts.find((font) => font.id === id);
export const platformFontStack = (id: string) => { const font = platformFont(id); if (!font) return undefined; return font.source.type === "googleFonts" ? `"${font.family}", ${font.fallback}` : font.fallback; };

export function collectRequiredFontIds(website: RenderableWebsite): string[] {
  const ids = new Set<string>();
  const preset = website.template?.capabilities.designLibrary.typographyPresets.find(({ id }) => id === website.designSettings.fontSet);
  if (preset) { ids.add(preset.headingFontId); ids.add(preset.bodyFontId); }
  if (website.designSettings.projectDefaults.headingFontId) ids.add(website.designSettings.projectDefaults.headingFontId);
  if (website.designSettings.projectDefaults.bodyFontId) ids.add(website.designSettings.projectDefaults.bodyFontId);
  if (website.projectDesignDefaults) { ids.add(website.projectDesignDefaults.headingFontId); ids.add(website.projectDesignDefaults.bodyFontId); }
  for (const section of website.sections) {
    if (section.resolvedDesignContext) { ids.add(section.resolvedDesignContext.headingFontId); ids.add(section.resolvedDesignContext.bodyFontId); }
    if (section.designDefaults.headingFontId) ids.add(section.designDefaults.headingFontId);
    if (section.designDefaults.bodyFontId) ids.add(section.designDefaults.bodyFontId);
    listSectionCompositions(section).forEach(({ composition }) => composition.childFlow.elements.forEach((element) => collectElementFontIds(element, ids)));
  }
  return [...ids];
}

function collectElementFontIds(element: WebsiteElement, ids: Set<string>) {
  if (element.type === "text" && element.appearance?.fontFamilyId) ids.add(element.appearance.fontFamilyId);
  if (element.type !== "compositionGroup") return;
  element.children.forEach((child) => collectElementFontIds(child as WebsiteElement, ids));
}
