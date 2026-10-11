import { Check, Palette, Type } from "lucide-react";
import { DesignGroup } from "../../../components/ui/DesignGroup";
import { Heading } from "../../../components/ui/Heading";
import { SelectableCard } from "../../../components/ui/SelectableCard";
import { Text } from "../../../components/ui/Text";
import type { WebsiteDesignSettings } from "../types";
import { globalDesignOptions } from "../../websiteCapabilities/lookup";
import type { GlobalDesignCapability } from "../../websiteCapabilities/types";
import type { TemplateDesignLibrary } from "../../websiteCapabilities/types";
import { designPreviewFor } from "../../websiteTemplates/designPreviews";
import { FontPicker } from "./FontPicker";

export function DesignPanel({
  settings,
  capability,
  library,
  error,
  eventName,
  templateKey,
  onChange,
}: {
  settings: WebsiteDesignSettings;
  capability: GlobalDesignCapability;
  library: TemplateDesignLibrary;
  error: string | null;
  eventName: string;
  templateKey: string;
  onChange: (settings: WebsiteDesignSettings) => void;
}) {
  const preview = designPreviewFor(templateKey);
  const colorThemes = globalDesignOptions(capability, 'colorTheme');
  const fontSets = globalDesignOptions(capability, 'fontSet');
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-6 sm:px-2 xl:px-0 xl:pb-6">
        <div className="hidden xl:mb-4 xl:block">
          <Heading className="xl:text-base!" level={2} variant="panel">Design</Heading>
          <Text className="mt-1 xl:text-xs" variant="muted">
            Customize this Template with curated visual choices.
          </Text>
        </div>
      {error && (
        <Text
          className="mb-4 rounded-xl bg-danger-muted p-3"
          variant="error"
          role="alert"
        >
          {error}
        </Text>
      )}
      <DesignGroup icon={<Palette size={16} />} title="Color">
        <div className="grid grid-cols-2 gap-2">
          {colorThemes.map((option) => {
            const selected = settings.colorTheme === option.key;
            return (
              <SelectableCard
                className="flex items-center gap-2 p-2.5 text-sm! data-[selected=true]:bg-surface-muted xl:p-2 xl:text-xs!"
                key={option.key}
                selected={selected}
                onClick={() =>
                  onChange({
                    ...settings,
                    colorTheme:
                      option.key as WebsiteDesignSettings["colorTheme"],
                  })
                }
              >
                <span
                  className="h-6 w-6 rounded-full border border-black/10"
                  style={{
                    background: preview?.colorSwatches[option.key] ?? "#777",
                  }}
                />{" "}
                <span className="flex-1">{option.displayName}</span>
                {selected && <Check size={14} className="text-accent" />}
              </SelectableCard>
            );
          })}
        </div>
      </DesignGroup>
      <DesignGroup icon={<Type size={16} />} title="Font">
        <div className="space-y-2">
          {fontSets.map((option) => {
            const selected = settings.fontSet === option.key;
            const family = preview?.fontClasses[option.key] ?? "font-sans";
            return (
              <SelectableCard
                className="w-full p-3 data-[selected=true]:bg-surface-muted xl:p-2.5"
                key={option.key}
                selected={selected}
                onClick={() =>
                  onChange({
                    ...settings,
                    fontSet: option.key as WebsiteDesignSettings["fontSet"],
                  })
                }
              >
                <span className="flex items-center justify-between text-sm! xl:text-xs! font-medium">
                  <span>{option.displayName}</span>
                  {selected && <Check size={14} className="text-accent" />}
                </span>
                <span className={`mt-1 block truncate text-lg ${family}`}>
                  {eventName}
                </span>
              </SelectableCard>
            );
          })}
        </div>
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <p className="text-xs font-medium">Advanced typography</p>
          <ProjectFontControl label="Heading Font" role="heading" value={settings.projectDefaults.headingFontId ?? ""} library={library} onChange={(fontId) => onChange({ ...settings, projectDefaults: updateProjectFont(settings.projectDefaults, "headingFontId", fontId) })} />
          <ProjectFontControl label="Body Font" role="body" value={settings.projectDefaults.bodyFontId ?? ""} library={library} onChange={(fontId) => onChange({ ...settings, projectDefaults: updateProjectFont(settings.projectDefaults, "bodyFontId", fontId) })} />
        </div>
      </DesignGroup>
      </div>
    </section>
  );
}

function ProjectFontControl({ label, role, value, library, onChange }: { label: string; role: "heading" | "body"; value: string; library: TemplateDesignLibrary; onChange: (value: string) => void }) {
  return <div><label className="mb-1.5 block text-xs font-medium">{label}</label><FontPicker value={value} role={role} library={library} inheritedLabel="Use typography preset" onChange={onChange} /></div>;
}

function updateProjectFont(defaults: WebsiteDesignSettings["projectDefaults"], key: "headingFontId" | "bodyFontId", fontId: string) {
  const next = { ...defaults };
  if (fontId) next[key] = fontId;
  else delete next[key];
  return next;
}
