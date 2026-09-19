import { GripVertical } from "lucide-react";
import { IconButton } from "../../../components/ui/IconButton";

export function SortableDragHandle({
  label,
  iconSize = 14,
  className = "",
  ...props
}: Omit<React.ComponentProps<typeof IconButton>, "aria-label"> & {
  label: string;
  iconSize?: number;
}) {
  return (
    <IconButton
      type="button"
      size="sm"
      className={`touch-none cursor-grab active:cursor-grabbing ${className}`}
      aria-label={label}
      {...props}
    >
      <GripVertical size={iconSize} aria-hidden="true" />
    </IconButton>
  );
}
