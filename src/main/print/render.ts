import { BrowserWindow } from "electron";
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

function printToPrinter(printWindow: BrowserWindow, printerName: string, printerType: "thermal" | "a4"): Promise<void> {
  return new Promise((resolve, reject) => {
    printWindow.webContents.print(
      {
        silent: true,
        printBackground: true,
        deviceName: printerName,
        ...(printerType === "a4" ? { pageSize: "A4" as const } : {}),
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

export async function printJob(job: PrintJob, serviceId: string): Promise<RenderResult> {
  let printerName = "";
  let printerType: "thermal" | "a4" = "thermal";
  let invoiceNumber = "";
  let customerName = "";
  let printWindow: BrowserWindow | null = null;

  try {
    const normalized = normalizeJob(job);
    const settings = getSettings();
    printerType = normalized.printer_type;
    invoiceNumber = String(normalized.invoice.invoice_number || "");
    customerName = String(normalized.invoice.customer_name || "");

    // Ensure the printer list is available even if the window was just opened
    // and the renderer hasn't refreshed it yet. Without this, resolvePrinter
    // falls back to the OS default and misses the user's configured printer.
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow && getCachedPrinters().length === 0) {
      setCachedPrinters(await mainWindow.webContents.getPrintersAsync());
    }

    printerName = resolvePrinter(
      normalized.printer_name,
      printerType,
      printerType === "thermal" ? settings.thermal_printer : settings.a4_printer,
      getCachedPrinters(),
    );
    const html = renderTemplate(normalized.template, normalized.store, normalized.invoice);

    printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        offscreen: true,
        sandbox: true,
        contextIsolation: true,
      },
    });

    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    for (let i = 0; i < normalized.copies; i += 1) {
      await printToPrinter(printWindow, printerName, printerType);
    }

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
  } finally {
    if (printWindow && !printWindow.isDestroyed()) {
      printWindow.destroy();
    }
  }
}

export async function printTest(type: "thermal" | "a4"): Promise<RenderResult> {
  const job: PrintJob = {
    schema: "generic",
    printer_type: type,
    template: type === "thermal" ? "thermal-standard" : "a4-standard",
    store: { name: "Zma Printer Agent", currency_symbol: "Rs" },
    invoice: {
      invoice_number: "TEST-0001",
      payment_type: "cash",
      customer_name: "Test Customer",
      cashier_name: "agent@test",
      status: "completed",
      sale_date: new Date().toISOString(),
      items: [{ product_name: "Sample Item", quantity: 1, sale_price: 100 }],
      total_amount: 100,
    },
  };
  return printJob(job, "local-ui");
}
