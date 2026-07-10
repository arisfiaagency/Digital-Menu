export function contrastRatio(hexA: string, hexB: string) {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const light = Math.max(lumA, lumB);
  const dark = Math.min(lumA, lumB);
  return (light + 0.05) / (dark + 0.05);
}

export function hasSafeQrContrast(foreground: string, background: string) {
  return contrastRatio(foreground, background) >= 4.5;
}

function relativeLuminance(hex: string) {
  const rgb = hexToRgb(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const full = normalized.length === 3 ? normalized.split("").map((x) => x + x).join("") : normalized;
  const number = Number.parseInt(full, 16);
  return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
}
