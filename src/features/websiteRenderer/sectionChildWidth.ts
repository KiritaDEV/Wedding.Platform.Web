import type { WebsiteElement } from "../websiteElements/types";
import type { SectionChildWidth } from "./OuterSpacingWrapper";

export function sectionChildWidth(element: WebsiteElement): SectionChildWidth {
  return element.type === "text" || element.type === "date" ? "intrinsic" : "container";
}
