import type { ScheduleElement } from "../websiteElements/types";

function formatScheduleTime(value: string): string | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = match[2];
  return `${hour % 12 || 12}:${minute} ${hour < 12 ? "AM" : "PM"}`;
}

export function ScheduleElementRenderer({ element, mode, templateKey }: { element: ScheduleElement; mode: "editor" | "public"; templateKey: string }) {
  const items = element.items.flatMap((item) => {
    const time = formatScheduleTime(item.time);
    return time && item.title.trim() ? [{ ...item, formattedTime: time }] : [];
  });
  if (mode === "public" && items.length === 0) return null;
  if (items.length === 0) return <div data-schedule-empty className="rounded-md border border-dashed border-current/30 p-4 text-sm opacity-70">Add an entry to this Schedule.</div>;

  const modern = templateKey === "modern-editorial-v1";
  return <ol data-schedule-block className="m-0 w-full list-none p-0">
    {items.map(({ id, time, formattedTime, title, details }) => <li key={id} className={modern ? "grid min-w-0 gap-2 border-t border-current/20 py-5 sm:grid-cols-[7rem_1fr]" : "grid min-w-0 gap-2 border-t border-current/20 py-4 sm:grid-cols-[7rem_1fr]"}>
      <time {...{ datetime: time }} className="font-semibold tabular-nums">{formattedTime}</time>
      <div className="min-w-0"><div className="break-words font-semibold">{title.trim()}</div>{details.trim() && <div className="mt-1 break-words whitespace-pre-line opacity-75">{details}</div>}</div>
    </li>)}
  </ol>;
}
