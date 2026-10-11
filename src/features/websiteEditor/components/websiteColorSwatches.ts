import type { ProjectColor } from "../../websiteColors/projectColors";

export type WebsiteColorChoice =
  | { kind: "inherit"; id: null; label: string }
  | { kind: "template"; id: string; label: string; value: string }
  | { kind: "project"; id: string; label: string; value: string }
  | { kind: "add"; id: "add"; label: "Add color" };

export function websiteColorChoices(
  allowedTemplateColorIds: readonly string[],
  templateColors: readonly { id: string; displayName: string; value: string }[],
  projectColors: readonly ProjectColor[],
): WebsiteColorChoice[] {
  const allowed = new Set(allowedTemplateColorIds);
  return [
    { kind: "inherit", id: null, label: "Use Template" },
    ...templateColors.filter(({ id }) => allowed.has(id)).map(({ id, displayName, value }) => ({ kind: "template" as const, id, label: displayName, value })),
    ...projectColors.map(({ id, value }) => ({ kind: "project" as const, id, value, label: `Custom color ${value}` })),
    { kind: "add", id: "add", label: "Add color" },
  ];
}

export function selectedWebsiteColorChoiceId(colorId: string | undefined, choices: readonly WebsiteColorChoice[]): string | null | undefined {
  if (!colorId) return null;
  return choices.some((choice) => choice.kind !== "add" && choice.id === colorId) ? colorId : undefined;
}

export function colorIdForWebsiteColorChoice(choice: Exclude<WebsiteColorChoice, { kind: "add" }>): string | undefined {
  return choice.kind === "inherit" ? undefined : choice.id;
}
