import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Dialog, DialogFooter, DialogHeader } from "../../../components/ui/Dialog";
import { IconButton } from "../../../components/ui/IconButton";
import { Input } from "../../../components/ui/Input";
import { Textarea } from "../../../components/ui/Textarea";
import type { WebsiteSection, WebsiteSectionAppearance } from "../types";
import type { ResolvedWebsiteMedia, ResponsiveViewport } from "../types";
import { useEventWorkspace } from "../../events/workspace/EventWorkspaceContext";
import { MediaPickerDialog } from "./MediaPickerDialog";
import { FocalPointEditor } from "./FocalPointEditor";
import { ZoomedMediaImage } from "../../websiteRenderer/ZoomedMediaImage";
import { createSemanticId } from "../createSemanticId";
import type { PeopleGroup, PeoplePerson } from "../types";
import { useRevealNewItem } from "../useRevealNewItem";
import { BackgroundMediaEditor } from "./BackgroundMediaEditor";

type EditorProps = {
  section: WebsiteSection;
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  appearance?: WebsiteSectionAppearance;
  onAppearanceChange?: (appearance: WebsiteSectionAppearance) => void;
  resolvedMedia: Record<string, ResolvedWebsiteMedia>;
  onMediaResolved: (media: ResolvedWebsiteMedia) => void;
  viewport?: ResponsiveViewport;
};
type Field = {
  name: string;
  label: string;
  multiline?: boolean;
  note?: string;
};

function SimpleEditor(props: EditorProps & { fields: Field[] }) {
  const semantic = props.content.semantic as Record<string, unknown>;
  return (
    <EditorForm>
      {props.section.mediaCapability?.mode === "single" && <SectionMediaEditor {...props} />}
      {props.fields.map((field) => (
        <TextField
          key={field.name}
          label={field.label}
          id={`${props.section.id}-${field.name}`}
          multiline={field.multiline}
          note={field.note}
          value={String(semantic[field.name] ?? "")}
          onChange={(value) =>
            props.onChange({ ...props.content, semantic: { ...semantic, [field.name]: value } })
          }
        />
      ))}
    </EditorForm>
  );
}

function SectionMediaEditor(props: EditorProps) {
  const media = props.appearance?.backgroundMedia ?? null;
  return <BackgroundMediaEditor ownerId={props.section.id} viewport={props.viewport ?? "desktop"} media={media} resolvedMedia={props.resolvedMedia} onMediaResolved={props.onMediaResolved} onChange={(backgroundMedia) => props.onAppearanceChange?.({ ...props.appearance!, backgroundMedia })} />;
}

