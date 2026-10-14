/** The opaque pb payload is Google's undocumented Share format; never interpret it as HTML. */
export function validateGoogleMapsUrl(value: string): string | null {
  if (value.length > 8192 || !/^https:\/\/www\.google\.com\/maps\/embed\?[^#\s<>"\\]+$/.test(value) || /%(?![0-9a-f]{2})/i.test(value)) return null;
  try {
    if ([...value].some((char) => char.charCodeAt(0) > 126)) return null;
    decodeURIComponent(value); // Reject malformed UTF-8 that URLSearchParams would silently replace.
    const url = new URL(value);
    if (url.search.slice(1).split("&").some((pair) => !pair)) return null;
    if (url.protocol !== "https:" || url.hostname !== "www.google.com" || url.port || url.username || url.password || url.pathname !== "/maps/embed" || url.hash) return null;
    const seen = new Set<string>();
    for (const [key, entry] of url.searchParams) {
      if (seen.has(key) || !["pb", "hl"].includes(key)) return null;
      seen.add(key);
      if (key === "pb" && (!/^!1m[1-9][0-9]*(?:![1-9][0-9]*[a-z][^!]*)+$/.test(entry) || [...entry].some((char) => char === "<" || char === ">" || char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127))) return null;
      if (key === "hl" && !/^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/.test(entry)) return null;
    }
    return seen.has("pb") ? value : null;
  } catch { return null; }
}

export const GOOGLE_MAPS_INPUT_ERROR = "Paste one complete iframe from Google Maps > Share > Embed a map. Only secure Google Maps Share embeds are supported.";

/** XML parsing fails closed on malformed/duplicate attributes, never loads frames or runs scripts.
 * Google Share's quoted attributes and explicit closing tag are valid XML after HTML entity decoding.
 * The parsed document is never attached to the page.
 */
export function parseGoogleMapsEmbed(html: string): string | null {
  if (html.length > 12000 || /<!|<\?/.test(html)) return null;
  // Share HTML commonly uses raw ampersands; preserve existing XML entity references.
  const xml = html.trim().replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/gi, "&amp;");
  let doc: Document;
  try { doc = new DOMParser().parseFromString(xml, "application/xml"); } catch { return null; }
  const frame = doc.documentElement;
  if (!frame || frame.tagName !== "iframe" || frame.namespaceURI || doc.querySelector("parsererror") || doc.childNodes.length !== 1 || frame.childNodes.length) return null;
  const allowed = ["src", "width", "height", "style", "allowfullscreen", "loading", "referrerpolicy", "title"];
  if ([...frame.attributes].some((attribute) => !allowed.includes(attribute.name))) return null;
  if (frame.hasAttribute("style") && !/^\s*border\s*:\s*0(?:px)?\s*;?\s*$/i.test(frame.getAttribute("style")!)) return null;
  if (frame.hasAttribute("allowfullscreen") && !["", "true"].includes(frame.getAttribute("allowfullscreen")!)) return null;
  for (const key of ["width", "height"]) if (frame.hasAttribute(key) && !/^\d{1,4}$/.test(frame.getAttribute(key)!)) return null;
  if (frame.hasAttribute("loading") && !["lazy", "eager"].includes(frame.getAttribute("loading")!)) return null;
  if (frame.hasAttribute("referrerpolicy") && !["strict-origin-when-cross-origin", "no-referrer-when-downgrade", "no-referrer"].includes(frame.getAttribute("referrerpolicy")!)) return null;
  return validateGoogleMapsUrl(frame.getAttribute("src") ?? "");
}
