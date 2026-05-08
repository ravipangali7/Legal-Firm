import * as React from "react"
import type { CSSProperties } from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    indicatorClassName?: string;
    /** Merged with the transform; use for dynamic colors so Tailwind purge cannot strip them. */
    indicatorStyle?: CSSProperties;
  }
>(({ className, value, indicatorClassName, indicatorStyle, ...props }, ref) => {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0
  return (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn("h-full w-full flex-1 bg-primary transition-all duration-500", indicatorClassName)}
      style={{
        transform: `translateX(-${100 - n}%)`,
        ...indicatorStyle,
      }}
    />
  </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
