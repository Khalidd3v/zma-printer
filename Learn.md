# Learn: How Zma Printer Agent Works

Zma Printer Agent is a desktop application that turns JSON into printed invoices. It runs on macOS and Windows and is designed to work with any POS, ERP, or e-commerce backend.

## The core problem

Printers are local hardware. A backend running on a server cannot directly command a printer plugged into a cashier's computer. The printer agent runs on that computer and acts as the bridge.

## Two communication patterns

### 1. Local push

The backend and the desktop agent are on the same machine (or same local network). The backend sends an HTTP request to the agent, and the agent prints immediately.

```
Backend (localhost/LAN)
   │  POST /print  (JSON + token)
   ▼
Printer Agent
   │  system print
   ▼
Thermal or A4 printer
```

### 2. Cloud push

The backend is hosted on the internet. It cannot reach the cashier's computer directly. Instead, the backend stores a print job in a durable queue and pushes the job ID over a WebSocket. The desktop agent maintains the connection and prints as soon as a job arrives.

```
Hosted backend
   │  invoice created
   ▼
Print queue + WebSocket push
   │  real-time job push
   ▼
Printer Agent
   │  print + ack
   ▼
Thermal or A4 printer
```

The push model avoids constant polling load. The queue is retained as a catch-up layer, so an invoice is never lost if the desktop app reconnects.

## Local push details

The agent exposes a small HTTP server on `127.0.0.1:9210` by default.

- `GET /health` — status check
- `GET /printers` — list installed printers
- `POST /print` — print an invoice
- `POST /disconnect` — release the paired service

`POST /print` requires:

- `Authorization: Bearer <TOKEN>`
- `X-Service-Id: <stable-service-id>`

Only one service can be paired at a time. The first valid request pairs the agent; other services get `409 Conflict` until the current service disconnects.

## Cloud push details

For a hosted backend, the agent connects to a WebSocket endpoint using a per-store (per-POS) secret. When the backend creates an invoice, it pushes the job over that connection. The agent prints it and acknowledges the result over HTTP.

On connect, the agent receives any already-queued jobs, so it recovers cleanly after a disconnect. Because the connection is outbound, the agent works even when the cashier's machine is behind NAT or has no public IP address.

## JSON contracts

The agent accepts a generic schema that any backend can produce, plus a ZmaPOS-specific schema.

### Generic

```json
{
  "schema": "generic",
  "printer_type": "thermal",
  "template": "thermal-standard",
  "store": {
    "name": "My Store",
    "currency_symbol": "Rs"
  },
  "invoice": {
    "invoice_number": "INV-001",
    "total_amount": 100,
    "items": [
      { "product_name": "Item", "quantity": 1, "sale_price": 100 }
    ]
  }
}
```

### ZmaPOS

```json
{
  "schema": "zmapos",
  "printer_type": "thermal",
  "template": "thermal-standard",
  "store": { "name": "My Store" },
  "sale": {
    "invoice_number": "INV-001",
    "total_amount": 100,
    "items": []
  }
}
```

The ZmaPOS schema is normalized into the same internal invoice model as the generic schema, so both produce identical output.

## Templates

Each printer type has multiple templates. The caller can choose one with the `template` field, or the agent uses a sensible default.

| Template | Type |
|---|---|
| `thermal-standard` | Thermal 80mm |
| `thermal-compact` | Thermal 80mm |
| `a4-standard` | A4 |
| `a4-modern` | A4 |

## Printing pipeline

1. Validate and normalize the JSON.
2. Choose a template.
3. Render an HTML invoice.
4. Resolve the printer: request-provided name → configured printer → OS default.
5. Create a hidden window and call Electron's `webContents.print()`.
6. Log the result and return success/failure.

## Security

- The local server binds to loopback by default. LAN access is opt-in.
- `/print` and `/disconnect` require a bearer token.
- Cloud push uses a separate per-POS secret.
- Request bodies are limited to 1 MB and validated against a schema.

The local token is a trust boundary, not a substitute for authentication on a public network. Keep LAN binding disabled unless you understand the exposure.

## Why Electron?

Electron provides mature cross-platform packaging and a reliable system-print API (`webContents.print()`). Rendering HTML invoices and sending them to installed thermal or A4 printers works consistently on macOS and Windows without vendor-specific driver code.
