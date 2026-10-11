import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { createSemanticId } from "../createSemanticId";
import type { ScheduleElement } from "../../websiteElements/types";

export function ScheduleElementEditor({ element, onChange }: { element: ScheduleElement; onChange: (element: ScheduleElement) => void }) {
  const update = (index: number, change: Partial<ScheduleElement["items"][number]>) => onChange({ ...element, items: element.items.map((item, current) => current === index ? { ...item, ...change } : item) });
  const move = (index: number, offset: -1 | 1) => { const items = [...element.items]; [items[index], items[index + offset]] = [items[index + offset], items[index]]; onChange({ ...element, items }); };
  return <div className="space-y-4" data-schedule-element-editor>
    <h3 className="text-sm font-semibold">Schedule</h3>
    <div className="space-y-3">
      {element.items.map((item, index) => <div key={item.id} className="space-y-2 rounded-md border border-border p-3">
        <Input aria-label={`Entry ${index + 1} time`} type="time" value={item.time} onChange={(event) => update(index, { time: event.target.value })} />
        <Input aria-label={`Entry ${index + 1} title`} value={item.title} onChange={(event) => update(index, { title: event.target.value })} />
        <textarea aria-label={`Entry ${index + 1} details`} className="min-h-20 w-full rounded-md border border-border bg-background p-2 text-sm" value={item.details} onChange={(event) => update(index, { details: event.target.value })} />
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="secondary" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={14} /> Up</Button>
          <Button type="button" size="sm" variant="secondary" disabled={index === element.items.length - 1} onClick={() => move(index, 1)}><ArrowDown size={14} /> Down</Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => onChange({ ...element, items: element.items.filter((_, current) => current !== index) })}><Trash2 size={14} /> Delete</Button>
        </div>
      </div>)}
    </div>
    <Button type="button" size="sm" variant="secondary" disabled={element.items.length >= 100} onClick={() => onChange({ ...element, items: [...element.items, { id: createSemanticId("schedule-item"), time: "", title: "", details: "" }] })}><Plus size={14} /> Add entry</Button>
  </div>;
}
