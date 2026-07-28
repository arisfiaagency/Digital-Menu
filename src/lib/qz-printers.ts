/**
 * System printer discovery / silent print via QZ Tray (local helper app).
 * Browsers cannot list OS printers alone — QZ Tray bridges to wired/wireless printers.
 */

type QzApi = {
  websocket: {
    isActive: () => boolean;
    connect: (options?: { retries?: number; delay?: number }) => Promise<void>;
    disconnect: () => Promise<void>;
  };
  printers: {
    find: (query?: string) => Promise<string[] | string>;
  };
  configs: {
    create: (printer: string, options?: Record<string, unknown>) => unknown;
  };
  print: (config: unknown, data: unknown[]) => Promise<void>;
};

let qzPromise: Promise<QzApi> | null = null;

async function getQz(): Promise<QzApi> {
  if (!qzPromise) {
    qzPromise = import("qz-tray").then((mod) => {
      const qz = (mod as { default?: QzApi }).default ?? (mod as unknown as QzApi);
      if (!qz?.websocket?.connect || !qz?.printers?.find) {
        throw new Error("QZ Tray library failed to load.");
      }
      return qz;
    });
  }
  return qzPromise;
}

async function ensureQzConnected() {
  const qz = await getQz();
  if (!qz.websocket.isActive()) {
    await qz.websocket.connect({ retries: 2, delay: 1 });
  }
  return qz;
}

export type DetectPrintersResult =
  | { ok: true; printers: string[] }
  | { ok: false; code: "not_installed" | "denied" | "error"; message: string };

/** Lists wired + wireless printers known to this computer (requires QZ Tray running). */
export async function detectConnectedPrinters(): Promise<DetectPrintersResult> {
  try {
    const qz = await ensureQzConnected();
    const found = await qz.printers.find();
    const list = (Array.isArray(found) ? found : [found])
      .map((name) => String(name || "").trim())
      .filter(Boolean);
    const unique = [...new Set(list)].sort((a, b) => a.localeCompare(b));
    return { ok: true, printers: unique };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const lower = message.toLowerCase();
    if (
      lower.includes("unable to establish") ||
      lower.includes("connection") ||
      lower.includes("websocket") ||
      lower.includes("econnrefused") ||
      lower.includes("failed to load")
    ) {
      return {
        ok: false,
        code: "not_installed",
        message:
          "QZ Tray is not running on this computer. Install and open QZ Tray to detect printers."
      };
    }
    if (lower.includes("denied") || lower.includes("blocked") || lower.includes("cancel")) {
      return {
        ok: false,
        code: "denied",
        message: "Printer access was blocked. Allow this site in the QZ Tray prompt, then try again."
      };
    }
    return { ok: false, code: "error", message };
  }
}

/** Silent HTML print to a named OS printer via QZ Tray. Returns false if unavailable. */
export async function printHtmlWithQz(printerName: string, html: string): Promise<boolean> {
  const name = printerName.trim();
  if (!name || !html) return false;
  try {
    const qz = await ensureQzConnected();
    const config = qz.configs.create(name, {
      rasterize: true,
      scaleContent: true,
      margins: 0,
      size: null,
      units: "mm"
    });
    await qz.print(config, [
      {
        type: "pixel",
        format: "html",
        flavor: "plain",
        data: html
      }
    ]);
    return true;
  } catch {
    return false;
  }
}
