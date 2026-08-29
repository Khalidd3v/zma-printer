import type { CustomInvoiceItem, Invoice, InvoiceItem, StoreInfo } from "../../types";

export type TemplateId = "thermal-standard" | "thermal-compact" | "a4-standard" | "a4-modern";

const esc = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const fmt = (value: unknown): string => {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};

const sizeOf = (it: InvoiceItem): string => String(it.product_size || it.size || it.size_name || "");

const statusText = (status?: string): string =>
  (status === "completed" ? "Delivered" : status || "completed").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const toDate = (invoice: Invoice): Date => {
  const raw = invoice.sale_date ?? invoice.created_at;
  if (typeof raw === "string" || typeof raw === "number") {
    return new Date(raw);
  }
  return new Date();
};

const currency = (store: StoreInfo): string =>
  String(store.currency_symbol || store.currency || "Rs");

const ALL_COLUMNS = [
  { id: "item", label: "Item", align: "left" },
  { id: "size", label: "Size", align: "left" },
  { id: "qty", label: "Qty", align: "right" },
  { id: "price", label: "Price", align: "right" },
  { id: "total", label: "Total", align: "right" },
] as const;

type ColumnId = (typeof ALL_COLUMNS)[number]["id"];

function normalizeColumns(columns: readonly ColumnId[] | undefined): ColumnId[] {
  const seen = new Set<string>();
  const result: ColumnId[] = [];
  for (const id of columns || []) {
    if (!seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}

function itemCell(it: InvoiceItem, col: ColumnId): string {
  switch (col) {
    case "item":
      return esc(it.product_name || it.product_id || "Item");
    case "size":
      return esc(sizeOf(it));
    case "qty":
      return esc(it.quantity);
    case "price":
      return fmt(it.sale_price);
    case "total":
      return fmt(Number(it.quantity) * Number(it.sale_price) - Number(it.unit_discount || 0));
  }
}

function customCell(ci: CustomInvoiceItem, col: ColumnId): string {
  switch (col) {
    case "item":
      return `<span class="cp">(CP) ${esc(ci.name || "Item")}</span>`;
    case "size":
      return "";
    case "qty":
      return esc(ci.quantity);
    case "price":
      return fmt(ci.unit_price);
    case "total":
      return fmt(ci.line_total ?? Number(ci.quantity) * Number(ci.unit_price));
  }
}

function itemRows(invoice: Invoice, columns?: readonly ColumnId[]): string {
  const items = invoice.items || [];
  const customItems = invoice.custom_invoice?.items || [];
  const hasItems = items.length > 0;
  const hasCustom = customItems.length > 0;
  const hasAny = hasItems || hasCustom;

  if (!hasAny) {
    return `<div class="no-items">No line items in this sale.</div>`;
  }

  const cols = normalizeColumns(columns);
  const colMeta = ALL_COLUMNS.filter((c) => cols.includes(c.id));

  const header = `<tr><th style="text-align:left">#</th>${colMeta
    .map((c) => `<th style="text-align:${c.align}">${c.label}</th>`)
    .join("")}</tr>`;

  const body = items
    .map((it, i) => {
      return `<tr><td>${i + 1}</td>${colMeta.map((c) => `<td style="text-align:${c.align}">${itemCell(it, c.id)}</td>`).join("")}</tr>`;
    })
    .join("");

  const custom = hasCustom
    ? customItems
        .map((ci, i) => {
          return `<tr><td>${items.length + i + 1}</td>${colMeta.map((c) => `<td style="text-align:${c.align}">${customCell(ci, c.id)}</td>`).join("")}</tr>`;
        })
        .join("")
    : "";

  // Column widths: # column small, Item flexible, numeric columns share the rest.
  const numCols = colMeta.length + 1;
  const numericWidth = numCols >= 5 ? 13 : numCols === 4 ? 17 : numCols === 3 ? 24 : 34;
  const itemWidth = 100 - 8 - numericWidth * (numCols - 1);
  const colgroup = `<colgroup><col style="width:8%"><col style="width:${Math.max(itemWidth, 30)}%">${colMeta
    .slice(1)
    .map(() => `<col style="width:${numericWidth}%">`)
    .join("")}</colgroup>`;

  return `
  <table>
    ${colgroup}
    <thead>${header}</thead>
    <tbody>${body}${custom}</tbody>
  </table>`;
}

function summary(invoice: Invoice, store: StoreInfo): string {
  const rows: string[] = [];
  if (Number(invoice.shipping_amount) > 0) {
    rows.push(`<div class="summary-row"><span>Shipping</span><span>${fmt(invoice.shipping_amount)}</span></div>`);
  }
  if (Number(invoice.manual_discount) > 0) {
    rows.push(`<div class="summary-row"><span>Discount</span><span>-${fmt(invoice.manual_discount)}</span></div>`);
  }
  if (Number(invoice.amount_paid) > 0 && Number(invoice.remaining_balance) > 0) {
    rows.push(`<div class="summary-row"><span>Paid</span><span>${fmt(invoice.amount_paid)}</span></div>`);
  }
  rows.push(`<div class="summary-row total-line"><span>TOTAL</span><span>${esc(currency(store))} ${fmt(invoice.total_amount)}</span></div>`);
  return rows.join("");
}

const thermalBaseStyle = `
  *{margin:0;padding:0;box-sizing:border-box}
  @page{size:80mm auto;margin:0}
  body{font-family:'Segoe UI',system-ui,sans-serif;width:72mm;padding:10px 4px;margin:0 auto;color:#000;font-size:13px;font-weight:700}
  .center{text-align:center}.right{text-align:right}.bold{font-weight:800}
  hr{border:none;border-top:1px dashed #000;margin:8px 0}
  .company{font-size:17px;font-weight:800;margin-bottom:2px}
  .company .contact{font-size:12px;font-weight:700;display:block;margin-top:1px}
  .inv-type{font-size:12px;font-weight:700;margin:8px 0 2px}
  .inv-num{font-size:14px;font-weight:800}
  .sec-title{font-size:11px;font-weight:700;margin:8px 0 4px;text-transform:uppercase;letter-spacing:.5px}
  .ci-row{display:flex;justify-content:space-between;font-size:11px;padding:2px 0;font-weight:700;gap:6px}
  .ci-row .label{color:#000;flex-shrink:0}.ci-row .val{font-weight:700;text-align:right;word-break:break-word}
  table{width:100%;border-collapse:collapse;table-layout:fixed}
  .no-items{font-size:11px;text-align:center;padding:10px 0;border:1px solid #000;margin:4px 0;font-weight:700}
  thead th{font-size:9px;padding:4px 2px;border:1px solid #000;text-transform:uppercase;font-weight:800;background:#f3f4f6;overflow:hidden}
  tbody td{font-size:10px;padding:4px 2px;border:1px solid #000;font-weight:700;vertical-align:top;word-break:break-word;overflow:hidden}
  .cp{font-style:italic}
  .summary{font-size:11px;padding:3px 0;font-weight:700}
  .summary-row{display:flex;justify-content:space-between;padding:2px 0;gap:6px}
  .total-line{font-size:15px;font-weight:800;border-top:2px solid #000;padding-top:6px;margin-top:4px}
  .note{font-size:10px;margin-top:10px;text-align:center;line-height:1.5;font-weight:700}
  .footer{text-align:center;margin-top:8px;font-weight:700}
  .footer .name{font-size:12px;font-weight:800}
  .footer .by{font-size:10px}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;padding:6px 3px}}
`;

interface TemplateText {
  note: string;
  footer: string;
}

const footerLines = (footer: string): string =>
  footer
    .split("\n")
    .map((line) => `<div class="by">${esc(line)}</div>`)
    .join("");

const thermalStandardBody = (store: StoreInfo, invoice: Invoice, columns?: readonly ColumnId[], text?: TemplateText) => {
  return `
  <div class="center company">
    <div>${esc(store.name || "Zmapos")}</div>
    ${store.phone_number ? `<div class="contact">${esc(store.phone_number)}</div>` : ""}
    ${store.address ? `<div class="contact">${esc(store.address)}</div>` : ""}
  </div>
  <div class="center inv-type">${invoice.payment_type === "debt" ? "DEBT" : "CASH"} INVOICE: #${esc(invoice.invoice_number)}</div>
  <hr>
  <div class="sec-title">Customer Information</div>
  ${invoice.customer_name ? `<div class="ci-row"><span class="label">Name:</span><span class="val">${esc(invoice.customer_name)}</span></div>` : ""}
  ${invoice.customer_phone ? `<div class="ci-row"><span class="label">Phone:</span><span class="val">${esc(invoice.customer_phone)}</span></div>` : ""}
  ${invoice.customer_address ? `<div class="ci-row"><span class="label">Address:</span><span class="val">${esc(invoice.customer_address)}</span></div>` : ""}
  <div class="ci-row"><span class="label">Order Status:</span><span class="val">${esc(statusText(invoice.status))}</span></div>
  <div class="ci-row"><span class="label">Bill Date:</span><span class="val">${esc(toDate(invoice).toLocaleString())}</span></div>
  ${invoice.cashier_name ? `<div class="ci-row"><span class="label">Cashier:</span><span class="val">${esc(String(invoice.cashier_name).toUpperCase())}</span></div>` : ""}
  <hr>
  ${itemRows(invoice, columns)}
  <hr>
  <div class="summary">${summary(invoice, store)}</div>
  <hr>
  <div class="note">${esc(text?.note || "Note: Please keep this invoice with yourself. If you want to track your orders, your purchasing history or any refund policy, Thank you.")}</div>
  <div class="footer">
    ${footerLines(text?.footer || "Automated Software Invoice\nSoftware by ZMAPOS.com")}
  </div>`;
};

const thermalCompactBody = (store: StoreInfo, invoice: Invoice, columns?: readonly ColumnId[], text?: TemplateText) => {
  const addressPhone = [store.address, store.phone_number].filter(Boolean).join(" · ");
  return `
  <div class="center company">${esc(store.name || "Zmapos")}</div>
  ${addressPhone ? `<div class="center" style="font-size:8.5px;color:#444">${esc(addressPhone)}</div>` : ""}
  <div class="center inv-type">${invoice.payment_type === "debt" ? "DEBT" : "CASH"} #${esc(invoice.invoice_number)}</div>
  <hr>
  ${itemRows(invoice, columns)}
  <hr>
  <div class="summary">${summary(invoice, store)}</div>
  <div class="note" style="margin-top:6px">${esc(text?.note || store.name || "Thank you")} · ${esc(toDate(invoice).toLocaleString())}</div>
  ${text?.footer ? `<div class="footer">${footerLines(text.footer)}</div>` : ""}`;
};

const a4BaseStyle = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',system-ui,sans-serif;padding:40px 50px;max-width:210mm;margin:auto;color:#000;font-weight:700}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:3px solid #000}
  .header .company{font-size:26px;font-weight:800}
  .header .contact{font-size:12px;margin-top:3px;font-weight:700}
  .header .invoice{text-align:right}
  .header .inv-type{font-size:14px;font-weight:700;text-transform:uppercase}
  .header .inv-num{font-size:18px;font-weight:800;margin-top:2px}
  .ci-section{display:flex;gap:40px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #000}
  .ci-section .label{font-size:10px;text-transform:uppercase;margin-bottom:2px;font-weight:700}
  .ci-section .val{font-size:14px;font-weight:700}
  .ci-section .right{text-align:right}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}
  thead th{font-size:11px;text-transform:uppercase;padding:8px 10px;border:1px solid #000;font-weight:800;background:#f3f4f6}
  tbody td{font-size:13px;padding:8px 10px;border:1px solid #000;font-weight:700}
  .cp{font-style:italic}
  .summary{width:50%;margin-left:auto}
  .summary-row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px;border-bottom:1px solid #000;font-weight:700}
  .total-line{font-size:17px;font-weight:800;border-bottom:3px double #000;padding-top:8px;margin-top:4px}
  .note{font-size:10px;margin-top:30px;text-align:center;line-height:1.6;font-weight:700}
  .footer{text-align:center;margin-top:12px;font-weight:700}
  .footer .name{font-size:14px;font-weight:800}
  .footer .by{font-size:10px}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;padding:15px 25px}}
`;

const a4StandardBody = (store: StoreInfo, invoice: Invoice, columns?: readonly ColumnId[], text?: TemplateText) => {
  return `
  <div class="header">
    <div>
      <div class="company">${esc(store.name || "Zmapos")}</div>
      ${store.phone_number ? `<div class="contact">${esc(store.phone_number)}</div>` : ""}
      ${store.address ? `<div class="contact">${esc(store.address)}</div>` : ""}
    </div>
    <div class="invoice">
      <div class="inv-type">${invoice.payment_type === "debt" ? "DEBT" : "CASH"} INVOICE</div>
      <div class="inv-num">#${esc(invoice.invoice_number)}</div>
    </div>
  </div>
  <div class="ci-section">
    <div>
      ${invoice.customer_name ? `<div class="label">Customer</div><div class="val">${esc(invoice.customer_name)}</div>` : ""}
      ${invoice.customer_phone ? `<div class="val" style="margin-top:3px;font-size:12px">${esc(invoice.customer_phone)}</div>` : ""}
      ${invoice.customer_address ? `<div class="val" style="margin-top:2px;font-size:12px">${esc(invoice.customer_address)}</div>` : ""}
      ${invoice.cashier_name ? `<div class="label" style="margin-top:8px">Cashier</div><div class="val">${esc(String(invoice.cashier_name).toUpperCase())}</div>` : ""}
    </div>
    <div style="flex:1"></div>
    <div class="right">
      <div class="label">Order Status</div><div class="val">${esc(statusText(invoice.status))}</div>
      <div class="label" style="margin-top:8px">Bill Date</div><div class="val">${esc(toDate(invoice).toLocaleString())}</div>
    </div>
  </div>
  ${itemRows(invoice, columns)}
  <div class="summary">${summary(invoice, store)}</div>
  <div class="note">${esc(text?.note || "Please keep this invoice with yourself. If you want to track your orders, your purchasing history or any refund policy, Thank you.")}</div>
  <div class="footer">
    <div class="name">${esc(store.name || "Zmapos")}</div>
    ${footerLines(text?.footer || "Automated Software Invoice\nPowered by ZMAPOS.com")}
  </div>`;
};

const a4ModernBody = (store: StoreInfo, invoice: Invoice, columns?: readonly ColumnId[], text?: TemplateText) => {
  return `
  <div style="display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border-radius:12px;padding:22px 26px;margin-bottom:22px">
    <div>
      <div class="company" style="font-size:22px;font-weight:700;color:#1e293b">${esc(store.name || "Zmapos")}</div>
      ${store.address ? `<div class="contact" style="color:#64748b;font-size:11px">${esc(store.address)}</div>` : ""}
      ${store.phone_number ? `<div class="contact" style="color:#64748b;font-size:11px">Ph: ${esc(store.phone_number)}</div>` : ""}
    </div>
    <div class="invoice">
      <div class="inv-type" style="font-size:12px;font-weight:700;text-transform:uppercase;color:#4f46e5">${invoice.payment_type === "debt" ? "DEBT" : "CASH"} INVOICE</div>
      <div class="inv-num" style="font-size:18px;font-weight:700;margin-top:4px">#${esc(invoice.invoice_number)}</div>
    </div>
  </div>
  <div class="ci-section">
    <div>${invoice.customer_name ? `<div class="label">Customer</div><div class="val">${esc(invoice.customer_name)}</div>` : ""}</div>
    <div style="flex:1"></div>
    <div class="right">
      <div class="label">Order Status</div><div class="val">${esc(statusText(invoice.status))}</div>
      <div class="label" style="margin-top:8px">Bill Date</div><div class="val">${esc(toDate(invoice).toLocaleString())}</div>
    </div>
  </div>
  ${itemRows(invoice, columns)}
  <div class="summary">${summary(invoice, store)}</div>
  <div class="note">${esc(text?.note || "Thank you for your business. This invoice was generated automatically.")}</div>
  <div class="footer">
    <div class="name" style="font-size:13px;font-weight:700">${esc(store.name || "Zmapos")}</div>
    ${footerLines(text?.footer || "Powered by ZMAPOS.com")}
  </div>`;
};

function render(style: string, body: string, title: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>${style}</style></head><body>${body}</body></html>`;
}

export const TEMPLATES: Record<TemplateId, { label: string; type: "thermal" | "a4"; render: (store: StoreInfo, invoice: Invoice, columns?: readonly ColumnId[], text?: TemplateText) => string }> = {
  "thermal-standard": {
    label: "Thermal Standard",
    type: "thermal",
    render: (store, invoice, columns, text) => render(thermalBaseStyle, thermalStandardBody(store, invoice, columns, text), invoice.invoice_number),
  },
  "thermal-compact": {
    label: "Thermal Compact",
    type: "thermal",
    render: (store, invoice, columns, text) => render(thermalBaseStyle, thermalCompactBody(store, invoice, columns, text), invoice.invoice_number),
  },
  "a4-standard": {
    label: "A4 Standard",
    type: "a4",
    render: (store, invoice, columns, text) => render(a4BaseStyle, a4StandardBody(store, invoice, columns, text), invoice.invoice_number),
  },
  "a4-modern": {
    label: "A4 Modern",
    type: "a4",
    render: (store, invoice, columns, text) => render(a4BaseStyle, a4ModernBody(store, invoice, columns, text), invoice.invoice_number),
  },
};

export interface TemplateTextConfig {
  note: string;
  footer: string;
}

export function renderTemplate(
  templateId: string,
  store: StoreInfo,
  invoice: Invoice,
  columns?: readonly ColumnId[],
  text?: TemplateTextConfig,
): string {
  const template = TEMPLATES[templateId as TemplateId] || TEMPLATES["thermal-standard"];
  return template.render(store, invoice, columns, text);
}

export { thermalStandardBody as thermalTemplate, a4StandardBody as A4Template };
