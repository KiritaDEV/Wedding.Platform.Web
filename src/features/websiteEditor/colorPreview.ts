import { createContext, useContext, useSyncExternalStore } from "react";

export function createColorPreviewStore() {
  let preview: { token: symbol; target: string; color?: string } | undefined;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    get(target: string) { return preview?.target === target ? preview.color : undefined; },
    begin(target: string) {
      const token = Symbol();
      preview = { token, target };
      emit();
      return {
        update(color: string) { if (preview?.token === token) { preview = { token, target, color }; emit(); } },
        clear() { if (preview?.token === token) { preview = undefined; emit(); } },
      };
    },
  };
}

export const ColorPreviewScopeContext = createContext("");
export const scopedColorPreviewTarget = (sectionId: string, target: string) => JSON.stringify([sectionId, target]);

export const ColorPreviewContext = createContext<ReturnType<typeof createColorPreviewStore> | null>(null);
export const useColorPreviewStore = () => useContext(ColorPreviewContext);
const noopSubscribe = () => () => undefined;
export function useEditorColorPreview(target: string, enabled: boolean) {
  const store = useColorPreviewStore();
  return useSyncExternalStore(store?.subscribe ?? noopSubscribe, () => enabled ? store?.get(target) : undefined, () => undefined);
}

/** One popover session owns transient state and its captured commit callback. */
export function createCustomColorSession(preview: { update: (color: string) => void; clear: () => void } | undefined, add: (value: string) => Promise<{ id: string }>, commit: (id: string) => void) {
  let active = true;
  let pending = false;
  return {
    probe(value: string) { if (active && !pending) preview?.update(value); },
    cancel() { active = false; preview?.clear(); },
    async add(value: string) {
      if (!active || pending) return false;
      pending = true;
      try {
        const color = await add(value);
        if (!active) return false;
        commit(color.id);
        active = false;
        preview?.clear();
        return true;
      } finally { pending = false; }
    },
  };
}
