import { app } from "electron";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PrinterInfo } from "../types";

interface ThermalCatalogEntry {
  id: number;
  brand: string;
  model_number: string;
  name: string;
  category: string;
  market: string;
  source_basis: string;
}

interface A4CatalogEntry {
  id: number;
  brand: string;
  model_number: string;
  name: string;
  printer_category: string;
  minimum_supported_class: string;
  maximum_paper_size_class: string;
  source_basis: string;
}

export interface CatalogEntry {
  brand: string;
  model: string;
  name: string;
  type: "thermal" | "a4";
}

const thermalFallback =
  /thermal|receipt|80\s*mm|58\s*mm|pos|epson|esc\/pos|tm-|tsp|bixolon|star\s+(tsp|sm)|pos-80|rpp|citizen\s+(ct|pmu)|samsung\s+srp|xprinter|gprinter|hprt|dymo/i;

let thermalCatalog: CatalogEntry[] = [];
let a4Catalog: CatalogEntry[] = [];

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resourcesDir(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, "resources");
  }
  return join(__dirname, "../../resources");
}

function loadThermalCatalog(): CatalogEntry[] {
  if (thermalCatalog.length) return thermalCatalog;
  try {
    const raw = readFileSync(join(resourcesDir(), "thermal_printers_1000.json"), "utf-8");
    const entries = JSON.parse(raw) as ThermalCatalogEntry[];
    thermalCatalog = entries.map((e) => ({
      brand: e.brand,
      model: e.model_number,
      name: e.name,
      type: "thermal" as const,
    }));
  } catch (error) {
    console.error("Failed to load thermal printer catalog:", error);
    thermalCatalog = [];
  }
  return thermalCatalog;
}

function loadA4Catalog(): CatalogEntry[] {
  if (a4Catalog.length) return a4Catalog;
  try {
    const raw = readFileSync(join(resourcesDir(), "a4_and_larger_printers_1500.json"), "utf-8");
    const entries = JSON.parse(raw) as A4CatalogEntry[];
    a4Catalog = entries.map((e) => ({
      brand: e.brand,
      model: e.model_number,
      name: e.name,
      type: "a4" as const,
    }));
  } catch (error) {
    console.error("Failed to load A4 printer catalog:", error);
    a4Catalog = [];
  }
  return a4Catalog;
}

export function getCatalog(): CatalogEntry[] {
  return [...loadThermalCatalog(), ...loadA4Catalog()];
}

function matchCatalogEntry(name: string, displayName: string): CatalogEntry | undefined {
  const haystack = normalize(`${name} ${displayName}`);
  if (!haystack) return undefined;

  const entries = getCatalog();
  let best: CatalogEntry | undefined;
  let bestScore = 0;

  for (const entry of entries) {
    const brand = normalize(entry.brand);
    const model = normalize(entry.model);
    const fullName = normalize(entry.name);
    let score = 0;

    if (brand && model && haystack.includes(brand) && haystack.includes(model)) {
      score = 3;
    } else if (fullName && haystack.includes(fullName)) {
      score = 2;
    } else if (model && haystack.includes(model)) {
      score = 1;
    }

    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }

  return best;
}

export function inferPrinterType(name: string, displayName: string): "thermal" | "a4" {
  const matched = matchCatalogEntry(name, displayName);
  if (matched) return matched.type;
  return thermalFallback.test(`${name} ${displayName}`) ? "thermal" : "a4";
}

export function enrichPrinter(printer: PrinterInfo): PrinterInfo {
  const matched = matchCatalogEntry(printer.name, printer.displayName);
  if (!matched) {
    return {
      ...printer,
      matchedType: inferPrinterType(printer.name, printer.displayName),
    };
  }
  return {
    ...printer,
    brand: matched.brand,
    model: matched.model,
    matchedType: matched.type,
  };
}
