import { ChevronDown } from "lucide-react";
import { forwardRef } from "react";

export type DisclosureProps = Omit<
  React.ComponentProps<"details">,
  "children"
> & {
  summary: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
};

export const Disclosure = forwardRef<HTMLDetailsElement, DisclosureProps>(
  function Disclosure(
    { summary, children, className = "", contentClassName = "", ...props },
    ref,
  ) {
    return (
      <details
        ref={ref}
        className={`group rounded-md border border-border bg-surface-muted p-3.5 ${className}`}
        {...props}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm! font-medium [&::-webkit-details-marker]:hidden">
          <span>{summary}</span>
          <ChevronDown
            className="shrink-0 text-foreground-muted transition-transform group-open:rotate-180"
            size={16}
            aria-hidden="true"
          />
        </summary>
        <div className={`mt-3 ${contentClassName}`}>{children}</div>
      </details>
    );
  },
);
