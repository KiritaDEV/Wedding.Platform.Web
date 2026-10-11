import { forwardRef } from "react";

export type TextareaProps = React.ComponentProps<"textarea">;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className = "", ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={`min-h-20 w-full rounded-sm! border border-border bg-background px-3 py-2 text-sm text-foreground outline-none! transition-colors focus:border-accent focus:ring-2! focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        {...props}
      />
    );
  },
);
