import * as React from "react";
import { cn } from "@/lib/utils";

type Props = React.ComponentProps<"input">;

function Input({ className, type, ...props }: Props) {
  // Safari  modifying the styling
  const timeFix =
    type === "time"
      ? [
          "h-10 md:h-9 min-w-0",
          "[appearance:none] [-webkit-appearance:none]",
          "[font-variant-numeric:tabular-nums]",
          "[&::-webkit-calendar-picker-indicator]:hidden",
          "[&::-webkit-clear-button]:hidden",
          "[&::-webkit-inner-spin-button]:hidden",
          "[&::-webkit-datetime-edit]:p-0",
          "[&::-webkit-datetime-edit-hour-field]:p-0",
          "[&::-webkit-datetime-edit-minute-field]:p-0",
          "[&::-webkit-datetime-edit-ampm-field]:p-0",
        ].join(" ")
      : undefined;

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        timeFix, // only applied to type="time"
        className
      )}
      {...props}
    />
  );
}

export { Input };
