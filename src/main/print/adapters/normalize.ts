import type { GenericPrintJob, NormalizedPrintJob, PrintJob } from "../../types";

export function normalizeGeneric(job: GenericPrintJob): NormalizedPrintJob {
  return {
    printer_type: job.printer_type,
    printer_name: job.printer_name,
    copies: job.copies || 1,
    template: job.template || `${job.printer_type}-standard`,
    store: job.store || {},
    invoice: job.invoice,
  };
}

export function normalizeZmapos(job: Extract<PrintJob, { schema: "zmapos" }>): NormalizedPrintJob {
  return {
    printer_type: job.printer_type,
    printer_name: job.printer_name,
    copies: job.copies || 1,
    template: job.template || `${job.printer_type}-standard`,
    store: job.store || {},
    invoice: job.sale,
  };
}

export function normalizeJob(job: PrintJob): NormalizedPrintJob {
  return job.schema === "zmapos" ? normalizeZmapos(job) : normalizeGeneric(job);
}
