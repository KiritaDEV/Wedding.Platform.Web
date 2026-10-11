import { createContext, useContext } from "react";
import type { TextDocument, WebsiteElement } from "../websiteElements/types";
import type { ProjectColor } from "../websiteColors/projectColors";

type WebsiteElementChangeContextValue = {
  onGalleryAdd?: (sectionId: string) => void;
  onElementChange?: (sectionId: string, element: WebsiteElement) => void;
  onTextDocumentChange?: (sectionId: string, elementId: string, document: TextDocument) => void;
  onAddColor?: (value: string) => Promise<ProjectColor>;
};
export const WebsiteElementChangeContext = createContext<WebsiteElementChangeContextValue>({});
export const useWebsiteElementChange = () => useContext(WebsiteElementChangeContext);
