import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { IconButton } from "./IconButton";

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  titleId?: string;
  descriptionId?: string;
  closeDisabled?: boolean;
  size?: "sm" | "lg" | "xl";
  className?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  mobileFullScreen?: boolean;
  onAfterClose?: () => void;
  contained?: boolean;
};

const sizes = {
  sm: "w-[calc(100%-2rem)] max-w-sm p-5",
  lg: "max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto p-0 sm:w-full",
  xl: "max-h-[90dvh] w-[calc(100%-1rem)] max-w-[1400px] overflow-y-auto p-0 sm:w-[92vw]",
};

export function Dialog({
  open,
  onClose,
  children,
  titleId,
  descriptionId,
  closeDisabled = false,
  size = "lg",
  className = "",
  initialFocusRef,
  mobileFullScreen = false,
  onAfterClose,
  contained = false,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      initialFocusRef?.current?.focus();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [initialFocusRef, onAfterClose, open]);

  return (
    <dialog
      ref={ref}
      data-mobile-full-screen={mobileFullScreen || undefined}
      className={`m-auto rounded-md border border-border bg-surface text-foreground shadow-[var(--shadow-dialog)] ${sizes[size]} ${contained ? "overflow-hidden" : ""} ${mobileFullScreen ? "max-sm:m-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:w-full max-sm:max-w-none max-sm:rounded-none max-sm:border-0" : ""} ${className}`}
      style={contained ? { overflow: "hidden" } : undefined}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        if (!closeDisabled) onClose();
      }}
      onClose={() => {
        onAfterClose?.();
        if (open && !closeDisabled) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !closeDisabled) onClose();
      }}
    >
      {children}
    </dialog>
  );
}

export function DialogHeader({
  title,
  titleId,
  description,
  descriptionId,
  eyebrow,
  onClose,
  closeDisabled = false,
  closeLabel = "Close dialog",
  className = "",
  titleClassName = "",
}: {
  title: React.ReactNode;
  titleId: string;
  description?: React.ReactNode;
  descriptionId?: string;
  eyebrow?: React.ReactNode;
  onClose?: () => void;
  closeDisabled?: boolean;
  closeLabel?: string;
  className?: string;
  titleClassName?: string;
}) {
  return (
    <header className={`flex items-start justify-between gap-4 ${className}`}>
      <div>
        {eyebrow && (
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            {eyebrow}
          </div>
        )}
        <h2
          className={`text-lg font-semibold ${eyebrow ? "mt-0.5" : ""} ${titleClassName}`}
          id={titleId}
        >
          {title}
        </h2>
        {description && (
          <div
            className="mt-1 text-sm text-foreground-muted"
            id={descriptionId}
          >
            {description}
          </div>
        )}
      </div>
      {onClose && (
        <IconButton
          type="button"
          size="sm"
          disabled={closeDisabled}
          onClick={onClose}
          aria-label={closeLabel}
        >
          <X aria-hidden="true" size={20} />
        </IconButton>
      )}
    </header>
  );
}

export function DialogFooter({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <footer className={`flex justify-end gap-2 ${className}`}>
      {children}
    </footer>
  );
}
