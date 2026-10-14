import { SURFACE_SHADOWS } from "../../websiteRenderer/surfaceEffects";
import { useId, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Textarea } from "../../../components/ui/Textarea";
import { Text } from "../../../components/ui/Text";
import { InspectorField, InspectorSection } from "./InspectorPrimitives";
import { Select } from "../../../components/ui/Select";
import type { MapElement } from "../../websiteElements/types";
import { GOOGLE_MAPS_INPUT_ERROR, parseGoogleMapsEmbed } from "../../websiteElements/googleMaps";

export function MapElementEditor({ element, onChange }: { element: MapElement; onChange: (element: MapElement) => void }) {
  const id = useId();
  const [draft, setDraft] = useState(() => element.embedUrl ? '<iframe src="' + element.embedUrl.replaceAll('&', '&amp;') + '"></iframe>' : "");
  const [error, setError] = useState(false);
  function input(value: string) {
    setDraft(value);
    const embedUrl = parseGoogleMapsEmbed(value);
    setError(!embedUrl);
    if (embedUrl) onChange({ ...element, embedUrl });
  }
  function appearance<K extends "shadow" | "width" | "height" | "alignment" | "cornerRadius">(key: K, value: NonNullable<MapElement["appearance"]>[K]) {
    onChange({ ...element, appearance: { ...element.appearance, [key]: value } });
  }
  return (
    <div className="space-y-5 pt-5" data-map-element-editor>
      <InspectorSection title="Map location">
        <InspectorField label="Google Maps embed HTML">
          <Textarea
            id={id}
            aria-label="Google Maps embed HTML"
            value={draft}
            onChange={(event) => input(event.target.value)}
            rows={6}
            spellCheck={false}
            aria-invalid={error}
            aria-describedby={id + "-help"}
          />
          <Text id={id + "-help"} role={error ? "alert" : undefined} variant="helper" className="mt-2">
            {error ? GOOGLE_MAPS_INPUT_ERROR + " Your last valid map is kept." : "Google Maps > Share > Embed a map > Copy HTML."}
          </Text>
        </InspectorField>
        {element.embedUrl && (
          <Button type="button" size="sm" variant="secondary" onClick={() => {
            const next = { ...element };
            delete next.embedUrl;
            setDraft("");
            setError(false);
            onChange(next);
          }}>
            Remove location
          </Button>
        )}
      </InspectorSection>
      <InspectorSection title="Map appearance">
        <InspectorField label="Maximum Width">
          <Select aria-label="Map maximum width" value={element.appearance?.width ?? "full"} options={[
            { value: "small", label: "Small \u2014 320px" },
            { value: "medium", label: "Medium \u2014 480px" },
            { value: "large", label: "Large \u2014 640px" },
            { value: "full", label: "Full \u2014 Available width" },
          ]} onChange={(value) => appearance("width", value as "small" | "medium" | "large" | "full")} />
        </InspectorField>
        <InspectorField label="Height">
          <Select aria-label="Map height" value={element.appearance?.height ?? "medium"} options={["small", "medium", "large"].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} onChange={(value) => appearance("height", value as "small" | "medium" | "large")} />
        </InspectorField>
        <InspectorField label="Horizontal alignment">
          <Select aria-label="Map horizontal alignment" value={element.appearance?.alignment ?? "center"} options={[{ value: "start", label: "Left" }, { value: "center", label: "Center" }, { value: "end", label: "Right" }]} onChange={(value) => appearance("alignment", value as "start" | "center" | "end")} />
        </InspectorField>
        <InspectorField label="Corner radius">
          <Select aria-label="Map corner radius" value={element.appearance?.cornerRadius ?? "medium"} options={["none", "small", "medium", "large"].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} onChange={(value) => appearance("cornerRadius", value as "none" | "small" | "medium" | "large")} />
        </InspectorField>
        <InspectorField label="Shadow">
          <Select aria-label="Map shadow" value={element.appearance?.shadow ?? "none"} options={SURFACE_SHADOWS.map((value) => ({ value, label: value === "soft" ? "Subtle" : value[0].toUpperCase() + value.slice(1) }))} onChange={(value) => appearance("shadow", value as NonNullable<MapElement["appearance"]>["shadow"])} />
        </InspectorField>
      </InspectorSection>
    </div>
  );
}
