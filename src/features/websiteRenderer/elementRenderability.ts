import type { WebsiteElement } from "../websiteElements/types";
import type { ResolvedWebsiteMedia } from "../websiteEditor/types";
import { resolveDividerAsset } from "../websiteElements/divider";
import { formatDateOnly } from "./formatDateOnly";

export function resolvedMediaItems(element: Extract<WebsiteElement, { type: "media" }>, media: Record<string, ResolvedWebsiteMedia>) {
  return element.items.filter((item) => item.type === "video" || Boolean(media[item.mediaId]));
}

export function isElementRenderable(element: WebsiteElement, templateKey: string, mode: "editor" | "public", media: Record<string, ResolvedWebsiteMedia> = {}, eventDate: string | null = null, eventStartsAtUtc?: string | null): boolean {
  if (element.isHidden) return false;
  if (mode === "editor") return true;
  if (element.type === "countdown") return element.target.source === "custom" || Boolean(eventStartsAtUtc);
  if (element.type === "divider") return Boolean(resolveDividerAsset(templateKey, element.appearance?.assetId));
  if (element.type === "media") return resolvedMediaItems(element, media).length > 0;
  if (element.type === "date") return Boolean(formatDateOnly(eventDate));
  if (element.type === "accordion") return element.items.some((item) => Boolean(item.title.trim() && item.content.trim()));
  if (element.type === "schedule") return element.items.some((item) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(item.time) && Boolean(item.title.trim()));
  if (element.type === "people") return element.groups.some((group) => Boolean(group.name.trim()) && group.people.some((person) => Boolean(person.name.trim())));
  if (element.type === "compositionGroup" && element.children.length > 0) return element.children.some((child) => isElementRenderable(child, templateKey, mode, media, eventDate, eventStartsAtUtc));
  return true;
}
