export function zonedLocalToUtc(date: string, time: string, timeZone: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  try { new Intl.DateTimeFormat("en-US", { timeZone }).format(); } catch { return null; }
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = desired;
  for (let index = 0; index < 4; index += 1) {
    const parts = localParts(candidate, timeZone);
    const represented = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
    candidate += desired - represented;
  }
  const resolved = localParts(candidate, timeZone);
  if (resolved.year !== year || resolved.month !== month || resolved.day !== day || resolved.hour !== hour || resolved.minute !== minute) return null;
  return new Date(candidate).toISOString().replace(".000Z", "Z");
}

export function utcToZonedLocal(instant: string, timeZone: string): { date: string; time: string } | null {
  const timestamp = Date.parse(instant);
  if (!Number.isFinite(timestamp)) return null;
  try {
    const value = localParts(timestamp, timeZone);
    return { date: `${value.year}-${pad(value.month)}-${pad(value.day)}`, time: `${pad(value.hour)}:${pad(value.minute)}` };
  } catch { return null; }
}

function localParts(timestamp: number, timeZone: string) {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(timestamp).filter(({ type }) => type !== "literal").map(({ type, value }) => [type, Number(value)]));
  return values as { year: number; month: number; day: number; hour: number; minute: number };
}
const pad = (value: number) => String(value).padStart(2, "0");

