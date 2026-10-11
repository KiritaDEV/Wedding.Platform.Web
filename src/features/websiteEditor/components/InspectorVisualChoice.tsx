import { Check } from "lucide-react";
import { useId } from "react";

export type InspectorVisualChoiceOption<T extends string> = {
  value: T;
  label: string;
  helper?: string;
  illustration: React.ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
};

export function InspectorVisualChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
  variant = "compact",
  columns = 3,
  showIllustration = true,
  layout = "grid",
}: {
  label: string;
  value: T | "";
  options: Array<InspectorVisualChoiceOption<T>>;
  onChange: (value: T) => void;
  disabled?: boolean;
  variant?: "compact" | "large";
  columns?: 2 | 3;
  showIllustration?: boolean;
  layout?: "grid" | "stack" | "inline";
}) {
  const labelId = useId();
  const enabled = options.filter((option) => !disabled && !option.disabled);
  const hasSelectedOption = options.some((option) => option.value === value);
  const move = (current: T, delta: number, button: HTMLButtonElement) => {
    const index = enabled.findIndex(
      ({ value: candidate }) => candidate === current,
    );
    if (index < 0 || enabled.length === 0) return;
    const next = enabled[(index + delta + enabled.length) % enabled.length];
    onChange(next.value);
    const allButtons = Array.from(
      button.parentElement?.querySelectorAll<HTMLButtonElement>(
        '[role="radio"]',
      ) ?? [],
    );
    allButtons
      .find((candidate) => candidate.dataset.choiceValue === next.value)
      ?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      aria-disabled={disabled || undefined}
    >
      <span id={labelId} className="sr-only">
        {label}
      </span>
      <div
        className={`${layout === "inline" ? "inline-grid grid-flow-col gap-2" : `grid gap-2 ${layout === "stack" ? "grid-cols-1" : columns === 2 ? "grid-cols-2" : "grid-cols-2 min-[340px]:grid-cols-3"}`}`}
      >
        {options.map((option) => {
          const selected = option.value === value;
          const optionDisabled = disabled || option.disabled;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={option.ariaLabel}
              disabled={optionDisabled}
              data-choice-value={option.value}
              title={option.label}
              tabIndex={
                selected ||
                (!hasSelectedOption && enabled[0]?.value === option.value)
                  ? 0
                  : -1
              }
              className={`relative min-w-0 rounded-md border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-45 ${layout === "inline" ? "inline-flex h-10 w-10 items-center justify-center p-0 text-center leading-none" : variant === "large" ? "p-2.5 text-left" : "p-2 text-left"} ${!showIllustration ? "pr-8" : ""} ${selected ? "border-accent/70 bg-accent/10 text-foreground" : "border-border bg-surface hover:border-accent/30 hover:bg-surface-muted"}`}
              onClick={() => onChange(option.value)}
              onKeyDown={(event) => {
                const delta =
                  event.key === "ArrowRight" || event.key === "ArrowDown"
                    ? 1
                    : event.key === "ArrowLeft" || event.key === "ArrowUp"
                      ? -1
                      : 0;
                if (!delta) return;
                event.preventDefault();
                move(option.value, delta, event.currentTarget);
              }}
            >
              {showIllustration && (
                <span
                  className={`${layout === "inline" ? "grid h-full w-full place-items-center leading-none" : `block ${variant === "large" ? "h-14" : "h-9"}`}`}
                  aria-hidden="true"
                >
                  {option.illustration}
                </span>
              )}
              <span
                className={`${layout === "inline" ? "sr-only" : `${showIllustration ? "mt-1.5" : ""} block truncate font-medium ${variant === "large" ? "text-xs" : "text-[11px]"}`}`}
              >
                {option.label}
              </span>
              {option.helper && (
                <span className="mt-0.5 block text-[10px] leading-tight text-foreground-muted">
                  {option.helper}
                </span>
              )}
              {selected && layout !== "inline" && (
                <Check
                  size={13}
                  className="absolute right-1.5 top-1.5 text-accent"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
