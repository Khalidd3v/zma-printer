export type PrinterType = "thermal" | "a4";

export type CloudStatus = "connected" | "connecting" | "disconnected" | "no_internet" | "disabled";

export interface StoreInfo {
  name?: string;
  address?: string;
  phone_number?: string;
  currency?: string;
  currency_symbol?: string;
  [key: string]: unknown;
}

export interface InvoiceItem {
  product_name?: string;
  product_id?: string | number | null;
  product_size?: string;
  size?: string;
  size_name?: string;
  quantity: number | string;
  sale_price: number | string;
  unit_discount?: number | string;
}

export interface CustomInvoiceItem {
  name?: string;
  quantity: number | string;
  unit_price: number | string;
  line_total?: number | string;
}

export interface Invoice {
  invoice_number: string;
  payment_type?: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  cashier_name?: string | null;
  status?: string;
  sale_date?: string | null;
  items?: InvoiceItem[];
  custom_invoice?: { items?: CustomInvoiceItem[] } | null;
  subtotal?: number | string;
  tax_amount?: number | string;
  shipping_amount?: number | string;
  manual_discount?: number | string;
  amount_paid?: number | string;
  remaining_balance?: number | string;
  total_amount: number | string;
  [key: string]: unknown;
}

export interface GenericPrintJob {
  schema: "generic";
  printer_type: PrinterType;
  printer_name?: string;
  copies?: number;
  template?: string;
  store?: StoreInfo;
  invoice: Invoice;
}

export interface ZmaposPrintJob {
  schema: "zmapos";
  printer_type: PrinterType;
  printer_name?: string;
  copies?: number;
  template?: string;
  store?: StoreInfo;
  sale: Invoice;
}

export type PrintJob = GenericPrintJob | ZmaposPrintJob;

export interface NormalizedPrintJob {
  printer_type: PrinterType;
  printer_name?: string;
  copies: number;
  template: string;
  store: StoreInfo;
  invoice: Invoice;
}

export interface PrinterInfo {
  name: string;
  displayName: string;
  isDefault: boolean;
  brand?: string;
  model?: string;
  matchedType?: PrinterType;
}

export interface JobLogEntry {
  job_id: string;
  timestamp: string;
  service_id: string;
  printer_name: string;
  printer_type: PrinterType;
  invoice_number: string;
  customer_name: string;
  success: boolean;
  message: string;
}
