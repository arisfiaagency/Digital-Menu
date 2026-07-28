/** Per-device POS printer assignments (browsers cannot list OS printers). */

import type { ThermalPaperWidth } from "@/lib/thermal-print";

export type PosPrinterRole = "invoice" | "kitchen" | "bar";

export type PosPrinterConfig = {
  /** Printer names registered on this device (exact OS printer names). */
  printers: string[];
  invoice: string;
  kitchen: string;
  bar: string;
  /** Thermal roll width used for invoice / kitchen / bar tickets. */
  paperWidth: ThermalPaperWidth;
};

export const emptyPosPrinterConfig: PosPrinterConfig = {
  printers: [],
  invoice: "",
  kitchen: "",
  bar: "",
  paperWidth: 80
};

function storageKey(scope: string) {
  return `stone-cafe-pos-printers:${scope || "platform"}`;
}

function normalizePaperWidth(value: unknown): ThermalPaperWidth {
  return value === 58 || value === "58" ? 58 : 80;
}

export function loadPosPrinterConfig(scope: string | null | undefined): PosPrinterConfig {
  if (typeof window === "undefined") return emptyPosPrinterConfig;
  try {
    const raw = window.localStorage.getItem(storageKey(scope || "platform"));
    if (!raw) return emptyPosPrinterConfig;
    const parsed = JSON.parse(raw) as Partial<PosPrinterConfig>;
    const printers = Array.isArray(parsed.printers)
      ? parsed.printers.filter((name): name is string => typeof name === "string" && name.trim().length > 0)
      : [];
    const unique = [...new Set(printers.map((name) => name.trim()))];
    return {
      printers: unique,
      invoice: typeof parsed.invoice === "string" ? parsed.invoice : "",
      kitchen: typeof parsed.kitchen === "string" ? parsed.kitchen : "",
      bar: typeof parsed.bar === "string" ? parsed.bar : "",
      paperWidth: normalizePaperWidth(parsed.paperWidth)
    };
  } catch {
    return emptyPosPrinterConfig;
  }
}

export function savePosPrinterConfig(scope: string | null | undefined, config: PosPrinterConfig) {
  if (typeof window === "undefined") return;
  const printers = [...new Set(config.printers.map((name) => name.trim()).filter(Boolean))];
  const normalized: PosPrinterConfig = {
    printers,
    invoice: printers.includes(config.invoice) ? config.invoice : "",
    kitchen: printers.includes(config.kitchen) ? config.kitchen : "",
    bar: printers.includes(config.bar) ? config.bar : "",
    paperWidth: normalizePaperWidth(config.paperWidth)
  };
  window.localStorage.setItem(storageKey(scope || "platform"), JSON.stringify(normalized));
  return normalized;
}

export function printerForRole(config: PosPrinterConfig, role: PosPrinterRole) {
  const name = config[role]?.trim() || "";
  return name || null;
}
