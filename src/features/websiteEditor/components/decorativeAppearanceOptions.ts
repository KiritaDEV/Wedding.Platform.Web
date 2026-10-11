export const decorativeHelpers: Record<"texture" | "pattern", Record<string, string>> = {
  texture: { none: "No texture", paper: "Subtle paper texture", fabric: "Soft woven texture", grain: "Fine surface grain" },
  pattern: { none: "No pattern", botanical: "Organic decorative motif", geometric: "Structured repeating motif", heritage: "Traditional-inspired motif" },
};
export const decorativeLabel = (value: string) => value[0].toUpperCase() + value.slice(1);
