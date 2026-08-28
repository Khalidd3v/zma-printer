# API Reference

The Zma Printer Agent runs a local HTTP server that turns JSON into printed invoices. It binds to `127.0.0.1:9210` by default. The port and bind address can be changed in the UI.

Base URL: `http://127.0.0.1:9210`

## Two ways to receive jobs

### 1. Local push

Any backend running on the same machine (or LAN, if enabled) can `POST /print` with the local token. This is the simplest offline flow.

### 2. Cloud push

When your backend is hosted (for example `https://api.example.com`), it cannot reach the local printer directly. The agent connects out to a WebSocket endpoint using a per-POS secret and receives invoices in real time as they are created. No polling is involved.

The local HTTP server keeps working even when cloud push is enabled.

## Security model

- `/print` and `/disconnect` require `Authorization: Bearer <TOKEN>`.
- Every `/print` request must include a stable `X-Service-Id` header.
- The **first** valid `/print` request pairs the agent with that service id. While paired, other service ids receive `409 Conflict`.
- The token is a local trust boundary, not a network secret. Keep the bind address on loopback unless you explicitly opt into LAN access.
- Cloud push uses a separate per-POS secret stored in the desktop settings.

## Local endpoints

### `GET /health`

Unauthenticated.

```json
{
  "status": "ok",
  "version": "1.0.0",
  "port": 9210,
  "paired": true,
  "service_id": "my-pos-terminal-1"
}
```

### `GET /printers`

Unauthenticated. Lists installed printers.

```json
{
  "printers": [
    { "name": "EPSON TM-T20", "displayName": "EPSON TM-T20", "isDefault": true }
  ]
}
```

### `POST /print`

Headers:

```
Authorization: Bearer <TOKEN>
X-Service-Id: <stable-id>
Content-Type: application/json
```

Success (`200`):

```json
{ "success": true, "job_id": "uuid", "printer_name": "EPSON TM-T20" }
```

Errors:

- `401` — invalid or missing token
- `400` — missing `X-Service-Id`
- `409` — a different service is already paired
- `422` — body failed schema validation
- `500` — printer resolution or print failure

### `POST /disconnect`

Headers:

```
Authorization: Bearer <TOKEN>
X-Service-Id: <paired-service-id>
```

Success:

```json
{ "success": true, "paired": false }
```

## Generic JSON contract

The full schema lives at `docs/json-schema/print-job.schema.json`. Minimal example:

```json
{
  "schema": "generic",
  "printer_type": "thermal",
  "printer_name": "EPSON TM-T20",
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
    "invoice_number": "INV-20260814-0001",
    "payment_type": "cash",
    "customer_name": "Walk-in",
    "cashier_name": "cashier@example.com",
    "status": "completed",
    "sale_date": "2026-08-14T10:30:00Z",
    "items": [
      { "product_name": "Panadol", "quantity": 2, "sale_price": 130, "unit_discount": 0 }
    ],
    "custom_invoice": {
      "items": [
        { "name": "Custom item", "quantity": 1, "unit_price": 50, "line_total": 50 }
      ]
    },
    "shipping_amount": 0,
    "manual_discount": 0,
    "amount_paid": 260,
    "remaining_balance": 0,
    "total_amount": 260
  }
}
```

## Templates

| Template id | Type | Description |
|---|---|---|
| `thermal-standard` | Thermal | Original ZmaPOS 80mm receipt |
| `thermal-compact` | Thermal | Minimal receipt with less spacing |
| `a4-standard` | A4 | Original ZmaPOS A4 invoice |
| `a4-modern` | A4 | Modern card-style A4 invoice |

The `template` field is optional. When omitted, the agent uses `thermal-standard` for thermal jobs and `a4-standard` for A4 jobs.

## ZmaPOS-specific JSON

ZmaPOS users can send raw serializer output with `schema: "zmapos"`. The app maps `sale` to the internal invoice model.

```json
{
  "schema": "zmapos",
  "printer_type": "thermal",
  "template": "thermal-standard",
  "store": { "name": "Zmapos Store", "address": "Karachi, PK", "phone_number": "021-1234567", "currency": "PKR" },
  "sale": {
    "invoice_number": "INV-20260814-0001",
    "payment_type": "cash",
    "customer_name": "Walk-in",
    "cashier_name": "cashier@example.com",
    "status": "completed",
    "sale_date": "2026-08-14T10:30:00Z",
    "items": [ { "product_name": "Panadol", "product_id": "uuid", "quantity": 2, "sale_price": 130, "unit_discount": 0 } ],
    "custom_invoice": { "items": [ { "name": "Custom", "quantity": 1, "unit_price": 50, "line_total": 50 } ] },
    "shipping_amount": 0,
    "manual_discount": 0,
    "amount_paid": 260,
    "remaining_balance": 0,
    "total_amount": 260
  }
}
```

## cURL examples

```bash
curl http://127.0.0.1:9210/health

curl http://127.0.0.1:9210/printers

curl -X POST http://127.0.0.1:9210/print \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Service-Id: my-pos-1" \
  -H "Content-Type: application/json" \
  -d '{"schema":"generic","printer_type":"thermal","template":"thermal-compact","invoice":{"invoice_number":"INV-1","total_amount":100}}'
```
