import type { PrinterInfo } from "../types";
import { enrichPrinter, inferPrinterType } from "./catalog";

let cached: PrinterInfo[] = [];

export function setCachedPrinters(printers: PrinterInfo[]): void {
  cached = printers.map(enrichPrinter);
}

export function getCachedPrinters(): PrinterInfo[] {
  return cached;
}

export { inferPrinterType } from "./catalog";

export function resolvePrinter(
  requestedName: string | undefined,
  printerType: "thermal" | "a4",
  configuredName: string,
  printers: PrinterInfo[],
): string {
  const enriched = printers.map(enrichPrinter);
  if (requestedName && enriched.some((p) => p.name === requestedName || p.displayName === requestedName)) {
    return requestedName;
  }
  if (configuredName && enriched.some((p) => p.name === configuredName || p.displayName === configuredName)) {
    return configuredName;
  }
  const fallback =
    enriched.find((p) => (p.matchedType || inferPrinterType(p.name, p.displayName)) === printerType && p.isDefault) ||
    enriched.find((p) => (p.matchedType || inferPrinterType(p.name, p.displayName)) === printerType) ||
    enriched.find((p) => p.isDefault) ||
    enriched[0];
  if (!fallback) {
    throw new Error(`No ${printerType === "thermal" ? "thermal" : "A4"} printer is installed or selected.`);
  }
  return fallback.name;
}
