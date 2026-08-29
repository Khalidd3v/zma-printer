import { net } from "electron";
import { appendFileSync } from "node:fs";
import { join } from "node:path";
import WebSocket from "ws";
import { getSettings } from "../config/settings";
import { printJob } from "../print/render";
import { sendToRenderer } from "../window";
import type { CloudStatus, Invoice, PrintJob, PrinterType, StoreInfo } from "../types";

let logPath = "";

export function initWsLog(userDataDir: string): void {
  logPath = join(userDataDir, "ws-debug.log");
  appendFileSync(logPath, `\n[${new Date().toISOString()}] ws log initialized\n`);
}

function wsLog(message: string): void {
  try {
    appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`);
  } catch {
    // ignore
  }
}

interface CloudJob {
  id?: string;
  job_id?: string;
  invoice_number?: string;
  printer_type?: PrinterType;
  template?: string;
  payload?: {
    schema?: "zmapos" | "generic";
    printer_type?: PrinterType;
    template?: string;
    store?: StoreInfo;
    sale?: Invoice;
    invoice?: Invoice;
  };
  sale?: Invoice;
  invoice?: Invoice;
  store?: StoreInfo;
  schema?: "zmapos" | "generic";
}

interface IncomingMessage {
  type?: string;
  job?: CloudJob;
  data?: CloudJob;
  payload?: CloudJob;
}

function toPrintJob(job: CloudJob): PrintJob | null {
  const payload = job.payload || {};
  const printerType = payload.printer_type || job.printer_type || "thermal";
  const template = payload.template || job.template;
  const store = payload.store || job.store;
  const sale = payload.sale || job.sale;
  const invoice = payload.invoice || job.invoice || sale;

  if (!invoice) {
    console.error("WebSocket job has no invoice/sale payload:", JSON.stringify(job).slice(0, 400));
    return null;
  }

  if (invoice) {
    return {
      schema: "zmapos",
      printer_type: printerType,
      template,
      store,
      sale: invoice,
    };
  }
  return null;
}

let socket: WebSocket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let shouldRun = false;
let status: CloudStatus = "disabled";

function wsUrl(settings: ReturnType<typeof getSettings>): string {
  let base = settings.cloud.ws_url;
  if (!base) {
    base = settings.cloud.base_url.replace(/^http/, "ws") + "/ws/printing/";
  } else if (!base.includes("/ws/")) {
    base = base.replace(/\/$/, "") + "/ws/printing/";
  }
  const secret = encodeURIComponent(settings.cloud.secret);
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}secret=${secret}`;
}

function setStatus(next: CloudStatus): void {
  if (status === next) return;
  status = next;
  sendToRenderer("cloud:status", status);
}

export function getCloudStatus(): CloudStatus {
  return status;
}

async function ackJob(jobId: string, result: { success: boolean; message?: string; printer_name?: string }): Promise<void> {
  const settings = getSettings();
  try {
    await fetch(`${settings.cloud.base_url.replace(/\/$/, "")}/api/v1/printing/jobs/${jobId}/ack/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.cloud.secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: result.success ? "printed" : "failed",
        error_message: result.message || "",
        printer_name: result.printer_name || "",
      }),
    });
  } catch (error) {
    console.error("Failed to ack print job:", error);
  }
}

async function handleJob(job: CloudJob): Promise<void> {
  const printPayload = toPrintJob(job);
  if (!printPayload) {
    return;
  }

  const result = await printJob(printPayload, "cloud");
  const jobId = job.id || job.job_id || "";
  if (jobId) {
    await ackJob(jobId, result);
  }
}

function connect(): void {
  if (!shouldRun) return;

  const settings = getSettings();
  if (!settings.cloud.enabled || !settings.cloud.secret) {
    setStatus("disabled");
    return;
  }

  if (!net.isOnline()) {
    setStatus("no_internet");
    scheduleReconnect();
    return;
  }

  setStatus("connecting");

  try {
    socket = new WebSocket(wsUrl(settings));
  } catch (error) {
    console.error("Failed to open WebSocket:", error);
    setStatus("disconnected");
    scheduleReconnect();
    return;
  }

  socket.on("open", () => {
    setStatus("connected");
    wsLog("CONNECTED to " + wsUrl(settings).replace(/secret=.*$/, "secret=***"));
  });

  socket.on("message", (data) => {
    try {
      const parsed = JSON.parse(data.toString());
      const message = parsed as IncomingMessage;
      const job = message.job || message.data || message.payload || (message.type === "print" ? message : null);
      wsLog("MESSAGE type=" + (message.type || "none") + " keys=" + Object.keys(parsed).join(","));
      if (job) {
        const jobObj = job as CloudJob;
        const inv =
          jobObj.invoice_number ||
          (jobObj.payload && jobObj.payload.sale && jobObj.payload.sale.invoice_number) ||
          (jobObj.payload && jobObj.payload.invoice && jobObj.payload.invoice.invoice_number) ||
          "unknown";
        wsLog("JOB found invoice=" + inv + " full=" + JSON.stringify(jobObj).slice(0, 2500));
        void handleJob(jobObj);
      } else {
        wsLog("NO JOB in message");
      }
    } catch (error) {
      wsLog("PARSE ERROR " + (error instanceof Error ? error.message : String(error)));
    }
  });

  socket.on("error", () => {
    setStatus("disconnected");
  });

  socket.on("close", (code) => {
    socket = null;
    if (code === 4001) {
      console.error("WebSocket rejected: invalid POS secret");
    }
    setStatus("disconnected");
    scheduleReconnect();
  });
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, 3000);
}

export function startCloudConnection(): void {
  stopCloudConnection();
  shouldRun = true;
  connect();
}

export function stopCloudConnection(): void {
  shouldRun = false;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.removeAllListeners();
    if (socket.readyState === WebSocket.CONNECTING) {
      socket.terminate();
    } else {
      socket.close();
    }
    socket = null;
  }
  if (status !== "disabled") {
    setStatus("disabled");
  }
}
