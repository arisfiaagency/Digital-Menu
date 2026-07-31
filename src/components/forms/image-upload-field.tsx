"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, ImagePlus, RotateCcw, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminErrorText } from "@/components/admin/admin-preferences";
import { cn } from "@/lib/utils/cn";
import { hasStorageConfig } from "@/lib/storage";
import { compressImage, uploadImage, uploadMenuItemImage, validateImageFile } from "@/lib/storage";
import { isVideoMediaUrl } from "@/lib/storage/media-url";
import type { ImageHistoryEntry } from "@/types/models";

type UploadResult = {
  imageUrl: string;
  imagePath: string;
  thumbUrl?: string;
  thumbPath?: string;
};

export function ImageUploadField({
  label,
  text,
  path,
  fileName,
  imageUrl,
  imageHistory = [],
  helpText,
  inputHint,
  accept = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm",
  /** When true, existing remote media is not fetched until Preview is pressed. */
  deferPreview = false,
  /** Menu items: auto-create a small card thumb alongside the full image. */
  generateThumb = false,
  onUploaded,
  onRemoved,
  onRollback,
  onUploadingChange
}: {
  label: string;
  text?: Record<string, string>;
  path: string;
  /** Used as the R2 object name, e.g. "Espresso" → espresso.webp */
  fileName?: string;
  imageUrl?: string;
  imageHistory?: ImageHistoryEntry[];
  helpText?: string;
  inputHint?: string;
  accept?: string;
  deferPreview?: boolean;
  generateThumb?: boolean;
  onUploaded: (result: UploadResult) => void;
  onRemoved?: () => void;
  onRollback?: (entry: ImageHistoryEntry) => void;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const [preview, setPreview] = useState(() => (deferPreview ? "" : imageUrl || ""));
  const [previewIsVideo, setPreviewIsVideo] = useState(() => !deferPreview && isVideoMediaUrl(imageUrl));
  const [revealed, setRevealed] = useState(!deferPreview);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const storageConfigured = hasStorageConfig();
  const isUploading = progress > 0 && progress < 100;
  const hasStoredMedia = Boolean(imageUrl);
  const showDeferredGate = deferPreview && hasStoredMedia && !revealed && !isUploading && !preview;

  useEffect(() => {
    if (deferPreview && !revealed) {
      // Keep the remote URL out of the DOM until Preview — still track the stored path.
      setPreview("");
      setPreviewIsVideo(false);
      return;
    }
    setPreview(imageUrl || "");
    setPreviewIsVideo(isVideoMediaUrl(imageUrl));
  }, [imageUrl, deferPreview, revealed]);

  // Shared by the file input and drag-and-drop. Reverts the preview if the upload fails.
  async function processFile(file: File) {
    setError("");
    if (!storageConfigured) {
      setError("Image storage is not configured.");
      return;
    }
    const validation = validateImageFile(file);
    if (validation) {
      setError(validation);
      return;
    }
    setRevealed(true);
    setPreview(URL.createObjectURL(file));
    setPreviewIsVideo(file.type.startsWith("video/"));
    setProgress(0);
    onUploadingChange?.(true);
    try {
      const result = generateThumb
        ? await uploadMenuItemImage(path, file, setProgress, fileName)
        : await uploadImage(path, await compressImage(file), setProgress, fileName);
      setPreview(result.imageUrl);
      setPreviewIsVideo(isVideoMediaUrl(result.imageUrl));
      onUploaded(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : text?.imageUploadFailed || "File upload failed.");
      if (imageUrl) {
        setPreview(imageUrl);
        setPreviewIsVideo(isVideoMediaUrl(imageUrl));
      } else {
        setPreview("");
        setPreviewIsVideo(false);
        if (deferPreview) setRevealed(false);
      }
    } finally {
      onUploadingChange?.(false);
      setProgress(0);
    }
  }

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await processFile(file);
  }

  async function handleDrop(event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragActive(false);
    if (isUploading) return;
    const file = event.dataTransfer.files?.[0];
    if (file) await processFile(file);
  }

  function removeCurrentImage() {
    setError("");
    setPreview("");
    setPreviewIsVideo(false);
    setRevealed(!deferPreview);
    onRemoved?.();
  }

  function rollbackImage(entry: ImageHistoryEntry) {
    setError("");
    setRevealed(true);
    setPreview(entry.imageUrl);
    setPreviewIsVideo(isVideoMediaUrl(entry.imageUrl));
    onRollback?.(entry);
  }

  function revealStoredPreview() {
    setRevealed(true);
    setPreview(imageUrl || "");
    setPreviewIsVideo(isVideoMediaUrl(imageUrl));
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {/* Tap / hover the tile to upload, or drag-and-drop a file onto it. When something is
          uploaded we only keep a delete button; the picker is triggered by tapping the tile. */}
      <div className="group relative">
        {showDeferredGate ? (
          <div className="relative flex h-36 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-md border border-dashed bg-muted/30 text-center">
            <ImagePlus className="h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="px-4 text-sm text-muted-foreground">
              {text?.imageStoredTapPreview || "Image saved — preview to load it"}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={revealStoredPreview}>
                <Eye className="h-4 w-4" aria-hidden />
                {text?.preview || "Preview"}
              </Button>
              <Button type="button" size="sm" onClick={() => inputRef.current?.click()} disabled={isUploading}>
                <Upload className="h-4 w-4" aria-hidden />
                {text?.changeImage || "Change image"}
              </Button>
            </div>
            {onRemoved ? (
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
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            aria-label={preview ? text?.changeImage || "Change image" : text?.uploadImage || "Upload image"}
            onDragOver={(event) => {
              event.preventDefault();
              if (!isUploading) setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={cn(
              "relative flex h-36 w-full items-center justify-center overflow-hidden rounded-md border border-dashed bg-muted/30 text-center transition-colors hover:border-primary/60 hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60",
              preview && "border-solid",
              dragActive && "border-primary bg-primary/5"
            )}
          >
            {preview ? (
              previewIsVideo ? (
                <video
                  src={preview}
                  muted
                  autoPlay
                  loop
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="h-full w-full object-cover" />
              )
            ) : (
              <span className="flex flex-col items-center gap-1.5 px-4 text-muted-foreground">
                <ImagePlus className="h-6 w-6" aria-hidden />
                <span className="text-sm font-medium">{text?.uploadImageHint || text?.noImageYet || "Tap or drop an image to upload"}</span>
              </span>
            )}
            <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <Upload className="h-6 w-6" aria-hidden />
              <span className="text-sm font-medium">{preview ? text?.changeImage || "Change photo" : text?.uploadImage || "Upload photo"}</span>
            </span>
          </button>
        )}
        {preview && onRemoved && !showDeferredGate ? (
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
      {imageHistory.length > 0 && onRollback && (!deferPreview || revealed) ? (
        <div className="flex flex-wrap gap-2">
          {imageHistory.map((entry) => (
            <div key={entry.id} className="relative h-16 w-16 overflow-hidden rounded-md border bg-muted">
              {isVideoMediaUrl(entry.imageUrl) ? (
                <video src={entry.imageUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.imageUrl} alt="" className="h-full w-full object-cover" />
              )}
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
