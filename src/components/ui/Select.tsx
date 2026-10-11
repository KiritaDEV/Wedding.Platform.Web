import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SelectProps = {
  id?: string;
  name?: string;
  value: string;
  options: SelectOption[];
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
};

export function Select({
  id,
  name,
  value,
  options,
  disabled = false,
  className = "",
  onChange,
  onBlur,
  ...ariaProps
}: SelectProps) {
  const generatedId = useId();
  const listboxId = `${id ?? generatedId}-options`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);

  function select(option: SelectOption) {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
  }

  function moveSelection(direction: -1 | 1) {
    const enabled = options.filter((option) => !option.disabled);
    if (!enabled.length) return;
    const current = enabled.findIndex((option) => option.value === value);
    select(enabled[(current + direction + enabled.length) % enabled.length]);
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        id={id}
        name={name}
        className="flex min-h-8 w-full items-center rounded-sm! border border-border bg-background px-3 py-2 text-left text-sm lh:text-xs text-foreground outline-none transition-colors hover:border-foreground-muted focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onBlur={onBlur}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            moveSelection(event.key === "ArrowDown" ? 1 : -1);
          }
          if (event.key === "Escape") setOpen(false);
        }}
        {...ariaProps}
      >
        <span className="min-w-0 flex-1 truncate text-sm lg:text-xs">
          {selected?.label ?? "Select an option"}
        </span>
        <ChevronDown
          className={`ml-2 shrink-0 text-foreground-muted transition-transform ${open ? "rotate-180" : ""}`}
          size={16}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-[10px] border border-border bg-surface p-1 shadow-[var(--shadow-dialog)]"
          id={listboxId}
          role="listbox"
          aria-labelledby={id}
        >
          {options.map((option) => {
            const optionSelected = option.value === value;
            return (
              <button
                className={`flex min-h-9 w-full items-center rounded-sm! px-2.5 py-2 text-left text-sm! transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${optionSelected ? "bg-surface-muted font-medium text-foreground" : "text-foreground-muted hover:bg-surface-muted hover:text-foreground"}`}
                key={option.value}
                type="button"
                role="option"
                aria-selected={optionSelected}
                disabled={option.disabled}
                onClick={() => select(option)}
              >
                <span className="flex-1 text-sm lg:text-xs">
                  {option.label}
                </span>
                {optionSelected && (
                  <Check className="text-accent" size={15} aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
