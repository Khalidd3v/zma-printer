import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sendToRenderer } from "../window";
import type { JobLogEntry } from "../types";

const MAX_ENTRIES = 50;
let entries: JobLogEntry[] = [];
let logPath = "";

function persist(): void {
  if (!logPath) return;
  const tmp = `${logPath}.tmp`;
  writeFileSync(tmp, JSON.stringify(entries, null, 2), "utf-8");
  renameSync(tmp, logPath);
}

export function initJobLog(userDataDir: string): void {
  logPath = join(userDataDir, "job-log.json");
  mkdirSync(userDataDir, { recursive: true });

  if (!existsSync(logPath)) {
    entries = [];
    persist();
    return;
  }

  try {
    const raw = JSON.parse(readFileSync(logPath, "utf-8")) as JobLogEntry[];
    entries = Array.isArray(raw) ? raw.slice(0, MAX_ENTRIES) : [];
  } catch (error) {
    console.error("Failed to load job log:", error);
    entries = [];
  }
}

export function addJobLog(entry: Omit<JobLogEntry, "job_id" | "timestamp">): JobLogEntry {
  const full: JobLogEntry = {
    ...entry,
    job_id: randomUUID(),
    timestamp: new Date().toISOString(),
  };
  entries.unshift(full);
  if (entries.length > MAX_ENTRIES) {
    entries.length = MAX_ENTRIES;
  }
  persist();
  sendToRenderer("jobs:updated", getJobLog());
  return full;
}

export function getJobLog(): JobLogEntry[] {
  return [...entries];
}

export function clearJobLog(): void {
  entries = [];
  persist();
  sendToRenderer("jobs:updated", getJobLog());
}
