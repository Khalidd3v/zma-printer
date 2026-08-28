import { BrowserWindow, ipcMain } from "electron";
import { getCloudStatus, startCloudConnection, stopCloudConnection } from "./cloud/connection";
import { getSettings, updateSettings, type Settings } from "./config/settings";
import { clearJobLog, getJobLog } from "./print/jobLog";
import { getCachedPrinters, setCachedPrinters } from "./print/printer";
import { printTest } from "./print/render";
import type { JobLogEntry, PrinterInfo } from "./types";

export function registerIpc(): void {
  ipcMain.handle("settings:get", () => getSettings());

  ipcMain.handle("settings:update", (_event, patch: Partial<Settings>) => {
    const next = updateSettings(patch);
    stopCloudConnection();
    startCloudConnection();
    return next;
  });

  ipcMain.handle("cloud:status", () => getCloudStatus());

  ipcMain.handle("printers:list", () => getCachedPrinters());

  ipcMain.handle("printers:refresh", async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const printers: PrinterInfo[] = win ? await win.webContents.getPrintersAsync() : [];
    setCachedPrinters(printers);
    return getCachedPrinters();
  });

  ipcMain.handle("print:test", (_event, type: "thermal" | "a4") => printTest(type));

  ipcMain.handle("jobs:list", (): JobLogEntry[] => getJobLog());

  ipcMain.handle("jobs:clear", () => clearJobLog());
}
