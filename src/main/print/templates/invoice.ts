import type { Invoice, StoreInfo } from "../../types";

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

const titleCase = (value: string): string =>
  (value || "completed")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const toDate = (invoice: Invoice): Date => {
  const raw = invoice.sale_date ?? invoice.created_at;
  if (typeof raw === "string" || typeof raw === "number") {
    return new Date(raw);
  }
  return new Date();
};

const currency = (store: StoreInfo): string =>
  String(store.currency_symbol || store.currency || "Rs");

const statusLabel = (status?: string): string =>
  status === "completed" ? "Delivered" : titleCase(status || "completed");

function customerRows(invoice: Invoice): string {
  const rows: string[] = [];
  if (invoice.customer_name) {
    rows.push(`<div class="ci-row"><span class="label">Name:</span><span class="val">${esc(invoice.customer_name)}</span></div>`);
  }
  if (invoice.cashier_name) {
    rows.push(`<div class="ci-row"><span class="label">Bill Printed By:</span><span class="val">${esc(String(invoice.cashier_name).toUpperCase())}</span></div>`);
  }
  rows.push(`<div class="ci-row"><span class="label">Order Status:</span><span class="val">${esc(statusLabel(invoice.status))}</span></div>`);
  rows.push(`<div class="ci-row"><span class="label">Bill Date:</span><span class="val">${esc(toDate(invoice).toLocaleString())}</span></div>`);
  return rows.join("");
}

function itemRows(invoice: Invoice): string {
  const items = invoice.items || [];
  const customItems = invoice.custom_invoice?.items || [];
  const hasItems = items.length > 0;
  const hasCustom = customItems.length > 0;
  const hasAny = hasItems || hasCustom;

  if (!hasAny) return "";

  const body = items
    .map((it, i) => {
      const total = Number(it.quantity) * Number(it.sale_price) - Number(it.unit_discount || 0);
      return `<tr><td>${i + 1}</td><td>${esc(it.product_name || it.product_id)}</td><td style="text-align:right">${esc(it.quantity)}</td><td style="text-align:right">${fmt(it.sale_price)}</td><td style="text-align:right;font-weight:600">${fmt(total)}</td></tr>`;
    })
    .join("");

  const custom = hasCustom
    ? customItems
        .map((ci, i) => {
          const total = ci.line_total ?? Number(ci.quantity) * Number(ci.unit_price);
          return `<tr><td>${items.length + i + 1}</td><td class="cp">(CP) ${esc(ci.name)}</td><td style="text-align:right">${esc(ci.quantity)}</td><td style="text-align:right">${fmt(ci.unit_price)}</td><td style="text-align:right;font-weight:600">${fmt(total)}</td></tr>`;
        })
        .join("")
    : "";

  return `
  <table>
    <thead><tr><th style="text-align:left">#</th><th style="text-align:left">Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${body}${custom}</tbody>
  </table>`;
}

function summary(invoice: Invoice, store: StoreInfo): string {
  const rows: string[] = [];
  if (Number(invoice.shipping_amount) > 0) {
    rows.push(`<div class="summary-row"><span>Shipping</span><span>${fmt(invoice.shipping_amount)}</span></div>`);
  }
  if (Number(invoice.manual_discount) > 0) {
    rows.push(`<div class="summary-row" style="color:#c00"><span>Discount</span><span>-${fmt(invoice.manual_discount)}</span></div>`);
  }
  if (Number(invoice.amount_paid) > 0 && Number(invoice.remaining_balance) > 0) {
    rows.push(`<div class="summary-row" style="color:#0a0"><span>Paid</span><span>${fmt(invoice.amount_paid)}</span></div>`);
  }
  rows.push(`<div class="summary-row total-line"><span>TOTAL</span><span>${esc(currency(store))} ${fmt(invoice.total_amount)}</span></div>`);
  return rows.join("");
}

