import * as React from "react";
import { cn } from "@/lib/utils/cn";

// Types where the browser changes the value on mouse-wheel / trackpad scroll while focused.
// We block that so only the keyboard and clicks (arrows/steppers) can change these fields.
const WHEEL_GUARDED_TYPES = new Set(["number", "range", "date", "datetime-local", "month", "time", "week"]);

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, onWheel, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      onWheel={(event) => {
        if (type && WHEEL_GUARDED_TYPES.has(type) && document.activeElement === event.currentTarget) {
          // Blur so the wheel can't increment the value; the page still scrolls normally.
          event.currentTarget.blur();
        }
        onWheel?.(event);
      }}
      className={cn(
        "focus-ring flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
