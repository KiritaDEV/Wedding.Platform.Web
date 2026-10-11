import * as SwitchPrimitive from "@radix-ui/react-switch";
import type { ComponentProps } from "react";

export function Switch({ className = "", ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return <SwitchPrimitive.Root
    data-slot="switch"
    className={`peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent outline-none transition-colors data-[state=checked]:bg-accent data-[state=unchecked]:bg-border focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    {...props}
  >
    <SwitchPrimitive.Thumb data-slot="switch-thumb" className="pointer-events-none block size-4 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[1.125rem] data-[state=unchecked]:translate-x-0.5" />
  </SwitchPrimitive.Root>;
}