export function PeopleEditor(props: EditorProps & { hideHeading?: boolean; itemMediaEnabled?: boolean }) {
  const event = useEventWorkspace();
  const reveal = useRevealNewItem();
  const [pickerPersonId, setPickerPersonId] = useState<string | null>(null);
  const [focalPersonId, setFocalPersonId] = useState<string | null>(null);
  const content = props.content as { heading?: string; groups: PeopleGroup[] };
  const groups = Array.isArray(content.groups) ? content.groups : [];
  const changeGroups = (next: PeopleGroup[]) => props.onChange({ ...props.content, groups: next });
  const updateGroup = (index: number, change: Partial<PeopleGroup>) => changeGroups(groups.map((group, current) => current === index ? { ...group, ...change } : group));
  const findPerson = (personId: string | null) => groups.flatMap((group) => group.people).find((person) => person.id === personId);
  const updatePerson = (personId: string, update: (person: PeoplePerson) => PeoplePerson) => changeGroups(groups.map((group) => ({ ...group, people: group.people.map((person) => person.id === personId ? update(person) : person) })));
  const moveGroup = (index: number, target: number) => {
    const next = [...groups];
    [next[index], next[target]] = [next[target], next[index]];
    changeGroups(next);
  };

  return <EditorForm>
    {!props.hideHeading && <TextField label="Heading" id={`${props.section.id}-heading`} value={String(content.heading ?? "")} onChange={(heading) => props.onChange({ ...props.content, heading })} />}
    {props.hideHeading && <label className="block text-sm font-medium">Presentation
      <select className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={(props.content as { appearance?: { presentation?: string } }).appearance?.presentation ?? "portraits"} onChange={(event) => props.onChange({ ...props.content, appearance: { presentation: event.target.value } })}>
        <option value="portraits">Portraits</option><option value="cards">Cards</option><option value="minimal">Minimal</option><option value="namesOnly">Names only</option>
      </select>
    </label>}
    <ItemList title="Groups" onAdd={() => { const id = createSemanticId("group"); reveal.reveal(`group-${id}`); changeGroups([...groups, { id, name: "New group", people: [] }]); }}>
      {groups.map((group, groupIndex) => <div className="rounded-xl border border-border bg-background p-3 xl:rounded-md" key={group.id} ref={reveal.register(`group-${group.id}`)}>
        <TextField label="Group name" id={`${props.section.id}-${group.id}-name`} value={group.name} onChange={(name) => updateGroup(groupIndex, { name })} />
        <div className="mt-3 rounded-md bg-surface-muted p-3">
          <ItemList title="People" onAdd={() => { const id = createSemanticId("person"); reveal.reveal(`person-${id}`); updateGroup(groupIndex, { people: [...group.people, { id, name: "", role: null, media: null }] }); }}>
            {group.people.map((person, personIndex) => <div className="rounded-md border border-border bg-surface p-3" key={person.id} ref={reveal.register(`person-${person.id}`)}>
              <TextField label="Name" id={`${props.section.id}-${person.id}-name`} value={person.name} onChange={(name) => updateGroup(groupIndex, { people: group.people.map((item, current) => current === personIndex ? { ...item, name } : item) })} />
              <div className="mt-3"><TextField label="Role or title (optional)" id={`${props.section.id}-${person.id}-role`} value={person.role ?? ""} onChange={(role) => updateGroup(groupIndex, { people: group.people.map((item, current) => current === personIndex ? { ...item, role: role || null } : item) })} /></div>
              {(props.itemMediaEnabled || props.section.itemMediaCapability?.itemType === "person") && <PersonMediaEditor person={person} resolvedMedia={props.resolvedMedia} onChoose={() => setPickerPersonId(person.id)} onAdjust={() => setFocalPersonId(person.id)} onRemove={() => updatePerson(person.id, (current) => ({ ...current, media: null }))} />}
              <ItemActions label={person.name.trim() || "person"} index={personIndex} length={group.people.length} onRemove={() => updateGroup(groupIndex, { people: group.people.filter((_, current) => current !== personIndex) })} onMove={(target) => {
                const people = [...group.people];
                [people[personIndex], people[target]] = [people[target], people[personIndex]];
                updateGroup(groupIndex, { people });
              }} />
            </div>)}
          </ItemList>
        </div>
        <ItemActions label={group.name.trim() || "group"} index={groupIndex} length={groups.length} onRemove={() => changeGroups(groups.filter((_, current) => current !== groupIndex))} onMove={(target) => moveGroup(groupIndex, target)} />
      </div>)}
    </ItemList>
    <MediaPickerDialog open={pickerPersonId !== null} eventId={event.id} selectedAssetId={findPerson(pickerPersonId)?.media?.assetId ?? undefined} onClose={() => setPickerPersonId(null)} onSelect={(asset) => { const personId = pickerPersonId; if (!personId) return; props.onMediaResolved({ id: asset.id, originalFilename: asset.originalFilename, width: asset.width, height: asset.height, web: asset.variants.web }); updatePerson(personId, (person) => ({ ...person, media: { assetId: asset.id } })); setPickerPersonId(null); }} />
    <PersonFocalDialog person={findPerson(focalPersonId)} media={props.resolvedMedia} onClose={() => setFocalPersonId(null)} onChange={({ point: focalPoint, zoom }) => { if (focalPersonId) updatePerson(focalPersonId, (person) => person.media ? { ...person, media: { ...person.media, focalPoint, zoom } } : person); }} />
  </EditorForm>;
}

function PersonMediaEditor({ person, resolvedMedia, onChoose, onAdjust, onRemove }: { person: PeoplePerson; resolvedMedia: Record<string, ResolvedWebsiteMedia>; onChoose: () => void; onAdjust: () => void; onRemove: () => void }) {
  const asset = person.media?.assetId ? resolvedMedia[person.media.assetId] : undefined;
  return <section className="mt-3 rounded-md border border-border bg-surface-muted p-3">
    <h4 className="text-xs font-semibold">Photo</h4>
    {asset && person.media ? <div className="mt-2 flex gap-3"><ZoomedMediaImage className="size-16 rounded-full" height={asset.web.height} reference={person.media} src={asset.web.url} width={asset.web.width} /><div className="min-w-0 flex-1"><p className="truncate text-xs text-foreground-muted">{asset.originalFilename}</p><div className="mt-2 flex flex-wrap gap-2"><Button size="sm" type="button" variant="secondary" onClick={onChoose}>Change</Button><Button size="sm" type="button" variant="secondary" onClick={onAdjust}>Adjust image</Button><Button size="sm" type="button" variant="ghost" onClick={onRemove}>Remove</Button></div></div></div> : <div className="mt-2"><p className="text-xs text-foreground-muted">No photo selected</p><Button className="mt-2" size="sm" type="button" variant="secondary" onClick={onChoose}>Choose from Media</Button></div>}
  </section>;
}

