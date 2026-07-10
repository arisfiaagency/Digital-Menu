import * as React from "react";
import { cn } from "@/lib/utils/cn";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn("focus-ring flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm", className)}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";
