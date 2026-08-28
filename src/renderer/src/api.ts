import type { CloudStatus } from "../../main/types";
import type { Settings } from "../../main/config/defaults";
import type { JobLogEntry, PrinterInfo } from "../../main/types";

export interface ZmaApi {
  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;
  listPrinters(): Promise<PrinterInfo[]>;
  refreshPrinters(): Promise<PrinterInfo[]>;
  printTest(type: "thermal" | "a4"): Promise<unknown>;
  listJobs(): Promise<JobLogEntry[]>;
  clearJobs(): Promise<void>;
  getCloudStatus(): Promise<CloudStatus>;
  onCloudStatus(callback: (status: CloudStatus) => void): () => void;
  onJobsUpdated(callback: (jobs: JobLogEntry[]) => void): () => void;
}

export const api: ZmaApi = (window as unknown as { zmaApi: ZmaApi }).zmaApi;
