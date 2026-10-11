import { useSyncExternalStore } from "react";
import sources from "virtual:decorative-sources";

const repositorySources = new Set(sources);
const failedSources = new Set<string>();
const probes = new Map<string, HTMLImageElement>();
const listeners = new Set<() => void>();
let revision = 0;

export function isDecorativeSourceAvailable(source: string): boolean {
  return repositorySources.has(source) && !failedSources.has(source);
}

export function observeDecorativeSource(source: string): void {
  if (typeof Image === "undefined" || !isDecorativeSourceAvailable(source) || probes.has(source)) return;
  const probe = new Image();
  probes.set(source, probe);
  probe.onerror = () => {
    failedSources.add(source);
    revision++;
    listeners.forEach((listener) => listener());
  };
  probe.src = source;
}

export const subscribeDecorativeSourceAvailability = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const snapshot = () => revision;
const serverSnapshot = () => 0;

export function useDecorativeSourceAvailability(): void {
  useSyncExternalStore(subscribeDecorativeSourceAvailability, snapshot, serverSnapshot);
}
