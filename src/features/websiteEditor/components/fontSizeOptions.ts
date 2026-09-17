import { TEXT_SIZES } from "../../websiteElements/text";

const labels: Record<(typeof TEXT_SIZES)[number], string> = {
  xs: "Extra small · 12 px",
  s: "Small · 14 px",
  m: "Body · 16 px",
  l: "Large · 24 px",
  xl: "Heading · 36 px",
  "2xl": "Heading large · 48 px",
  "3xl": "Display · 64 px",
  "4xl": "Display large · 80 px",
  "5xl": "Display XL · 96 px",
  "6xl": "Display 2XL · 120 px",
  "7xl": "Display 3XL · 144 px",
};

export const FONT_SIZE_OPTIONS = TEXT_SIZES.map((value) => ({ value, label: labels[value] }));
