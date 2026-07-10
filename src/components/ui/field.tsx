import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import type { LocaleDirection } from "@/lib/i18n/config";

export function Field({
  label,
  htmlFor,
  labelDir,
  error,
  children
}: {
  label: string;
  htmlFor?: string;
  labelDir?: LocaleDirection;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} dir={labelDir}>
        {label}
      </Label>
      {children}
      {error ? (
        <p dir={labelDir} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
