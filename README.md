# Zma Printer Agent

Cross-platform desktop print agent for macOS and Windows. It runs a small local HTTP server that accepts JSON print jobs from any POS/ERP/backend — Django, PHP, Node, or anything that can make an HTTP request — and prints them directly to thermal (80mm) or A4 printers.

No cloud. No browser. The app itself is the offline print bridge.

## Features

- Thermal and A4 invoice templates matching ZmaPOS.
- Generic, framework-agnostic JSON schema.
- Built-in ZmaPOS adapter for `SaleSerializer` + `POSSerializer` output.
- Token-based single-service pairing (only one POS/ERP at a time).
- Loopback by default; optional LAN binding.
- Cloud WebSocket push support for hosted backends (no polling).
- Printer selection, test prints, job log, tray app.
- MIT licensed and built for other developers to integrate with PHP/ERP/POS systems.

## Quick start

```bash
npm install
npm run dev
```

The agent starts on `http://127.0.0.1:9210`. Copy the token from the UI.

```bash
curl http://127.0.0.1:9210/health
curl http://127.0.0.1:9210/printers
```

## Print a job

```bash
curl -X POST http://127.0.0.1:9210/print \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Service-Id: my-pos-1" \
  -H "Content-Type: application/json" \
  -d '{
    "schema": "generic",
    "printer_type": "thermal",
    "store": { "name": "My Store", "currency_symbol": "Rs" },
    "invoice": {
      "invoice_number": "INV-1",
      "total_amount": 100,
      "items": [ { "product_name": "Item", "quantity": 1, "sale_price": 100 } ]
    }
  }'
```

## Build installers

```bash
npm run build:mac   # macOS .dmg
npm run build:win   # Windows NSIS .exe
```

## Documentation

- [API Reference](docs/API.md)
- [ZmaPOS Integration](docs/ZMAPOS_INTEGRATION.md)
- [Learn — how it works](Learn.md)
- [Generic JSON Schema](docs/json-schema/print-job.schema.json)

## How it works

1. POS/ERP sends JSON to the local HTTP server, **or** a hosted backend pushes jobs over WebSocket.
2. The agent validates and normalizes the request.
3. A hidden Electron window renders the invoice HTML.
4. `webContents.print()` sends it to the selected OS printer.

## Project structure

```
src/
  main/       Electron main process, HTTP server, print pipeline
  preload/    contextBridge API
  renderer/   React settings/status UI
docs/         API and integration guides
```

## License

MIT
