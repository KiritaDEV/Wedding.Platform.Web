import type { AccordionElement } from "../websiteElements/types";

export function AccordionElementRenderer({ element, mode }: { element: AccordionElement; mode: "editor" | "public" }) {
  const items = element.items.filter(({ title, content }) => Boolean(title.trim() && content.trim()));
  if (mode === "public" && items.length === 0) return null;
  if (items.length === 0) return <div data-accordion-empty className="rounded-md border border-dashed border-current/30 p-4 text-sm opacity-70">Add an item to this Accordion.</div>;
  return <div data-accordion-block className="w-full divide-y divide-current/20 border-y border-current/20">
    {items.map(({ id, title, content }) => <details key={id} className="group/accordion">
      <summary className="cursor-pointer list-none py-4 font-semibold outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-4"><span className="min-w-0 break-words">{title.trim() || "Untitled item"}</span><span aria-hidden="true" className="shrink-0 transition-transform group-open/accordion:rotate-180">⌄</span></span>
      </summary>
      {content.trim() && <div className="break-words whitespace-pre-line pb-4 opacity-80">{content}</div>}
    </details>)}
  </div>;
}
