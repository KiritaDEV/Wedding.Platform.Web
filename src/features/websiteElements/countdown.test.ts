import { describe, expect, it } from "vitest";
import { calculateCountdown, countdownDelay, enabledCountdownUnits } from "./countdown";
import { countdownElementSchema } from "./schemas";
import { utcToZonedLocal, zonedLocalToUtc } from "./zonedDateTime";
import type { CountdownElement } from "./types";

describe("canonical Countdown", () => {
  const base: CountdownElement = { id: "countdown-1", type: "countdown", editorName: "Countdown 1", target: { source: "event" } };
  it("requires the canonical target and rejects the historical empty shape", () => {
    expect(countdownElementSchema.safeParse(base).success).toBe(true);
    expect(countdownElementSchema.safeParse({ id: "countdown-1", type: "countdown" }).success).toBe(false);
    expect(countdownElementSchema.safeParse({ ...base, extra: true }).success).toBe(false);
  });
  it("treats missing unit flags as visible and rejects an empty countdown", () => {
    expect(enabledCountdownUnits(base)).toEqual(["days", "hours", "minutes", "seconds"]);
    expect(countdownElementSchema.safeParse({ ...base, units: { days: false, hours: false, minutes: false, seconds: false } }).success).toBe(false);
  });
  it("validates custom UTC instants and bounded plain labels", () => {
    expect(countdownElementSchema.safeParse({ ...base, target: { source: "custom", instant: "2027-01-01T04:00:00Z", timeZone: "Asia/Manila" }, labels: { days: "A".repeat(40) } }).success).toBe(true);
    expect(countdownElementSchema.safeParse({ ...base, target: { source: "custom", instant: "2027-01-01 04:00", timeZone: "Asia/Manila" } }).success).toBe(false);
    expect(countdownElementSchema.safeParse({ ...base, labels: { days: "A".repeat(41) } }).success).toBe(false);
  });
  it("calculates boundaries and clamps past targets", () => {
    expect(calculateCountdown(90_061_000, 0)).toEqual({ days: 1, hours: 1, minutes: 1, seconds: 1 });
    expect(calculateCountdown(0, 1)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    expect(countdownDelay(1_250, true)).toBe(750);
    expect(countdownDelay(1_250, false)).toBe(58_750);
  });
  it("round-trips authored local time without using the browser timezone and rejects DST gaps", () => {
    expect(zonedLocalToUtc("2027-01-01", "12:00", "Asia/Manila")).toBe("2027-01-01T04:00:00Z");
    expect(utcToZonedLocal("2027-01-01T04:00:00Z", "Asia/Manila")).toEqual({ date: "2027-01-01", time: "12:00" });
    expect(zonedLocalToUtc("2027-03-14", "02:30", "America/New_York")).toBeNull();
  });
});
