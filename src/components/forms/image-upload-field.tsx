"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, RotateCcw, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminErrorText } from "@/components/admin/admin-preferences";
import { cn } from "@/lib/utils/cn";
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
      {/* Tap / hover the tile to upload. When something is uploaded we only keep a
          delete button; the file picker is triggered by tapping the tile itself. */}
      <div className="group relative">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          aria-label={preview ? text?.changeImage || "Change image" : text?.uploadImage || "Upload image"}
          className={cn(
            "relative flex h-36 w-full items-center justify-center overflow-hidden rounded-md border border-dashed bg-muted/30 text-center transition-colors hover:border-primary/60 hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60",
            preview && "border-solid"
          )}
        >
          {preview ? (
            previewMediaType === "video" ? (
              <video src={preview} className="h-full w-full object-cover" muted loop playsInline autoPlay aria-hidden />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-full w-full object-cover" />
            )
          ) : (
            <span className="flex flex-col items-center gap-1.5 px-4 text-muted-foreground">
              <ImagePlus className="h-6 w-6" aria-hidden />
              <span className="text-sm font-medium">{text?.noImageYet || "No picture uploaded yet"}</span>
            </span>
          )}
          <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <Upload className="h-6 w-6" aria-hidden />
            <span className="text-sm font-medium">{preview ? text?.changeImage || "Change photo" : text?.uploadImage || "Upload photo"}</span>
          </span>
        </button>
        {preview && onRemoved ? (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label={text?.removeImage || "Remove image"}
            disabled={isUploading}
            onClick={removeCurrentImage}
            className="absolute right-2 top-2 h-8 w-8 bg-background/90 shadow-sm hover:bg-background"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={isUploading}
        className="hidden"
      />
      {helpText ? <p className="text-xs text-muted-foreground">{helpText}</p> : null}
      {inputHint ? <p className="text-xs leading-snug text-muted-foreground">{inputHint}</p> : null}
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
