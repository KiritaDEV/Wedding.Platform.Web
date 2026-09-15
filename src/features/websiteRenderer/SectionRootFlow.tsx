import type { CSSProperties, ReactNode } from "react";

export function SectionRootFlow({ children, inlineAlignment }: { children: ReactNode; inlineAlignment?: CSSProperties["alignItems"] }) {
  return <div data-section-root-flow className="flex flex-col" style={{ alignItems: inlineAlignment }}>{children}</div>;
}
