import type { PeopleElement } from "../websiteElements/types";
import type { ResolvedWebsiteMedia } from "../websiteEditor/types";
import { ZoomedMediaImage } from "./ZoomedMediaImage";

export function PeopleElementRenderer({ element, mode, templateKey, media }: {
  element: PeopleElement;
  mode: "editor" | "public";
  templateKey: string;
  media: Record<string, ResolvedWebsiteMedia>;
}) {
  const modern = templateKey.includes("modern");
  const presentation = element.appearance?.presentation ?? "portraits";
  const groups = element.groups.flatMap((group) => {
    const people = mode === "public" ? group.people.filter((person) => person.name.trim()) : group.people;
    return (mode === "editor" || (group.name.trim() && people.length)) ? [{ ...group, people }] : [];
  });
  if (groups.length === 0) return mode === "editor" ? <div data-people-empty className="rounded-md border border-dashed border-current/30 p-4 text-sm opacity-70">Add groups and people to this People block.</div> : null;
  const text = modern ? "var(--me-text)" : "var(--cf-text)";
  const accent = modern ? "var(--me-section-accent)" : "var(--cf-section-accent)";
  const headingFont = modern ? "var(--me-heading-font)" : "var(--cf-heading-font)";
  const showImages = presentation !== "namesOnly";
  return <div data-people-block className={`grid w-full min-w-0 gap-7 ${groups.length > 1 ? "md:grid-cols-2" : ""}`}>
    {groups.map((group) => <section data-people-group className="min-w-0" key={group.id}>
      <h3 className="break-words text-xl [overflow-wrap:anywhere]" style={{ color: text, fontFamily: headingFont }}>{group.name.trim() || "Untitled group"}</h3>
      <ul data-people-list className={`mt-4 min-w-0 ${showImages && group.people.some((person) => person.media && media[person.media.assetId]) && presentation !== "minimal" ? "grid grid-cols-1 gap-5 sm:grid-cols-2" : "space-y-3"}`}>
        {group.people.map((person) => {
          const asset = showImages && person.media ? media[person.media.assetId] : undefined;
          return <li data-person-card className="min-w-0" key={person.id}>
            {asset && person.media && <ZoomedMediaImage className={`${presentation === "cards" ? "aspect-[4/5] rounded-sm" : "aspect-square rounded-full"} mb-3 w-full max-w-32 object-cover`} height={asset.web.height} reference={person.media} src={asset.web.url} width={asset.web.width} />}
            <span className="block break-words [overflow-wrap:anywhere]" style={{ color: text }}>{person.name.trim() || "Unnamed person"}</span>
            {person.role?.trim() && <span className="mt-0.5 block break-words text-xs [overflow-wrap:anywhere]" style={{ color: accent }}>{person.role}</span>}
          </li>;
        })}
      </ul>
    </section>)}
  </div>;
}
