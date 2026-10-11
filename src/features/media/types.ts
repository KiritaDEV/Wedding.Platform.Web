export type MediaVariant = { width: number; height: number; url: string };

export type MediaUsageReference =
  | { type: "sectionMedia"; appearanceScope?: string; compositionScope?: string; elementId?: string; itemId?: string }
  | {
      type: "person";
      personId: string;
      label?: string;
      groupId?: string;
      groupLabel?: string;
      compositionScope?: string;
      elementId?: string;
    };

export type MediaUsageV2Record = {
  source: "draft" | "publishedSnapshot";
  mediaId: string;
  eventId: string;
  websiteProjectId: string;
  websiteProjectName: string;
  sectionId: string;
  sectionType: string;
  sectionName: string;
  reference: MediaUsageReference;
};

export type MediaAssetUsage = {
  isInUse: boolean;
  references: MediaUsageV2Record[];
};
export type MediaDeleteConflict = {
  code: "media_asset_in_use";
  message: string;
  usage: MediaAssetUsage;
};

export function mediaUsageDetail(record: MediaUsageV2Record): string | null {
  const reference = record.reference;
  if (reference.type === "person")
    return [reference.groupLabel, reference.label ?? "Person"]
      .filter(Boolean)
      .join(" - ");
  return null;
}

export function mediaUsageKey(record: MediaUsageV2Record): string {
  const reference = record.reference;
  const identity = reference.type === "person"
    ? `${reference.groupId ?? ""}:${reference.personId}`
    : "section";
  const location = [reference.compositionScope, reference.elementId, reference.type === "sectionMedia" ? reference.appearanceScope : undefined, reference.type === "sectionMedia" ? reference.itemId : undefined].join(":");
  return `${record.source}:${record.websiteProjectId}:${record.sectionId}:${reference.type}:${identity}:${location}`;
}

export function mediaUsageSourceLabel(record: MediaUsageV2Record): string {
  return record.source === "publishedSnapshot" ? "Published snapshot" : "Working draft";
}

export function mediaUsageSummary(usage: MediaAssetUsage): string {
  const sources = new Set(usage.references.map(reference => reference.source));
  return sources.size > 1 ? "Draft and snapshot" : sources.has("publishedSnapshot") ? "Published snapshot" : "Working draft";
}

export function mediaUsageRemovalHelp(usage: MediaAssetUsage): string {
  return usage.references.some(reference => reference.source === "publishedSnapshot")
    ? "Remove this image from the working drafts and republish every project whose snapshot retains it, including inactive projects. Unpublishing does not release snapshot references."
    : "Remove it from these Website Project sections first, then try again.";
}

export type MediaAsset = {
  id: string;
  originalFilename: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  width: number;
  height: number;
  sizeBytes: number;
  createdAt: string;
  variants: Record<string, MediaVariant | undefined>;
  usage: MediaAssetUsage;
};

export type SelectableMediaAsset = MediaAsset & { variants: MediaAsset['variants'] & { web: MediaVariant } };

export function hasMediaWebVariant(asset: MediaAsset): asset is SelectableMediaAsset {
  return asset.variants.web !== undefined;
}

export type MediaFilters = {
  search?: string;
  type?: "jpeg" | "png" | "webp";
  orientation?: "landscape" | "portrait" | "square";
  uploaded?: "today" | "7d" | "30d";
  page?: number;
};

export type MediaPage = {
  assets: MediaAsset[];
  currentPage: number;
  lastPage: number;
  total: number;
};
