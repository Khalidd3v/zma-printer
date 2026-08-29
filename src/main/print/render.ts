import { BrowserWindow, app } from "electron";
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { getSettings } from "../config/settings";
import type { PrintJob } from "../types";
import { normalizeJob } from "./adapters/normalize";
import { addJobLog } from "./jobLog";
import { getCachedPrinters, resolvePrinter, setCachedPrinters } from "./printer";
import { renderTemplate } from "./templates/invoice";

export interface RenderResult {
  success: boolean;
  job_id: string;
  printer_name: string;
  message?: string;
}

let printQueue: Promise<unknown> = Promise.resolve();

function enqueuePrint<T>(task: () => Promise<T>): Promise<T> {
  const next = printQueue.then(task, task);
  printQueue = next.catch(() => undefined);
  return next;
}

function printToPrinter(printWindow: BrowserWindow, printerName: string, printerType: "thermal" | "a4"): Promise<void> {
  return new Promise((resolve, reject) => {
    printWindow.webContents.print(
      {
        silent: true,
        printBackground: true,
        deviceName: printerName,
        ...(printerType === "a4"
          ? { pageSize: "A4" as const }
          : { pageSize: { width: 80_000, height: 297_000 }, margins: { marginType: "none" as const } }),
      },
      (success, failureReason) => {
        if (success) {
          resolve();
        } else {
          reject(new Error(failureReason || "Print failed."));
        }
      },
    );
  });
}

function resolveTemplate(printerType: "thermal" | "a4", requested?: string): string {
  if (requested) return requested;
  const settings = getSettings();
  return printerType === "thermal" ? settings.thermal_template : settings.a4_template;
}

async function renderAndPrint(
  normalized: ReturnType<typeof normalizeJob>,
): Promise<{ printerName: string; invoiceNumber: string; customerName: string }> {
  const settings = getSettings();
  const printerType = normalized.printer_type;

  // Ensure the printer list is available even if the window was just opened
  // and the renderer hasn't refreshed it yet. Without this, resolvePrinter
  // falls back to the OS default and misses the user's configured printer.
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow && getCachedPrinters().length === 0) {
    setCachedPrinters(await mainWindow.webContents.getPrintersAsync());
  }

  const printerName = resolvePrinter(
    normalized.printer_name,
    printerType,
    printerType === "thermal" ? settings.thermal_printer : settings.a4_printer,
    getCachedPrinters(),
  );
  const html = renderTemplate(
    resolveTemplate(printerType, normalized.template),
    normalized.store,
    normalized.invoice,
    printerType === "thermal" ? settings.columns?.thermal : settings.columns?.a4,
    printerType === "thermal"
      ? { note: settings.thermal_note, footer: settings.thermal_footer }
      : { note: settings.a4_note, footer: settings.a4_footer },
  );

  // Debug: capture the rendered HTML so we can inspect what the printer receives.
  try {
    const debugDir = join(app.getPath("userData"), "print-debug");
    mkdirSync(debugDir, { recursive: true });
    appendFileSync(join(debugDir, "last-print.html"), html, "utf-8");
  } catch {
    // ignore
  }

  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      offscreen: true,
      sandbox: true,
      contextIsolation: true,
    },
  });

  try {
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    // Give the renderer a moment to lay out the page before rasterizing.
    await new Promise((r) => setTimeout(r, 250));
    for (let i = 0; i < normalized.copies; i += 1) {
      await printToPrinter(printWindow, printerName, printerType);
    }
  } finally {
    if (printWindow && !printWindow.isDestroyed()) {
      printWindow.destroy();
    }
  }

  return { printerName, invoiceNumber: String(normalized.invoice.invoice_number || ""), customerName: String(normalized.invoice.customer_name || "") };
}

export async function printJob(job: PrintJob, serviceId: string): Promise<RenderResult> {
  const normalized = normalizeJob(job);
  const printerType = normalized.printer_type;
  const invoiceNumber = String(normalized.invoice.invoice_number || "");
  const customerName = String(normalized.invoice.customer_name || "");
  let printerName = "";

  try {
    const outcome = await enqueuePrint(() => renderAndPrint(normalized));
    printerName = outcome.printerName;

    const entry = addJobLog({
      service_id: serviceId,
      printer_name: printerName,
      printer_type: printerType,
      invoice_number: invoiceNumber,
      customer_name: customerName,
      success: true,
      message: "Printed",
    });

    return {
      success: true,
      job_id: entry.job_id,
      printer_name: printerName,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Print failed.";
    addJobLog({
      service_id: serviceId,
      printer_name: printerName,
      printer_type: printerType,
      invoice_number: invoiceNumber,
      customer_name: customerName,
      success: false,
      message,
    });
    return {
      success: false,
      job_id: "",
      printer_name: printerName,
      message,
    };
  }
}

export async function printTest(type: "thermal" | "a4"): Promise<RenderResult> {
  const job: PrintJob = {
    schema: "generic",
    printer_type: type,
    store: { name: "Zma Printer Agent", currency_symbol: "Rs" },
    invoice: {
      invoice_number: "TEST-0001",
      payment_type: "cash",
      customer_name: "Test Customer",
      cashier_name: "agent@test",
      status: "completed",
      sale_date: new Date().toISOString(),
      items: [
        { product_name: "Sample Item", quantity: 1, sale_price: 100 },
        { product_name: "Another Item", quantity: 2, sale_price: 250 },
      ],
      amount_paid: 600,
      remaining_balance: 0,
      total_amount: 600,
    },
  };
  return printJob(job, "local-ui");
}
