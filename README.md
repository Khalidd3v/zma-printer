# 🖨️ Zma Printer Agent

**Turn any POS / ERP / backend into a real receipt printer — free, open source, no cloud lock-in.**

The Zma Printer Agent is a cross-platform desktop app (Windows & macOS) that runs in the background, connects to your backend over WebSocket, and prints invoices directly to thermal (80mm) or A4 printers the moment a sale happens. It's framework-agnostic — if your backend can open a WebSocket and send JSON, it can print.

> **No browser. No vendor cloud. No per-print fees.** The app is the print bridge.

---

## ✨ Features

| Feature | Details |
|---|---|
| ⚡ Realtime printing | Backend pushes a JSON job over WebSocket → prints in seconds |
| 📠 Thermal & A4 | 80mm receipt and full A4 invoice templates |
| 🎨 Editable design | Choose table columns (Item, Size, Qty, Price, Total), note & footer text |
| 🔌 Framework-agnostic | Any backend: any language, any stack |
| 🔐 Token secured | Per-POS secret; only authorized jobs print |
| 🔁 Auto-reconnect | Reconnects every 3s and catches up on queued jobs |
| ✅ Job acknowledgements | App acks each job back to your backend (`printed` / `failed`) |
| 🖥️ System tray | Runs quietly in the tray, no window needed |
| 📋 Job log | Full history of every print job with status |

---

## 🚀 Quick Start

### Run from source

```bash
npm install
npm run dev
```

### Use the app

1. Open the **Cloud Push** panel.
2. Paste your **API base URL**, **WebSocket URL**, and **POS secret**.
3. Click **Save Settings** — the app connects automatically.
4. Create an invoice in your POS → it prints instantly.

---

## 📡 How it works

```
┌─────────────┐    WebSocket push (JSON)    ┌────────────────────┐
│ Your backend │ ─────────────────────────▶ │ Zma Printer Agent  │
│ (any stack)  │                            │  (this desktop app) │
└─────────────┘                            └────────────────────┘
      ▲                                            │
      │                                            ▼
      │                                     ┌──────────────┐
      └───────── ack (printed/failed) ──────┘   OS printer │
                                                          
```

1. The app connects **out** to your WebSocket endpoint with the POS secret.
2. Your backend detects a new invoice and pushes a print job.
3. The app validates, renders, and silently prints to the selected printer.
4. The app POSTs an acknowledgement back to your backend.
5. Offline? Queue the job — the app receives it on reconnect (catch-up).

---

## 🔌 WebSocket Protocol

### Connect

```
wss://<your-host>/ws/printing/?secret=<POS_SECRET>
```

### Message your backend sends

```json
{
  "type": "print_job",
  "job": {
    "id": "uuid-of-this-print-job",
    "invoice_number": "INV-1001",
    "printer_type": "thermal",
    "template": "thermal-standard",
    "payload": {
      "schema": "generic",
      "printer_type": "thermal",
      "template": "thermal-standard",
      "store": { "name": "My Store", "address": "123 Main St", "phone_number": "021-1234567", "currency": "PKR" },
      "invoice": {
        "invoice_number": "INV-1001",
        "payment_type": "cash",
        "customer_name": "Walk-in",
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
    }
  }
}
```

### Ack endpoint (app → your backend)

```
POST {base_url}/api/v1/printing/jobs/{job_id}/ack/
Authorization: Bearer {POS_SECRET}
Content-Type: application/json

{
  "status": "printed",        // or "failed"
  "error_message": "",
  "printer_name": "EPSON TM-T88V"
}
```

---

## 📦 JSON Schema

Full contract: `schema`, `printer_type`, and the invoice are required.

```json
{
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

  "invoice": {
    "invoice_number": "INV-1001",
    "payment_type": "cash" | "debt",
    "customer_name": "string | null",
    "customer_phone": "string | null",
    "customer_address": "string | null",
    "cashier_name": "string | null",
    "status": "completed | string",
    "sale_date": "ISO 8601 | null",
    "items": [
      {
        "product_name": "string",
        "product_id": "string | number | null",
        "product_size": "string",
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
    "total_amount": "number | string"
  },

  "sale": { }
}
```

