import { ColorPreviewScopeContext, scopedColorPreviewTarget, createCustomColorSession, useColorPreviewStore } from "../colorPreview";
import { Check, CircleSlash2, Plus } from "lucide-react";
import { useContext, useEffect, useId, useRef, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { ColorPicker } from "../../../components/ui/ColorPicker";
import type { ProjectColor } from "../../websiteColors/projectColors";
import { colorIdForWebsiteColorChoice, selectedWebsiteColorChoiceId, websiteColorChoices } from "./websiteColorSwatches";

export function WebsiteColorSwatchControl({
  label,
  previewTarget,
  colorId,
  allowedTemplateColorIds,
  templateColors,
  projectColors,
  inheritSelected,
  inheritLabel = "Use Template",
  inheritColor,
  showInheritChoice = true,
  showUnresolvedWarning = true,
  disabled = false,
  onChange,
  onAddColor,
}: {
  label: string;
  previewTarget?: string;
  colorId?: string;
  allowedTemplateColorIds: readonly string[];
  templateColors: readonly { id: string; displayName: string; value: string }[];
  projectColors: readonly ProjectColor[];
  inheritSelected?: boolean;
  inheritLabel?: string;
  inheritColor?: string;
  showInheritChoice?: boolean;
  showUnresolvedWarning?: boolean;
  disabled?: boolean;
  onChange: (colorId: string | undefined) => void;
  onAddColor: (value: string) => Promise<ProjectColor>;
}) {
  const previewStore = useColorPreviewStore();
  const scope = useContext(ColorPreviewScopeContext);
  const target = previewTarget ? scopedColorPreviewTarget(scope, previewTarget) : undefined;
  const session = useRef<ReturnType<typeof createCustomColorSession> | null>(null);
  useEffect(() => () => { session.current?.cancel(); session.current = null; }, [target]);
  const choices = websiteColorChoices(allowedTemplateColorIds, templateColors, projectColors)
    .filter((choice) => showInheritChoice || choice.kind !== "inherit")
    .map((choice) => choice.kind === "inherit" ? { ...choice, label: inheritLabel } : choice);
  const selectedChoiceId = inheritSelected === false && !colorId
    ? undefined
    : selectedWebsiteColorChoiceId(colorId, choices);
  const unresolved = selectedChoiceId === undefined;
  const [open, setOpen] = useState(false);
  const [pickerValue, setPickerValue] = useState("#FFFFFF");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const pickerId = useId();

  const close = () => {
    session.current?.cancel();
    session.current = null;
    setOpen(false);
    setAdding(false);
    setError(null);
    window.setTimeout(() => addButtonRef.current?.focus(), 0);
  };
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const add = async () => {
    const currentSession = session.current;
    if (!currentSession || adding) return;
    setAdding(true);
    setError(null);
    try {
      if (await currentSession.add(pickerValue) && session.current === currentSession) close();
    } catch (reason) {
      if (session.current === currentSession) setError(reason instanceof Error ? reason.message : "Unable to add this color.");
    } finally {
      if (session.current === currentSession) setAdding(false);
    }
  };

  const moveRadioFocus = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1
      : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1
        : 0;
    if (!direction && event.key !== "Home" && event.key !== "End") return;
    const radios = [...event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)')];
    const current = radios.indexOf(event.currentTarget);
    const next = event.key === "Home" ? 0
      : event.key === "End" ? radios.length - 1
        : (current + direction + radios.length) % radios.length;
    event.preventDefault();
    radios[next]?.focus();
    radios[next]?.click();
  };

  return <div ref={rootRef} className="relative min-w-0">
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
      {choices.map((choice) => {
        if (choice.kind === "add") return <button ref={addButtonRef} key="add" type="button" disabled={disabled} className="grid size-9 place-items-center rounded-full border border-dashed border-border bg-surface text-foreground-muted outline-none transition-colors hover:border-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-60" aria-label="Add color" title="Add color" aria-haspopup="dialog" aria-expanded={open} onClick={() => {
          if (open) { close(); return; }
          const committed = choices.find((choice) => choice.kind !== "add" && choice.id === selectedChoiceId);
          const initial = committed && "value" in committed ? committed.value : inheritColor;
          setPickerValue(initial && /^#[0-9a-f]{6}$/i.test(initial) ? initial : "#FFFFFF");
          session.current = createCustomColorSession(target ? previewStore?.begin(target) : undefined, onAddColor, onChange);
          setOpen(true); setError(null);
        }}><Plus size={16} aria-hidden="true" /></button>;
        const selected = choice.id === selectedChoiceId;
        const accessibleLabel = choice.label;
        return <button key={choice.id ?? "inherit"} type="button" role="radio" aria-checked={selected} aria-label={accessibleLabel} title={accessibleLabel} tabIndex={selected ? 0 : -1} disabled={disabled} className={`relative grid size-9 place-items-center rounded-full border bg-surface outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-60 ${selected ? "border-accent ring-2 ring-accent/35 ring-offset-1 ring-offset-surface" : "border-border hover:border-foreground-muted"}`} style={choice.kind === "inherit" ? (inheritColor ? { backgroundColor: inheritColor } : undefined) : { backgroundColor: choice.value }} onKeyDown={moveRadioFocus} onClick={() => { if (open) close(); onChange(colorIdForWebsiteColorChoice(choice)); }}>
          {choice.kind === "inherit" && !inheritColor ? <CircleSlash2 size={18} className="text-foreground-muted" aria-hidden="true" /> : selected ? <Check size={16} className="text-white drop-shadow-[0_1px_2px_rgb(0_0_0/80%)]" strokeWidth={3} aria-hidden="true" /> : null}
        </button>;
      })}
    </div>
    {unresolved && showUnresolvedWarning && <p className="mt-2 text-xs text-danger" role="status">The selected color is unavailable. The Template color is shown instead.</p>}
    {open && <div role="dialog" aria-label="Add Website color" className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-3rem))] rounded-lg border border-border bg-surface p-3 shadow-xl">
      <ColorPicker id={`website-color-${pickerId}`} label="New Website color" value={pickerValue} onChange={(value) => { if (!adding) { setPickerValue(value); session.current?.probe(value); } }} />
      {error && <p className="mt-3 text-xs text-danger" role="alert">{error}</p>}
      <div className="mt-3 flex justify-end gap-2"><Button type="button" size="sm" variant="ghost" onClick={close}>Cancel</Button><Button type="button" size="sm" disabled={adding} onClick={() => void add()}>{adding ? "Adding..." : "Add color"}</Button></div>
    </div>}
  </div>;
}