function PersonFocalDialog({ person, media, onClose, onChange }: { person?: PeoplePerson; media: Record<string, ResolvedWebsiteMedia>; onClose: () => void; onChange: (framing: { point: { x: number; y: number }; zoom: number }) => void }) {
  const reference = person?.media;
  const asset = reference?.assetId ? media[reference.assetId] : undefined;
  return <Dialog open={Boolean(person && asset)} onClose={onClose} titleId="person-focal-title" size="sm">
    <DialogHeader title="Adjust image" titleId="person-focal-title" description={`Position and frame ${person?.name || "this person's"} photo.`} onClose={onClose} />
    {asset && reference && <div className="mt-4"><FocalPointEditor url={asset.web.url} point={reference.focalPoint ?? { x: 0.5, y: 0.5 }} zoom={reference.zoom} onChange={onChange} /></div>}
    <DialogFooter className="mt-5"><Button type="button" onClick={onClose}>Done</Button></DialogFooter>
  </Dialog>;
}

function EditorForm({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-1 pb-6 xl:px-0 xl:pb-6">
        {children}
      </div>
    </div>
  );
}

function TextField({
  label,
  id,
  value,
  onChange,
  multiline = false,
  note,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  note?: string;
}) {
  return (
    <div>
      <label
        className="block text-xs! xl:text-sm font-medium mb-0.5"
        htmlFor={id}
      >
        {label}
      </label>
      {multiline ? (
        <Textarea
          id={id}
          className="mt-1 rounded-sm! bg-surface text-sm! xl:py-1.5 xl:text-xs!"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          id={id}
          className="mt-1 bg-surface text-sm! xl:py-1.5 xl:text-xs!"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {note && <p className="mt-1.5 text-xs text-foreground-muted">{note}</p>}
    </div>
  );
}

function ItemList({
  title,
  onAdd,
  children,
}: {
  title: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <IconButton
          aria-label={`Add ${title.toLowerCase()}`}
          size="sm"
          type="button"
          onClick={onAdd}
        >
          <Plus size={18} aria-hidden="true" />
        </IconButton>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
function ItemActions({
  label,
  index,
  length,
  onRemove,
  onMove,
}: {
  label: string;
  index: number;
  length: number;
  onRemove: () => void;
  onMove: (to: number) => void;
}) {
  return (
    <div className="mt-2 flex justify-end gap-1">
      <IconButton
        type="button"
        size="sm"
        disabled={index === 0}
        onClick={() => onMove(index - 1)}
        aria-label={`Move ${label} up`}
      >
        <ArrowUp size={15} />
      </IconButton>
      <IconButton
        type="button"
        size="sm"
        disabled={index === length - 1}
        onClick={() => onMove(index + 1)}
        aria-label={`Move ${label} down`}
      >
        <ArrowDown size={15} />
      </IconButton>
      <IconButton
        type="button"
        size="sm"
        variant="danger"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
      >
        <Trash2 size={15} />
      </IconButton>
    </div>
  );
}

export function SectionEditor(props: EditorProps) {
  switch (props.section.type) {
    case "blank":
      return <div className="rounded-xl border border-dashed border-border bg-surface-muted p-4 text-sm text-foreground-muted">Add and arrange blocks from the Section row in Structure.</div>;
    case "hero":
      return <EditorForm><SectionMediaEditor {...props} /><p className="text-sm text-foreground-muted">Add and arrange Hero content blocks from the Structure panel.</p></EditorForm>;
    case "gallery":
      return (
        <SimpleEditor
          {...props}
          fields={[
            {
              name: "heading",
              label: "Heading",
              note: "Photo management will be added in a later phase.",
            },
          ]}
        />
      );
    case "rsvp":
      return (
        <SimpleEditor
          {...props}
          fields={[
            { name: "heading", label: "Heading" },
            { name: "description", label: "Description", multiline: true },
            {
              name: "buttonLabel",
              label: "Button label",
              note: "This controls Website presentation only. Guest RSVP configuration is managed separately.",
            },
          ]}
        />
      );
    default:
      return (
        <div className="rounded-xl bg-surface-muted p-4 text-sm text-foreground-muted">
          This section type is not supported by this version of the editor.
        </div>
      );
  }
}
