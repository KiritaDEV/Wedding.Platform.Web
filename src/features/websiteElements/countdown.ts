import type { CountdownElement } from "./types";

export const COUNTDOWN_UNITS = ["days", "hours", "minutes", "seconds"] as const;
export type CountdownUnit = (typeof COUNTDOWN_UNITS)[number];
export type CountdownValue = Record<CountdownUnit, number>;

export const COUNTDOWN_DEFAULT_LABELS: Record<CountdownUnit, string> = { days: "Days", hours: "Hours", minutes: "Minutes", seconds: "Seconds" };
export const COUNTDOWN_EDITOR_SAMPLE: CountdownValue = { days: 12, hours: 8, minutes: 34, seconds: 56 };

export function enabledCountdownUnits(element: Pick<CountdownElement, "units">): CountdownUnit[] {
  return COUNTDOWN_UNITS.filter((unit) => element.units?.[unit] !== false);
}

export function calculateCountdown(targetMs: number, nowMs: number): CountdownValue {
  const remaining = Math.max(0, targetMs - nowMs);
  return {
    days: Math.floor(remaining / 86_400_000),
    hours: Math.floor(remaining / 3_600_000) % 24,
    minutes: Math.floor(remaining / 60_000) % 60,
    seconds: Math.floor(remaining / 1_000) % 60,
  };
}

export function countdownDelay(nowMs: number, secondsVisible: boolean): number {
  const period = secondsVisible ? 1_000 : 60_000;
  const remainder = nowMs % period;
  return remainder === 0 ? period : period - remainder;
}

export function countdownIsZero(value: CountdownValue): boolean {
  return COUNTDOWN_UNITS.every((unit) => value[unit] === 0);
}

