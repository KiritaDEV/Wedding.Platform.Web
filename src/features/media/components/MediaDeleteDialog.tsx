import { useState } from "react";
import { ApiError } from "../../../lib/api";
import { Button } from "../../../components/ui/Button";
import {
  Dialog,
  DialogFooter,
  DialogHeader,
} from "../../../components/ui/Dialog";
import { Text } from "../../../components/ui/Text";
import { mediaUsageDetail, mediaUsageKey, type MediaAsset } from "../types";
import type { MediaAssetUsage } from "../types";
import { mediaDeleteConflictSchema } from "../schemas";

type DeleteFailure = { message: string; usageConflict: boolean };

export function MediaDeleteDialog({
  asset,
  onClose,
  onDelete,
}: {
  asset: MediaAsset | null;
  onClose: () => void;
  onDelete: (asset: MediaAsset) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const [failure, setFailure] = useState<DeleteFailure | null>(null);
  const [freshUsage, setFreshUsage] = useState<MediaAssetUsage | null>(null);
  const usage = freshUsage ?? asset?.usage;
  const knownUsage = usage?.isInUse === true;
  const blocked = knownUsage || failure?.usageConflict === true;
  const titleId = "media-delete-title";
  const descriptionId = "media-delete-description";

  async function confirmDelete() {
    if (!asset || knownUsage) return;
    setDeleting(true);
    setFailure(null);
    try {
      await onDelete(asset);
    } catch (error) {
      const conflict =
        error instanceof ApiError && error.status === 409
          ? mediaDeleteConflictSchema.safeParse(error.payload)
          : null;
      if (conflict?.success) setFreshUsage(conflict.data.usage);
      setFailure({
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong while deleting this image. Please try again.",
        usageConflict:
          conflict?.success === true ||
          (error instanceof ApiError && error.status === 422),
      });
    } finally {
      setDeleting(false);
    }
  }

  const close = () => {
    if (!deleting) onClose();
  };
  const references = usage?.references ?? [];
  const title = blocked || failure ? "Unable to delete image" : "Delete image?";

  return (
    <Dialog
      open={asset !== null}
      onClose={close}
      closeDisabled={deleting}
      titleId={titleId}
      descriptionId={descriptionId}
      size="sm"
    >
      {asset && (
        <>
          <DialogHeader
            title={title}
            titleId={titleId}
            onClose={close}
            closeDisabled={deleting}
          />
          <div className="mt-3" id={descriptionId}>
            {blocked ? (
              <>
                <Text>
                  {failure?.message ??
                    "This image is used by one or more Website Projects and cannot be deleted."}
                </Text>
                {references.length > 0 && (
                  <div className="mt-4">
                    <Text className="font-medium">Used in:</Text>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                      {references.map((reference) => {
                        const detail = mediaUsageDetail(reference);
                        return (
                          <li key={mediaUsageKey(reference)}>
                            <span className="font-medium">
                              {reference.websiteProjectName}
                            </span>
                            <span className="block text-xs text-foreground-muted">
                              {reference.sectionName}
                              {detail ? ` - ${detail}` : ""}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                <Text className="mt-4" variant="muted">
                  Remove it from these Website Project sections first, then try
                  again.
                </Text>
              </>
            ) : failure ? (
              <Text variant="error">{failure.message}</Text>
            ) : (
              <>
                <Text>
                  “{asset.originalFilename}” will be permanently removed from
                  this Event.
                </Text>
                <Text className="mt-3" variant="muted">
                  This action cannot be undone.
                </Text>
              </>
            )}
          </div>
          <DialogFooter className="mt-5">
            {blocked ? (
              <Button variant="secondary" onClick={close}>
                Close
              </Button>
            ) : (
              <>
                <Button variant="secondary" disabled={deleting} onClick={close}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  disabled={deleting}
                  onClick={confirmDelete}
                >
                  {deleting ? "Deleting…" : failure ? "Try again" : "Delete"}
                </Button>
              </>
            )}
          </DialogFooter>
        </>
      )}
    </Dialog>
  );
}
