import { z } from "zod";

export const PROJECT_COLOR_PREFIX = "project-color-";
export const MAX_PROJECT_COLORS = 32;

export const projectColorSchema = z.object({
  id: z.string().regex(/^project-color-[0-7][0-9A-HJKMNP-TV-Z]{25}$/),
  value: z.string().regex(/^#[0-9A-F]{6}$/),
}).strict();

export const projectColorsSchema = z.array(projectColorSchema).max(MAX_PROJECT_COLORS).superRefine((colors, context) => {
  const ids = new Set<string>();
  const values = new Set<string>();
  colors.forEach((color, index) => {
    if (ids.has(color.id)) context.addIssue({ code: "custom", message: "Project color IDs must be unique", path: [index, "id"] });
    if (values.has(color.value)) context.addIssue({ code: "custom", message: "Project color values must be unique", path: [index, "value"] });
    ids.add(color.id);
    values.add(color.value);
  });
});

export type ProjectColor = z.infer<typeof projectColorSchema>;

export function isProjectColorId(colorId: string): boolean {
  return colorId.startsWith(PROJECT_COLOR_PREFIX);
}

export function resolveWebsiteColor(
  colorId: string | undefined,
  templateDesignLibrary: { colors: Array<{ id: string; value: string }> },
  projectColors: readonly ProjectColor[],
): string | undefined {
  if (!colorId) return undefined;
  return isProjectColorId(colorId)
    ? projectColors.find(({ id }) => id === colorId)?.value
    : templateDesignLibrary.colors.find(({ id }) => id === colorId)?.value;
}
