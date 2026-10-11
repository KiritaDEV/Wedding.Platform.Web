import type { PointerEventHandler, ReactNode } from "react";

export function TextFormattingButton({ label, pressed, disabled, onPointerDown, onClick, children }: {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onPointerDown?: PointerEventHandler<HTMLButtonElement>;
  onClick?: () => void;
  children: ReactNode;
}) {
  return <button
    type="button"
    aria-label={label}
    aria-pressed={pressed}
    title={label}
    disabled={disabled}
    onPointerDown={onPointerDown}
    onClick={onClick}
    className={`grid size-10 place-items-center rounded-md border outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-40 ${pressed ? "border-accent bg-accent text-accent-foreground" : "border-border text-foreground-muted hover:bg-surface-muted hover:text-foreground"}`}
  >{children}</button>;
}
