"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminErrorText } from "@/components/admin/admin-preferences";
import { hasSupabaseConfig } from "@/lib/supabase/client";
import { compressImage, mediaTypeForFile, uploadImage, uploadMedia, validateImageFile, validateMediaFile, type UploadMediaType } from "@/lib/supabase/storage";
import type { ImageHistoryEntry } from "@/types/models";

type UploadResult = { imageUrl: string; imagePath: string; mediaType?: UploadMediaType };

export function ImageUploadField({
  label,
  text,
  path,
  imageUrl,
  mediaType,
  imageHistory = [],
  helpText,
  inputHint,
  accept = "image/jpeg,image/png,image/webp,image/gif",
  allowVideo = false,
  maxBytes,
  maxBytesLabel,
  onUploaded,
  onRemoved,
  onRollback,
  onUploadingChange
}: {
  label: string;
  text?: Record<string, string>;
  path: string;
  imageUrl?: string;
  mediaType?: UploadMediaType;
  imageHistory?: ImageHistoryEntry[];
  helpText?: string;
  inputHint?: string;
  accept?: string;
  allowVideo?: boolean;
  maxBytes?: number;
  maxBytesLabel?: string;
  onUploaded: (result: UploadResult) => void;
  onRemoved?: () => void;
  onRollback?: (entry: ImageHistoryEntry) => void;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const [preview, setPreview] = useState(imageUrl || "");
  const [previewMediaType, setPreviewMediaType] = useState<UploadMediaType>(mediaType || mediaTypeFromUrl(imageUrl) || "image");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const storageConfigured = hasSupabaseConfig();
  const isUploading = progress > 0 && progress < 100;

  useEffect(() => {
    setPreview(imageUrl || "");
    setPreviewMediaType(mediaType || mediaTypeFromUrl(imageUrl) || "image");
  }, [imageUrl, mediaType]);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    if (!storageConfigured) {
      setError("Supabase Storage is not configured.");
      event.target.value = "";
      return;
    }
    const validation = allowVideo ? validateMediaFile(file, { maxBytes, maxBytesLabel }) : validateImageFile(file);
    if (validation) {
      setError(validation);
      event.target.value = "";
      return;
    }
    const selectedMediaType = mediaTypeForFile(file);
    setPreview(URL.createObjectURL(file));
    setPreviewMediaType(selectedMediaType);
    setProgress(0);
    onUploadingChange?.(true);
    try {
      const uploadFile = selectedMediaType === "image" ? await compressImage(file) : file;
      const result = allowVideo
        ? await uploadMedia(path, uploadFile, setProgress, { maxBytes, maxBytesLabel })
        : await uploadImage(path, uploadFile, setProgress);
      setPreview(result.imageUrl);
      setPreviewMediaType(result.mediaType ?? selectedMediaType);
      onUploaded(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : text?.imageUploadFailed || "File upload failed.");
    } finally {
      onUploadingChange?.(false);
      event.target.value = "";
    }
  }

  function removeCurrentImage() {
    setError("");
    setPreview("");
    setPreviewMediaType("image");
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
        previewMediaType === "video" ? (
          <video src={preview} className="h-32 w-full rounded-md border object-cover" muted loop playsInline autoPlay aria-hidden />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-32 w-full rounded-md border object-cover" />
        )
      ) : null}
      {helpText ? <p className="text-xs text-muted-foreground">{helpText}</p> : null}
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          disabled={isUploading}
        />
        {inputHint ? <p className="hidden max-w-56 text-xs leading-snug text-muted-foreground sm:block">{inputHint}</p> : null}
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

function mediaTypeFromUrl(url?: string): UploadMediaType | null {
  if (!url) return null;
  const pathname = url.split("?")[0]?.toLowerCase() || "";
  return /\.(mp4|webm)$/.test(pathname) ? "video" : "image";
}
