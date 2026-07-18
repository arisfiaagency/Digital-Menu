"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { LocaleDirection } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";

/**
 * Site-styled confirm/cancel dialog that replaces the browser's native
 * `window.confirm` / `tel:` prompts. It rises up from the bottom on phones
 * (mobile-first) and centers on desktop, dims + blurs the page behind it, and
 * closes on Escape or an outside tap. Purely presentational and controlled by
 * `open` so both admin (pass `text.*`) and public (pass translated strings) can
 * reuse it. RTL-aware via `dir`.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = "default",
  loading = false,
  dir = "ltr",
  icon
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "default" | "destructive";
  loading?: boolean;
  dir?: LocaleDirection;
  icon?: ReactNode;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Escape to cancel + lock body scroll while the dialog is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onCancel();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    confirmRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="dialog-backdrop fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={() => {
        if (!loading) onCancel();
      }}
    >
      <div
        dir={dir}
        className="dialog-panel w-full max-w-md rounded-2xl border bg-card p-5 text-card-foreground shadow-2xl sm:p-6"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {icon ? (
          <div
            className={cn(
              "mb-3 flex h-11 w-11 items-center justify-center rounded-full",
              variant === "destructive" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
            )}
          >
            {icon}
          </div>
        ) : null}
        <h2 className="text-lg font-bold">{title}</h2>
        {description ? <div className="mt-2 text-sm text-muted-foreground">{description}</div> : null}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onCancel} disabled={loading} className="sm:min-w-[6rem]">
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={loading}
            className="sm:min-w-[6rem]"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
