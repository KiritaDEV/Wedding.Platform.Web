import { useCallback, useEffect, useRef, useState } from "react";

export function useRevealNewItem() {
  const elements = useRef(new Map<string, HTMLElement>());
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingKey) return;

    const frame = window.requestAnimationFrame(() => {
      const element = elements.current.get(pendingKey);
      if (!element) return;

      element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      setPendingKey(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pendingKey]);

  const register = useCallback(
    (key: string) => (element: HTMLElement | null) => {
      if (element) elements.current.set(key, element);
      else elements.current.delete(key);
    },
    [],
  );

  return { register, reveal: setPendingKey };
}
