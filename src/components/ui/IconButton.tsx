import { forwardRef } from "react";

export type IconButtonProps = React.ComponentProps<"button"> & {
  variant?: "ghost" | "danger";
  size?: "sm" | "md";
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { className = "", variant = "ghost", size = "md", ...props },
    ref,
  ) {
    const dimensions = size === "sm" ? "size-8" : "size-10";
    const colors =
      variant === "danger"
        ? "text-danger hover:bg-danger-muted"
        : "text-foreground-muted hover:bg-surface-muted hover:text-foreground";
    return (
      <button
        ref={ref}
        className={`inline-grid shrink-0 place-items-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer ${dimensions} ${colors} ${className}`}
        {...props}
      />
    );
  },
);
