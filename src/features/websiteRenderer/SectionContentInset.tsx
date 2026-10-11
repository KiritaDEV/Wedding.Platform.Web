import type { CSSProperties, ReactNode } from "react";

type Props = {
  children: ReactNode;
  className: string;
  style?: CSSProperties;
};

/** Structural boundary for ordinary Section foreground content. */
export function SectionContentInset({ children, className, style }: Props) {
  return (
    <div
      data-section-content
      data-section-content-inset
      className={className}
      style={style}
    >
      {children}
    </div>
  );
}
