import { NumericPercentageControl } from "./NumericPercentageControl";

export function DecorativeStrengthControl({ label, value, defaultValue, onChange }: { label: "Texture Strength" | "Pattern Strength"; value?: number; defaultValue: number; onChange: (value?: number) => void }) {
  const subject = label === "Texture Strength" ? "texture" : "pattern";
  return <NumericPercentageControl label={label} subject={`${subject} strength`} value={value} defaultValue={defaultValue} minimum={10} maximum={100} step={5} onChange={onChange} />;
}
