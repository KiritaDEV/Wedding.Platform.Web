import { Button } from "../../../components/ui/Button";
import { Dialog, DialogFooter, DialogHeader } from "../../../components/ui/Dialog";

export function DiscardChangesDialog({
  open,
  onCancel,
  onDiscard,
  onSave,
  saving = false,
  title = "Discard unsaved changes?",
  description = "Your edits have not been saved.",
}: {
  open: boolean;
  onCancel: () => void;
  onDiscard: () => void;
  onSave?: () => void;
  saving?: boolean;
  title?: string;
  description?: string;
}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      size="sm"
      titleId="discard-changes-title"
      descriptionId="discard-changes-description"
    >
      <DialogHeader title={title} titleId="discard-changes-title" description={description} descriptionId="discard-changes-description" />
      <DialogFooter className="mt-5">
        <Button variant="secondary" size="sm" type="button" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" size="sm" type="button" disabled={saving} onClick={onDiscard}>
          Discard
        </Button>
        {onSave && <Button size="sm" type="button" disabled={saving} onClick={onSave}>
          {saving ? "Saving..." : "Save changes"}
        </Button>}
      </DialogFooter>
    </Dialog>
  );
}