> **`schema: "generic"`** → invoice lives in `invoice`.\
> **`schema: "zmapos"`** → invoice lives in `sale` (same shape).

---

## 🖨️ Templates & Printer Types

| `printer_type` | Description |
|---|---|
| `thermal` | 80mm receipt. Table columns user-selectable (max 4) |
| `a4` | Full A4 invoice. Table columns user-selectable (max 5) |

| `template` | Type | Style |
|---|---|---|
| `thermal-standard` | Thermal | Bold 13px, bordered table (default) |
| `thermal-compact` | Thermal | Minimal spacing |
| `a4-standard` | A4 | Classic A4 (default) |
| `a4-modern` | A4 | Card-style modern |

The **Invoice Design** screen in the app lets users pick which columns print, and edit the note & footer text — all persisted locally.

---

## 🛠️ Project Structure

```
src/
  main/       Electron main process, WebSocket client, print pipeline
  preload/    contextBridge API
  renderer/   React settings / design / developer UI
docs/         API and integration guides
```

---

## 🤝 Contributing

We'd love your help! This project is open source and free for everyone.

**Any patch or pull request is welcome** — bug fixes, new templates, docs improvements, printer drivers, whatever you've got. If you build a WebSocket adapter for another stack, we'll gladly feature it.

- **Repo:** <https://github.com/Khalidd3v/zma-printer>
- **Issues:** Open one for bugs, feature requests, or questions
- **PRs:** Fork, branch, and open a pull request — we'll review promptly
- **License:** MIT — use it commercially, modify it, ship it. Just keep the attribution.

### Development

```bash
npm install
npm run dev          # run in dev mode
npm run typecheck    # type check
npm run build:win    # Windows NSIS installer + portable .exe
npm run build:mac    # macOS .dmg
```

---

## 📦 Building & Sharing

The easiest way to build is the interactive script — it asks which platform you want:

```bash
./build_package.sh
```

You'll be asked:

```
Which platform do you want to build for?
  1) Windows (NSIS installer + portable .exe)
  2) macOS (DMG)
  3) Both (Windows + macOS)
```

Pick **1**, **2**, or **3** and the script installs deps, type-checks, builds, and packages everything into `./release/`.

### What each file is for

| File | What it is | When to share it |
|---|---|---|
| `Zma Printer Agent-<ver>-windows-x64.exe` | **NSIS installer** (recommended for Windows) | Most Windows users — installs the app + Start Menu shortcut |
| `Zma Printer Agent-<ver>-windows-x64-PORTABLE.exe` | **Portable** — no install, just run | Quick testing or users who can't install software |
| `Zma Printer Agent-<ver>-mac-x64.dmg` | macOS disk image | Mac users — drag to Applications |

> **Recommended for sharing:** the **NSIS installer** (`*-windows-x64.exe`) on Windows, the **DMG** (`*-mac-x64.dmg`) on macOS.

### How to share with other PCs

1. **Windows (installer):** send `Zma Printer Agent-<ver>-windows-x64.exe` via USB, Google Drive, email, or GitHub Releases. The user double-clicks, chooses a location, and gets a Start Menu shortcut.
2. **Windows (portable):** send `*-windows-x64-PORTABLE.exe`. No install — double-click and it runs. Settings save per-user.
3. **macOS:** send `*-mac-x64.dmg`. The user opens it and drags the app to Applications.

**SmartScreen warning:** because the app is free/open-source and not code-signed, Windows may show *"Windows protected your PC"*. Click **More info → Run anyway** — this is normal for unsigned apps. To remove it, buy a code-signing certificate and set `CSC_LINK`/`CSC_KEY_PASSWORD` before building.

**Build requirements:**
- Windows `.exe` → build on Windows (or macOS with Wine installed)
- macOS `.dmg` → must be built on a Mac
- The GitHub Actions workflow in `.github/workflows/build.yml` builds both platforms automatically on release

---

## 📜 License

MIT — free to use, modify, and distribute. Attribution appreciated, not required.

---

**Built by [Khalidd3v](https://github.com/Khalidd3v)** · [Star the repo](https://github.com/Khalidd3v/zma-printer) ⭐