const thermalBaseStyle = `
  *{margin:0;padding:0;box-sizing:border-box}
  @page{size:80mm auto;margin:0}
  body{font-family:'Segoe UI',system-ui,sans-serif;padding:14px;max-width:300px;margin:auto;color:#111;font-size:12px}
  .center{text-align:center}.right{text-align:right}.bold{font-weight:bold}
  hr{border:none;border-top:1px dashed #999;margin:8px 0}
  .company{font-size:15px;font-weight:700;margin-bottom:2px}
  .company sub{font-size:9px;font-weight:400;color:#555;display:block;margin-top:1px}
  .inv-type{font-size:11px;font-weight:600;margin:8px 0 2px}
  .inv-num{font-size:13px;font-weight:700}
  .sec-title{font-size:10px;font-weight:600;margin:8px 0 4px;text-transform:uppercase;letter-spacing:.5px}
  .ci-row{display:flex;justify-content:space-between;font-size:10px;padding:2px 0}
  .ci-row .label{color:#555}.ci-row .val{font-weight:500}
  table{width:100%;border-collapse:collapse}
  thead th{font-size:9px;padding:4px 2px;border-bottom:1px solid #333;text-transform:uppercase;font-weight:600}
  tbody td{font-size:10px;padding:4px 2px;border-bottom:1px dotted #ddd}
  .cp{font-style:italic;color:#4f46e5}
  .summary{font-size:10px;padding:3px 0}
  .summary-row{display:flex;justify-content:space-between;padding:2px 0}
  .total-line{font-size:14px;font-weight:700;border-top:2px solid #333;padding-top:6px;margin-top:4px}
  .note{font-size:8px;color:#777;margin-top:10px;text-align:center;line-height:1.5}
  .footer{text-align:center;margin-top:8px}
  .footer .name{font-size:11px;font-weight:700}
  .footer .by{font-size:8px;color:#999}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;padding:8px}}
`;

const thermalStandardBody = (store: StoreInfo, invoice: Invoice) => {
  const addressPhone = [store.address, store.phone_number ? `Ph: ${store.phone_number}` : ""].filter(Boolean).join(" | ");
  return `
  <div class="center company">${esc(store.name || "Zmapos")}${addressPhone ? `<sub>${esc(addressPhone)}</sub>` : ""}</div>
  <div class="center inv-type">${invoice.payment_type === "debt" ? "DEBT" : "CASH"} INVOICE: #${esc(invoice.invoice_number)}</div>
  <hr>
  <div class="sec-title">Customer Information</div>
  ${customerRows(invoice)}
  <hr>
  ${itemRows(invoice)}
  <hr>
  <div class="summary">${summary(invoice, store)}</div>
  <hr>
  <div class="note">Note: Please keep this invoice with yourself. If you want to track your orders, your purchasing history or any refund policy, Thank you.</div>
  <div class="footer">
    <div class="by">Automated Software Invoice</div>
    <div class="by" style="margin-top:2px">Software by ZMAPOS.com</div>
  </div>`;
};

const thermalCompactBody = (store: StoreInfo, invoice: Invoice) => {
  const addressPhone = [store.address, store.phone_number].filter(Boolean).join(" · ");
  return `
  <div class="center company">${esc(store.name || "Zmapos")}</div>
  ${addressPhone ? `<div class="center" style="font-size:9px;color:#555">${esc(addressPhone)}</div>` : ""}
  <div class="center inv-type">${invoice.payment_type === "debt" ? "DEBT" : "CASH"} #${esc(invoice.invoice_number)}</div>
  <hr>
  ${itemRows(invoice)}
  <hr>
  <div class="summary">${summary(invoice, store)}</div>
  <div class="note" style="margin-top:6px">${esc(store.name || "Thank you")} · ${esc(toDate(invoice).toLocaleString())}</div>`;
};

const a4BaseStyle = `
  *{margin:0;padding:0;box-sizing:border-box}
  @page{size:A4;margin:0}
  body{font-family:'Segoe UI',system-ui,sans-serif;padding:50px 60px;max-width:210mm;margin:auto;color:#111}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:3px solid #111}
  .header .company{font-size:24px;font-weight:700}
  .header .contact{font-size:10px;color:#555;margin-top:3px}
  .header .invoice{text-align:right}
  .header .inv-type{font-size:13px;font-weight:600;text-transform:uppercase}
  .header .inv-num{font-size:16px;font-weight:700;margin-top:2px}
  .ci-section{display:flex;gap:40px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #ddd}
  .ci-section .label{font-size:9px;text-transform:uppercase;color:#777;margin-bottom:2px}
  .ci-section .val{font-size:13px;font-weight:500}
  .ci-section .right{text-align:right}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}
  thead th{font-size:9px;text-transform:uppercase;padding:8px 10px;border-top:1px solid #111;border-bottom:1px solid #111;font-weight:600;color:#555}
  tbody td{font-size:12px;padding:8px 10px;border-bottom:1px solid #eee}
  .cp{font-style:italic;color:#4f46e5}
  .summary{width:50%;margin-left:auto}
  .summary-row{display:flex;justify-content:space-between;padding:4px 0;font-size:12px;border-bottom:1px solid #eee}
  .total-line{font-size:16px;font-weight:700;border-bottom:3px double #111;padding-top:8px;margin-top:4px}
  .note{font-size:9px;color:#777;margin-top:30px;text-align:center;line-height:1.6}
  .footer{text-align:center;margin-top:12px}
  .footer .name{font-size:13px;font-weight:700}
  .footer .by{font-size:9px;color:#999}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;padding:20px 30px}}
`;

