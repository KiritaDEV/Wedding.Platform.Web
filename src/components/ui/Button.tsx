import { forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

export type ButtonProps = React.ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-foreground hover:bg-accent-hover",
  secondary:
    "border border-border bg-transparent text-foreground hover:bg-surface-muted",
  ghost:
    "bg-transparent text-foreground-muted hover:bg-surface-muted hover:text-foreground",
  danger: "bg-danger text-white hover:opacity-90",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-8 px-3 py-1.5 text-sm!",
  md: "min-h-10 px-3.5 py-2 text-sm!",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className = "", variant = "primary", size = "md", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center text-sm xl:text-xs! justify-center gap-1.5 rounded-sm! font-medium! transition-colors disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    );
  },
);
