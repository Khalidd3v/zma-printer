import { contextBridge, ipcRenderer } from "electron";
import type { Settings } from "../main/config/defaults";
import type { CloudStatus, JobLogEntry, PrinterInfo } from "../main/types";

const api = {
  getSettings: (): Promise<Settings> => ipcRenderer.invoke("settings:get"),
  updateSettings: (patch: Partial<Settings>): Promise<Settings> =>
    ipcRenderer.invoke("settings:update", patch),
  listPrinters: (): Promise<PrinterInfo[]> => ipcRenderer.invoke("printers:list"),
  refreshPrinters: (): Promise<PrinterInfo[]> => ipcRenderer.invoke("printers:refresh"),
  printTest: (type: "thermal" | "a4"): Promise<unknown> => ipcRenderer.invoke("print:test", type),
  listJobs: (): Promise<JobLogEntry[]> => ipcRenderer.invoke("jobs:list"),
  clearJobs: (): Promise<void> => ipcRenderer.invoke("jobs:clear"),
  getCloudStatus: (): Promise<CloudStatus> => ipcRenderer.invoke("cloud:status"),
  onCloudStatus: (callback: (status: CloudStatus) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: CloudStatus) => callback(status);
    ipcRenderer.on("cloud:status", listener);
    return () => ipcRenderer.removeListener("cloud:status", listener);
  },
  onJobsUpdated: (callback: (jobs: JobLogEntry[]) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, jobs: JobLogEntry[]) => callback(jobs);
    ipcRenderer.on("jobs:updated", listener);
    return () => ipcRenderer.removeListener("jobs:updated", listener);
  },
};

contextBridge.exposeInMainWorld("zmaApi", api);

export type ZmaApi = typeof api;
