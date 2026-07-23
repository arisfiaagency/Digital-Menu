/** R2 object keys are stored in Firestore as `r2/{objectKey}`. */
export function isCloudflareR2Path(imagePath?: string) {
  return Boolean(imagePath?.startsWith("r2/"));
}

export function stripR2PathPrefix(imagePath: string) {
  return imagePath.startsWith("r2/") ? imagePath.slice(3) : imagePath;
}
