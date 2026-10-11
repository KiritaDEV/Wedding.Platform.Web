import type { CSSProperties, ReactNode } from "react";
import { Children } from "react";
import type { RootVerticalDistribution } from "./rootFlowDistribution";

export function SectionRootFlow({ children, inlineAlignment, distribution = "packed", packedJustification }: { children: ReactNode; inlineAlignment?: CSSProperties["alignItems"]; distribution?: RootVerticalDistribution; packedJustification?: CSSProperties["justifyContent"] }) {
  const distributed = distribution === "space-between";
  const roots = Children.toArray(children);
  return <div data-section-root-flow className={`flex flex-col${distributed ? " [&>*]:shrink-0" : ""}`} style={{ alignItems: inlineAlignment, ...(distributed ? { minHeight: "inherit", boxSizing: "border-box", justifyContent: roots.length > 1 ? "space-between" : packedJustification } : {}) }}>{children}</div>;
}