const a4StandardBody = (store: StoreInfo, invoice: Invoice) => {
  const customerName = invoice.customer_name
    ? `<div class="label">Customer</div><div class="val">${esc(invoice.customer_name)}</div>`
    : "";
  const cashierName = invoice.cashier_name
    ? `<div class="label" style="margin-top:8px">Bill Printed By</div><div class="val">${esc(String(invoice.cashier_name).toUpperCase())}</div>`
    : "";
  return `
  <div class="header">
    <div>
      <div class="company">${esc(store.name || "Zmapos")}</div>
      ${store.address ? `<div class="contact">${esc(store.address)}</div>` : ""}
      ${store.phone_number ? `<div class="contact">Ph: ${esc(store.phone_number)}</div>` : ""}
    </div>
    <div class="invoice">
      <div class="inv-type">${invoice.payment_type === "debt" ? "DEBT" : "CASH"} INVOICE</div>
      <div class="inv-num">#${esc(invoice.invoice_number)}</div>
    </div>
  </div>
  <div class="ci-section">
    <div>${customerName}${cashierName}</div>
    <div style="flex:1"></div>
    <div class="right">
      <div class="label">Order Status</div><div class="val">${esc(statusLabel(invoice.status))}</div>
      <div class="label" style="margin-top:8px">Bill Date</div><div class="val">${esc(toDate(invoice).toLocaleString())}</div>
    </div>
  </div>
  ${itemRows(invoice)}
  <div class="summary">${summary(invoice, store)}</div>
  <div class="note">Please keep this invoice with yourself. If you want to track your orders, your purchasing history or any refund policy, Thank you.</div>
  <div class="footer">
    <div class="name">${esc(store.name || "Zmapos")}</div>
    <div class="by">Automated Software Invoice</div>
    <div class="by">Powered by ZMAPOS.com</div>
  </div>`;
};

const a4ModernBody = (store: StoreInfo, invoice: Invoice) => {
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
      <div class="label">Order Status</div><div class="val">${esc(statusLabel(invoice.status))}</div>
      <div class="label" style="margin-top:8px">Bill Date</div><div class="val">${esc(toDate(invoice).toLocaleString())}</div>
    </div>
  </div>
  ${itemRows(invoice)}
  <div class="summary">${summary(invoice, store)}</div>
  <div class="note">Thank you for your business. This invoice was generated automatically.</div>
  <div class="footer">
    <div class="name" style="font-size:13px;font-weight:700">${esc(store.name || "Zmapos")}</div>
    <div class="by">Powered by ZMAPOS.com</div>
  </div>`;
};

function render(style: string, body: string, title: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>${style}</style></head><body>${body}</body></html>`;
}

export const TEMPLATES: Record<TemplateId, { label: string; type: "thermal" | "a4"; render: (store: StoreInfo, invoice: Invoice) => string }> = {
  "thermal-standard": {
    label: "Thermal Standard",
    type: "thermal",
    render: (store, invoice) => render(thermalBaseStyle, thermalStandardBody(store, invoice), invoice.invoice_number),
  },
  "thermal-compact": {
    label: "Thermal Compact",
    type: "thermal",
    render: (store, invoice) => render(thermalBaseStyle, thermalCompactBody(store, invoice), invoice.invoice_number),
  },
  "a4-standard": {
    label: "A4 Standard",
    type: "a4",
    render: (store, invoice) => render(a4BaseStyle, a4StandardBody(store, invoice), invoice.invoice_number),
  },
  "a4-modern": {
    label: "A4 Modern",
    type: "a4",
    render: (store, invoice) => render(a4BaseStyle, a4ModernBody(store, invoice), invoice.invoice_number),
  },
};

export function renderTemplate(
  templateId: string,
  store: StoreInfo,
  invoice: Invoice,
): string {
  const template = TEMPLATES[templateId as TemplateId] || TEMPLATES["thermal-standard"];
  return template.render(store, invoice);
}

export { thermalStandardBody as thermalTemplate, a4StandardBody as A4Template };
