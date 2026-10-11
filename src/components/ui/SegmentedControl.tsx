export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
};

export function SegmentedControl<T extends string>({
  value,
  options,
  label,
  onChange,
  className = "",
}: {
  value: T;
  options: Array<SegmentedOption<T>>;
  label: string;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-1 rounded-md bg-surface-muted p-1 ${className}`}
      role="group"
      aria-label={label}
    >
      {options.map((option) => (
        <button
          className={`flex min-h-8 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs! ${value === option.value ? "bg-surface font-medium shadow-sm" : "text-foreground-muted"} disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer`}
          key={option.value}
          type="button"
          disabled={option.disabled}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
