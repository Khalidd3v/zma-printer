import type { Settings } from "../../../main/config/defaults";

interface Props {
  settings: Settings;
  onBack: () => void;
}

const Code = ({ children }: { children: string }) => <pre className="dev-code-block">{children}</pre>;

const Inline = ({ children }: { children: string }) => <code className="dev-code-inline">{children}</code>;

const H2 = ({ children }: { children: React.ReactNode }) => <h3 className="dev-h2">{children}</h3>;

const P = ({ children }: { children: React.ReactNode }) => <p className="dev-p">{children}</p>;

export default function DeveloperScreen({ settings, onBack }: Props) {
  const baseUrl = settings.cloud.base_url || "https://api.your-backend.com";
  const wsUrl = settings.cloud.ws_url || "wss://api.your-backend.com/ws/printing/";
  const secret = settings.cloud.secret || "<YOUR_POS_SECRET>";

  const genericExample = `{
  "schema": "generic",
  "printer_type": "thermal",
  "template": "thermal-standard",
  "copies": 1,
  "store": {
    "name": "My Store",
    "address": "123 Main St",
    "phone_number": "021-1234567",
    "currency": "PKR",
    "currency_symbol": "Rs"
  },
  "invoice": {
    "invoice_number": "INV-1001",
    "payment_type": "cash",
    "customer_name": "Walk-in Customer",
    "customer_phone": "03001234567",
    "cashier_name": "admin",
    "status": "completed",
    "sale_date": "2026-08-29T10:30:00Z",
    "items": [
      { "product_name": "Panadol", "quantity": 2, "sale_price": 130, "unit_discount": 0 },
      { "product_name": "Carpet", "size": "12x15", "quantity": 1, "sale_price": 8500 }
    ],
    "shipping_amount": 0,
    "manual_discount": 0,
    "amount_paid": 8760,
    "remaining_balance": 0,
    "total_amount": 8760
  }
}`;

  const zmaposExample = `{
  "schema": "zmapos",
  "printer_type": "thermal",
  "template": "thermal-standard",
  "store": {
    "name": "My Store",
    "address": "123 Main St",
    "phone_number": "021-1234567",
    "currency": "PKR"
  },
  "sale": {
    "invoice_number": "INV-1001",
    "payment_type": "cash",
    "customer_name": "Walk-in Customer",
    "customer_phone": "03001234567",
    "cashier_name": "admin",
    "status": "completed",
    "sale_date": "2026-08-29T10:30:00Z",
    "items": [
      { "product_name": "Panadol", "quantity": 2, "sale_price": 130, "unit_discount": 0 }
    ],
    "amount_paid": 260,
    "remaining_balance": 0,
    "total_amount": 260
  }
}`;

  return (
    <section className="card dev-screen">
      <div className="card-head">
        <h2>Developer Documentation</h2>
        <button className="btn small" onClick={onBack}>← Back</button>
      </div>

      <H2>Overview</H2>
      <P>
        The Zma Printer Agent is a free, open-source desktop application that turns any POS / ERP / backend
        into a receipt printer. It runs a lightweight WebSocket client in the background. Your backend pushes
        a JSON print job to the agent, the agent renders the invoice and prints it directly to the selected OS
        printer (thermal 80mm or A4). No cloud dependency, no vendor lock-in — you only need an internet
        connection between your backend and this app.
      </P>

      <H2>Repository</H2>
      <P>Source code (MIT licensed, free to use):</P>
      <Code>{`https://github.com/Khalidd3v/zma-printer`}</Code>
      <P>Developed by <strong>Khalidd3v</strong>.</P>

      <H2>How it works (architecture)</H2>
      <P>1. This app connects out to your WebSocket endpoint using a per-POS secret token.</P>
      <P>2. Your backend detects a new invoice (sale created) and pushes a print job JSON message.</P>
      <P>3. The app validates the payload, renders the invoice HTML, and prints silently to the selected printer.</P>
      <P>4. The app acknowledges the job back to your backend with a success/failure status.</P>
      <P>5. If the app was offline when the job was created, your backend can re-send queued jobs on reconnect (catch-up). The app reconnects automatically every 3 seconds.</P>

      <H2>Connection settings (from the Cloud Push panel)</H2>
      <P>
        The store owner pastes these three values into the app's <strong>Cloud Push</strong> card. They are saved
        locally and never leave the machine.
      </P>
      <P><strong>API base URL</strong></P>
      <Code>{baseUrl}</Code>
      <P><strong>WebSocket URL</strong></P>
      <Code>{wsUrl}</Code>
      <P><strong>POS Secret (token)</strong></P>
      <Code>{secret}</Code>
      <P>The app appends the secret as a query parameter: <Inline>{`${wsUrl}?secret=${secret}`}</Inline></P>

      <H2>WebSocket protocol</H2>
      <P><strong>Connect:</strong></P>
      <Code>{`wss://<your-host>/ws/printing/?secret=<POS_SECRET>`}</Code>
      <P><strong>Message shape the app expects (sent by your backend):</strong></P>
      <Code>{`{
  "type": "print_job",          // any string; the app keys off the "job" field
  "job": {
    "id": "uuid-of-this-print-job",
    "invoice_number": "INV-1001",
    "printer_type": "thermal",   // "thermal" | "a4"
    "template": "thermal-standard",
    "payload": {                 // the full print payload (see schema below)
      "schema": "generic",
      "printer_type": "thermal",
      "template": "thermal-standard",
      "store": { ... },
      "invoice": { ... }         // or "sale": { ... } for schema "zmapos"
    }
  }
}`}</Code>
      <P>
        The app is flexible: the job can be at the top level (<Inline>{"{ type, job, ... }"}</Inline>), under
        <Inline>{"data"}</Inline>, or the whole message can be the job itself. It reads
        <Inline>{"payload.sale"}</Inline> or <Inline>{"payload.invoice"}</Inline> as the invoice data.
      </P>

      <H2>Acknowledge (ack) endpoint</H2>
      <P>After printing (or failing), the app POSTs the result back to your backend:</P>
      <Code>{`POST {base_url}/api/v1/printing/jobs/{job_id}/ack/
Authorization: Bearer {POS_SECRET}
Content-Type: application/json

{
  "status": "printed",          // "printed" | "failed"
  "error_message": "",          // set when failed
  "printer_name": "EPSON TM-T88V"
}`}</Code>

      <H2>JSON Schema — print job</H2>
      <P>The full contract. <Inline>schema</Inline>, <Inline>printer_type</Inline> and the invoice are required.</P>
      <Code>{`{
  "schema": "generic" | "zmapos",
  "printer_type": "thermal" | "a4",
  "printer_name": "optional OS printer name",
  "copies": 1,
  "template": "thermal-standard" | "thermal-compact" | "a4-standard" | "a4-modern",

  "store": {
    "name": "My Store",
    "address": "123 Main St",
    "phone_number": "021-1234567",
    "currency": "PKR",
    "currency_symbol": "Rs"
  },

  // When schema is "generic", the invoice lives here:
  "invoice": {
    "invoice_number": "INV-1001",       // required
    "payment_type": "cash" | "debt",
    "customer_name": "string | null",
    "customer_phone": "string | null",
    "customer_address": "string | null",
    "cashier_name": "string | null",
    "status": "completed | string",
    "sale_date": "ISO 8601 string | null",
    "items": [
      {
        "product_name": "string",
        "product_id": "string | number | null",
        "product_size": "string",        // or "size" / "size_name"
        "quantity": "number | string",
        "sale_price": "number | string",
        "unit_discount": "number | string"
      }
    ],
    "custom_invoice": {
      "items": [
        { "name": "Custom", "quantity": 1, "unit_price": 50, "line_total": 50 }
      ]
    },
    "shipping_amount": "number | string",
    "manual_discount": "number | string",
    "amount_paid": "number | string",
    "remaining_balance": "number | string",
    "total_amount": "number | string"    // required
  },

  // When schema is "zmapos", the invoice lives under "sale" instead:
  "sale": { /* same shape as "invoice" above */ }
}`}</Code>

      <H2>Example — generic thermal job</H2>
      <Code>{genericExample}</Code>

      <H2>Example — zmapos job</H2>
      <Code>{zmaposExample}</Code>

      <H2>Templates &amp; printer types</H2>
      <P><strong>printer_type</strong> (required):</P>
      <P>• <Inline>thermal</Inline> — 80mm receipt. Table columns user-selectable (max 4: Item, Size, Qty, Price, Total).</P>
      <P>• <Inline>a4</Inline> — full A4 invoice. Columns user-selectable (max 5).</P>
      <P><strong>template</strong> (optional, defaults per printer type):</P>
      <P>• <Inline>thermal-standard</Inline> — bold 13px, bordered table (default)</P>
      <P>• <Inline>thermal-compact</Inline> — minimal spacing</P>
      <P>• <Inline>a4-standard</Inline> — classic A4 (default)</P>
      <P>• <Inline>a4-modern</Inline> — card-style A4</P>

      <H2>Tips for backend developers</H2>
      <P>• Send the job over WebSocket the moment the invoice is created. If the app is offline, queue the job and push it again on the next connection — the app prints it as a catch-up.</P>
      <P>• Always include line items (<Inline>items</Inline>) — the receipt shows a "No line items" placeholder when empty.</P>
      <P>• Provide <Inline>product_size</Inline> / <Inline>size</Inline> for products with variants — it shows in the Size column when enabled.</P>
      <P>• The app handles reconnects and acknowledges each job, so deduplicate on your side by job <Inline>id</Inline>.</P>
    </section>
  );
}
