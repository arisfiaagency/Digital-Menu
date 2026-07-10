"use client";

import { cn } from "@/lib/utils/cn";

export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled = false
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "focus-ring inline-flex h-6 w-11 items-center rounded-full border transition",
        checked ? "bg-primary" : "bg-muted",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <span
        className={cn(
          "h-5 w-5 rounded-full bg-white shadow transition",
          checked ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0.5 rtl:-translate-x-0.5"
        )}
      />
    </button>
  );
}
