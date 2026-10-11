import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { createSemanticId } from "../createSemanticId";
import type { AccordionElement } from "../../websiteElements/types";

export function AccordionElementEditor({ element, onChange }: { element: AccordionElement; onChange: (element: AccordionElement) => void }) {
  const update = (index: number, change: Partial<AccordionElement["items"][number]>) => onChange({ ...element, items: element.items.map((item, current) => current === index ? { ...item, ...change } : item) });
  const move = (index: number, offset: -1 | 1) => { const items = [...element.items]; [items[index], items[index + offset]] = [items[index + offset], items[index]]; onChange({ ...element, items }); };
  return <div className="space-y-4" data-accordion-element-editor>
    <h3 className="text-sm font-semibold">Accordion</h3>
    <div className="space-y-3">
      {element.items.map((item, index) => <div key={item.id} className="space-y-2 rounded-md border border-border p-3">
        <Input aria-label={`Item ${index + 1} title`} value={item.title} onChange={(event) => update(index, { title: event.target.value })} />
        <textarea aria-label={`Item ${index + 1} content`} className="min-h-24 w-full rounded-md border border-border bg-background p-2 text-sm" value={item.content} onChange={(event) => update(index, { content: event.target.value })} />
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="secondary" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={14} /> Up</Button>
          <Button type="button" size="sm" variant="secondary" disabled={index === element.items.length - 1} onClick={() => move(index, 1)}><ArrowDown size={14} /> Down</Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => onChange({ ...element, items: element.items.filter((_, current) => current !== index) })}><Trash2 size={14} /> Delete</Button>
        </div>
      </div>)}
    </div>
    <Button type="button" size="sm" variant="secondary" disabled={element.items.length >= 50} onClick={() => onChange({ ...element, items: [...element.items, { id: createSemanticId("accordion-item"), title: "", content: "" }] })}><Plus size={14} /> Add item</Button>
  </div>;
}
