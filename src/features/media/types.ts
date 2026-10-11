export type MediaVariant = { width: number; height: number; url: string };

export type MediaUsageReference =
  | { type: "sectionMedia" }
  | {
      type: "person";
      personId: string;
      label?: string;
      groupId?: string;
      groupLabel?: string;
    };

export type MediaUsageV2Record = {
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
  return `${record.websiteProjectId}:${record.sectionId}:${reference.type}:${identity}`;
}

export type MediaAsset = {
  id: string;
  originalFilename: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  width: number;
  height: number;
  sizeBytes: number;
  createdAt: string;
  variants: Record<string, MediaVariant> & {
    thumbnail: MediaVariant;
    web: MediaVariant;
  };
  usage: MediaAssetUsage;
};

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
