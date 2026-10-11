import { useState, type ReactNode } from "react";
import { ColorPreviewContext, createColorPreviewStore } from "./colorPreview";

export function ColorPreviewProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createColorPreviewStore);
  return <ColorPreviewContext.Provider value={store}>{children}</ColorPreviewContext.Provider>;
}
