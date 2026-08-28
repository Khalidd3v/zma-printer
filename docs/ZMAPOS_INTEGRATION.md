# ZmaPOS Integration

The desktop agent has two integration modes. ZmaPOS can use either or both.

## Mode 1 — Browser/backend local push

If the POS frontend or backend runs on the same machine as the printer agent, send a `schema: "zmapos"` job directly to the local endpoint.

```js
const pos = JSON.parse(localStorage.getItem("zmapos_pos") || "null");
const sale = /* SaleSerializer response */;

await fetch("http://127.0.0.1:9210/print", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("print_agent_token")}`,
    "X-Service-Id": `zmapos-${pos?.id}`,
  },
  body: JSON.stringify({
    schema: "zmapos",
    printer_type: "thermal",
    template: "thermal-standard",
    store: pos,
    sale,
  }),
});
```

## Mode 2 — Cloud WebSocket push

When the backend is hosted (e.g. `https://api.zmapos.com`), it cannot reach the local printer. Instead, Django Channels pushes jobs to the connected desktop agent in real time.

Flow:

1. A `Sale` `post_save` signal creates a durable `PrintJob` in the queue.
2. The signal sends `job_id` to the POS's WebSocket group.
3. The desktop agent, connected to `wss://api.zmapos.com/ws/printing/?secret=<POS_SECRET>`, receives the job and prints it.
4. The agent acknowledges over HTTP `POST .../jobs/<job_id>/ack/`.
5. The job status becomes `printed` or `failed`.

On connect, the agent also receives any already-queued jobs, so it catches up after a disconnect. No polling.

The desktop app needs the POS print secret, which is generated automatically when a POS is created and stored in `POSPrinterConfig.secret`.

### Django service example

The signal fires automatically, so no explicit service call is needed. To send manually:

```python
from apps.printing.models import PrintJob
from apps.printing.serializers import build_print_payload

payload = build_print_payload(sale)
PrintJob.objects.create(
    pos=sale.pos,
    invoice_number=sale.invoice_number,
    printer_type=payload["printer_type"],
    template=payload["template"],
    payload=payload,
)
```

### WebSocket URL

```
wss://api.zmapos.com/ws/printing/?secret=<POS_SECRET>
```

### Acknowledge endpoint

```
POST /api/v1/printing/jobs/{job_id}/ack/
Authorization: Bearer <POS_SECRET>
Content-Type: application/json

{"status": "printed"}
```

## Pairing note

For local push, use a stable `X-Service-Id`. The recommended value is `zmapos-{pos_id}`. Only one local service can be paired at a time.
