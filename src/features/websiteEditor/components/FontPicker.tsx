import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Input } from "../../../components/ui/Input";
import type { TemplateDesignLibrary } from "../../websiteCapabilities/types";
import { ensureFontPreview } from "../../websiteFonts/fontLoader";
import {
  platformFontStack,
  type FontCategory,
} from "../../websiteFonts/platformFonts";

const categories: Array<{
  id: Exclude<FontCategory, "legacy">;
  label: string;
}> = [
  { id: "serif", label: "Serif" },
  { id: "sans", label: "Sans" },
  { id: "script", label: "Script" },
  { id: "display", label: "Display" },
  { id: "mono", label: "Mono" },
];

export function FontPicker({
  id,
  value,
  role,
  library,
  inheritedLabel = "Inherited",
  disabled = false,
  onChange,
}: {
  id?: string;
  value: string;
  role: "heading" | "body";
  library: TemplateDesignLibrary;
  inheritedLabel?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const generatedId = useId();
  const listboxId = `${id ?? generatedId}-font-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const allowed = useMemo(
    () =>
      library.fontFamilies.filter(
        (font) =>
          font.allowedRoles.includes(role) && font.category !== "legacy",
      ),
    [library, role],
  );
  const recommendations = library.fontRecommendations[role]
    .map((fontId) => allowed.find(({ id: font }) => font === fontId))
    .filter((font): font is (typeof allowed)[number] => Boolean(font));
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matches = normalizedQuery
    ? allowed.filter((font) =>
        `${font.displayName} ${font.category}`
          .toLocaleLowerCase()
          .includes(normalizedQuery),
      )
    : allowed;
  const selected = library.fontFamilies.find((font) => font.id === value);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  function choose(next: string) {
    onChange(next);
  }
  function moveFocus(event: React.KeyboardEvent, direction: -1 | 1) {
    const options = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ??
        [],
    );
    if (!options.length) return;
    const current = options.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    options[(current + direction + options.length) % options.length].focus();
    event.preventDefault();
  }

  return (
    <div
      className="relative min-w-0 flex-1"
      ref={rootRef}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          event.stopPropagation();
        } else if (event.key === "ArrowDown") moveFocus(event, 1);
        else if (event.key === "ArrowUp") moveFocus(event, -1);
      }}
    >
      <button
        id={id}
        className="flex min-h-10 w-full cursor-pointer items-center rounded-sm! border border-border bg-background px-3 py-2 text-left text-sm! outline-none hover:border-foreground-muted focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((current) => !current)}
      >
        <span
          className="min-w-0 flex-1 truncate text-lg lg:text-base"
          style={value ? { fontFamily: platformFontStack(value) } : undefined}
        >
          {selected?.displayName ?? inheritedLabel}
        </span>
        <ChevronDown
          className={`ml-2 shrink-0 text-foreground-muted ${open ? "rotate-180" : ""}`}
          size={16}
        />
      </button>
      {open && (
        <div
          className="absolute right-0 z-[70] mt-1 flex max-h-[min(34rem,70vh)] w-full min-w-0 flex-col overflow-hidden rounded-[10px] border border-border bg-surface shadow-[var(--shadow-dialog)]"
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={`${role} font`}
        >
          <div className="shrink-0 border-b border-border p-2">
            <label className="sr-only" htmlFor={`${listboxId}-search`}>
              Search fonts
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-muted"
                size={15}
              />
              <Input
                id={`${listboxId}-search`}
                className="pl-8 text-sm lg:text-xs"
                value={query}
                placeholder="Search fonts"
                autoFocus
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
          <div className="min-h-0 overflow-y-auto p-1.5">
            <FontOption
              font={null}
              label={inheritedLabel}
              selected={!value}
              onChoose={() => choose("")}
            />
            {!normalizedQuery && recommendations.length > 0 && (
              <FontGroup label="Recommended for this template">
                {recommendations.map((font) => (
                  <FontOption
                    key={`recommended-${font.id}`}
                    font={font}
                    selected={value === font.id}
                    onChoose={() => choose(font.id)}
                  />
                ))}
              </FontGroup>
            )}
            {normalizedQuery ? (
              <FontGroup label="Search results">
                {matches.map((font) => (
                  <FontOption
                    key={font.id}
                    font={font}
                    selected={value === font.id}
                    onChoose={() => choose(font.id)}
                  />
                ))}
                {matches.length === 0 && (
                  <p className="px-2 py-4 text-center text-xs text-foreground-muted">
                    No fonts found.
                  </p>
                )}
              </FontGroup>
            ) : (
              <>
                {categories.map((category) => {
                  const fonts = matches.filter(
                    (font) => font.category === category.id,
                  );
                  return fonts.length ? (
                    <FontGroup key={category.id} label={category.label}>
                      {fonts.map((font) => (
                        <FontOption
                          key={font.id}
                          font={font}
                          selected={value === font.id}
                          onChoose={() => choose(font.id)}
                        />
                      ))}
                    </FontGroup>
                  ) : null;
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FontGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={label}>
      <p className="sticky top-0 z-10 mt-1 bg-surface px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground-muted">
        {label}
      </p>
      {children}
    </section>
  );
}

function FontOption({
  font,
  label,
  selected,
  onChoose,
}: {
  font: TemplateDesignLibrary["fontFamilies"][number] | null;
  label?: string;
  selected: boolean;
  onChoose: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!font || font.source.type !== "googleFonts" || !ref.current) return;
    if (typeof IntersectionObserver === "undefined") return;
    const row = ref.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some(({ isIntersecting }) => isIntersecting)) {
          ensureFontPreview(row.ownerDocument, font.id);
          observer.disconnect();
        }
      },
      { root: row.closest('[role="listbox"]'), rootMargin: "80px" },
    );
    observer.observe(row);
    return () => observer.disconnect();
  }, [font]);
  return (
    <button
      ref={ref}
      className={`flex min-h-11 w-full cursor-pointer items-center rounded-sm! px-2.5 py-2 text-left outline-none hover:bg-surface-muted focus:bg-surface-muted focus:ring-2 focus:ring-inset focus:ring-accent/30 ${selected ? "bg-surface-muted text-foreground" : "text-foreground-muted"}`}
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onChoose}
    >
      <span className="min-w-0 flex-1">
        <span
          className="block truncate text-lg lg:text-base"
          style={font ? { fontFamily: platformFontStack(font.id) } : undefined}
        >
          {font?.displayName ?? label}
        </span>
        {font?.source.type === "system" && (
          <span className="block text-[10px]">System</span>
        )}
      </span>
      {selected && <Check className="ml-2 shrink-0 text-accent" size={15} />}
    </button>
  );
}
