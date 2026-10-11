import { RotateCcw, Save } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Text } from "../../../components/ui/Text";

export function BuilderSaveBar({ dirty, statusDirty = dirty, saving, form, onSave, resetDirty = false, onReset }: {
  dirty: boolean;
  statusDirty?: boolean;
  saving: boolean;
  form?: string;
  onSave?: () => void;
  resetDirty?: boolean;
  onReset?: () => void;
}) {
  return <footer
    className="z-30 flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-surface px-3 py-3 sm:px-4"
  >
    <Text className="min-w-0 flex-1" as="span" variant="helper">{statusDirty ? "Unsaved changes" : "All changes saved"}</Text>
    <div className="ml-auto flex shrink-0 items-center gap-2">
      {onReset && <Button
        className="rounded-sm! px-2.5! text-sm! xl:py-1.5"
        size="sm"
        type="button"
        variant="secondary"
        disabled={!resetDirty || saving}
        onClick={onReset}
      >
        <RotateCcw size={15} aria-hidden="true" />
        Reset
      </Button>}
      <Button
        className="shrink-0 rounded-sm! px-2.5! text-sm! xl:py-1.5"
        size="sm"
        type={form ? "submit" : "button"}
        form={form}
        disabled={!dirty || saving}
        onClick={onSave}
      >
        <Save size={15} aria-hidden="true" />
        {saving ? "Saving..." : "Save changes"}
      </Button>
    </div>
  </footer>;
}
