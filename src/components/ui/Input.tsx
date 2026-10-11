import { forwardRef } from "react";

export type InputProps = React.ComponentProps<"input">;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = "", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={`w-full rounded-sm! border border-border bg-background px-3 py-2 text-sm! text-foreground outline-none! transition-colors focus:border-accent focus:ring-2! focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60 cursor-text ${className}`}
      {...props}
    />
  );
});
