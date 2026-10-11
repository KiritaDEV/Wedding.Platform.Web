import { useSyncExternalStore } from "react";

const values = new Map<string, number>();
const listeners = new Map<string, Set<() => void>>();

export function publishBackgroundMinimumZoom(key: string, value: number) {
  if (values.get(key) === value) return;
  values.set(key, value);
  listeners.get(key)?.forEach((listener) => listener());
}

export function useBackgroundMinimumZoom(key?: string): number {
  return useSyncExternalStore(
    (listener) => { if (!key) return () => undefined; const set = listeners.get(key) ?? new Set(); set.add(listener); listeners.set(key, set); return () => { set.delete(listener); }; },
    () => key ? values.get(key) ?? 1 : 1,
    () => 1,
  );
}
