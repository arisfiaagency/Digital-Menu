"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminErrorText } from "@/components/admin/admin-preferences";
import { hasSupabaseConfig } from "@/lib/supabase/client";
import { compressImage, uploadImage, validateImageFile } from "@/lib/supabase/storage";
import type { ImageHistoryEntry } from "@/types/models";

export function ImageUploadField({
  label,
  text,
  path,
  imageUrl,
  imageHistory = [],
  helpText,
  onUploaded,
  onRemoved,
  onRollback,
  onUploadingChange
}: {
  label: string;
  text?: Record<string, string>;
  path: string;
  imageUrl?: string;
  imageHistory?: ImageHistoryEntry[];
  helpText?: string;
  onUploaded: (result: { imageUrl: string; imagePath: string }) => void;
  onRemoved?: () => void;
  onRollback?: (entry: ImageHistoryEntry) => void;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const [preview, setPreview] = useState(imageUrl || "");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const storageConfigured = hasSupabaseConfig();
  const isUploading = progress > 0 && progress < 100;

  useEffect(() => {
    setPreview(imageUrl || "");
  }, [imageUrl]);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    if (!storageConfigured) {
      setError("Supabase Storage is not configured.");
      event.target.value = "";
      return;
    }
    const validation = validateImageFile(file);
    if (validation) {
      setError(validation);
      event.target.value = "";
      return;
    }
    setPreview(URL.createObjectURL(file));
    setProgress(0);
    onUploadingChange?.(true);
    try {
      const uploadFile = await compressImage(file);
      const result = await uploadImage(path, uploadFile, setProgress);
      setPreview(result.imageUrl);
      onUploaded(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : text?.imageUploadFailed || "Image upload failed.");
    } finally {
      onUploadingChange?.(false);
      event.target.value = "";
    }
  }

  function removeCurrentImage() {
    setError("");
    setPreview("");
    onRemoved?.();
  }

  function rollbackImage(entry: ImageHistoryEntry) {
    setError("");
    setPreview(entry.imageUrl);
    onRollback?.(entry);
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="h-32 w-full rounded-md border object-cover" />
      ) : null}
      {helpText ? <p className="text-xs text-muted-foreground">{helpText}</p> : null}
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleChange}
          disabled={isUploading}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={text?.uploadImage || "Upload image"}
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" aria-hidden />
        </Button>
        {imageUrl && onRemoved ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={text?.removeImage || "Remove image"}
            disabled={isUploading}
            onClick={removeCurrentImage}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        ) : null}
      </div>
      {imageHistory.length > 0 && onRollback ? (
        <div className="flex flex-wrap gap-2">
          {imageHistory.map((entry) => (
            <div key={entry.id} className="relative h-16 w-16 overflow-hidden rounded-md border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={entry.imageUrl} alt="" className="h-full w-full object-cover" />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute inset-1 h-7 w-7 bg-background/90 text-foreground hover:bg-background"
                aria-label={text?.rollbackImage || "Restore previous image"}
                disabled={isUploading}
                onClick={() => rollbackImage(entry)}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      {isUploading ? (
        <p className="text-sm text-muted-foreground">{(text?.uploading || "Uploading {progress}%").replace("{progress}", String(progress))}</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{text ? adminErrorText(error, text) : error}</p> : null}
    </div>
  );
}
