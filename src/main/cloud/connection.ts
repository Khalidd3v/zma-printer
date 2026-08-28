import { net } from "electron";
import WebSocket from "ws";
import { getSettings } from "../config/settings";
import { printJob } from "../print/render";
import { sendToRenderer } from "../window";
import type { CloudStatus, Invoice, PrintJob, PrinterType, StoreInfo } from "../types";

interface CloudJob {
  id: string;
  invoice_number: string;
  printer_type: PrinterType;
  template: string;
  payload: {
    schema: "zmapos";
    printer_type: PrinterType;
    template: string;
    store?: StoreInfo;
    sale: Invoice;
  };
}

interface IncomingMessage {
  type: string;
  job?: CloudJob;
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
  const printPayload: PrintJob = {
    schema: "zmapos",
    printer_type: job.payload?.printer_type || job.printer_type,
    template: job.payload?.template || job.template,
    store: job.payload?.store,
    sale: job.payload?.sale,
  };

  const result = await printJob(printPayload, "cloud");
  await ackJob(job.id, result);
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
  });

  socket.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString()) as IncomingMessage;
      if (message.job) {
        void handleJob(message.job);
      }
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error);
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
