import { z } from "zod";

export type BackgroundMediaDevice = "desktop" | "tablet" | "mobile";
export type BackgroundMediaFraming = {
  assetId?: string | null;
  focalPoint?: { x: number; y: number };
  zoom?: number;
};
export type BackgroundMediaReference = BackgroundMediaFraming & {
  assetId: string | null;
};
export type ResolvedBackgroundMediaReference = Omit<BackgroundMediaReference, "assetId" | "responsive"> & { assetId: string };

const mediaIdSchema = z.string().ulid().refine(
  (value) => value[0] >= "0" && value[0] <= "7",
  "Media ID must be a canonical ULID.",
);
const focalPointSchema = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).strict();
const framingShape = {
  assetId: mediaIdSchema.nullable().optional(),
  focalPoint: focalPointSchema.optional(),
  zoom: z.number().min(1).max(3).optional(),
} as const;
const rejectNoneWithFraming = (value: BackgroundMediaFraming, context: z.RefinementCtx) => {
  if (value.assetId === null && (value.focalPoint !== undefined || value.zoom !== undefined)) context.addIssue({ code: "custom", message: "An explicit no-image background cannot contain focal-point or zoom settings.", path: ["assetId"] });
};
/** Canonical decorative background-media reference shared by sections and elements. */
export const backgroundMediaSchema = z.object({
  ...framingShape,
  assetId: mediaIdSchema.nullable(),
}).strict().superRefine(rejectNoneWithFraming).nullable().optional();

export type BackgroundMedia = BackgroundMediaReference | null | undefined;

export function resolveBackgroundMediaForDevice(media: BackgroundMedia, device: BackgroundMediaDevice): ResolvedBackgroundMediaReference | null {
  void device;
  if (!media) return null;
  const assetId = media.assetId;
  if (!assetId) return null;
  return {
    assetId,
    focalPoint: media.focalPoint,
    zoom: media.zoom,
  };
}

export function setBackgroundMediaDeviceFraming(media: BackgroundMediaReference, device: BackgroundMediaDevice, patch: Partial<BackgroundMediaFraming>): BackgroundMediaReference {
  void device;
  const next = { ...media, ...patch };
  for (const key of Object.keys(next) as (keyof BackgroundMediaReference)[]) if (next[key] === undefined) delete next[key];
  return next;
}

export function removeBackgroundMediaForDevice(media: BackgroundMediaReference, device: BackgroundMediaDevice): BackgroundMediaReference {
  void media;
  void device;
  return { assetId: null };
}
