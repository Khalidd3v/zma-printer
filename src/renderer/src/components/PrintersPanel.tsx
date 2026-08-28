import { useEffect, useMemo, useState } from "react";
import type { Settings } from "../../../main/config/defaults";
import type { PrinterInfo } from "../../../main/types";
import PrinterSelect from "./PrinterSelect";

const thermalTemplates = [
  { value: "thermal-standard", label: "Thermal Standard" },
  { value: "thermal-compact", label: "Thermal Compact" },
];

const a4Templates = [
  { value: "a4-standard", label: "A4 Standard" },
  { value: "a4-modern", label: "A4 Modern" },
];

interface Props {
  settings: Settings;
  printers: PrinterInfo[];
  onUpdate: (patch: Partial<Settings>) => void;
  onRefresh: () => void;
}

export default function PrintersPanel({ settings, printers, onUpdate, onRefresh }: Props) {
  const [draft, setDraft] = useState({
    thermal_printer: settings.thermal_printer,
    a4_printer: settings.a4_printer,
    thermal_template: settings.thermal_template,
    a4_template: settings.a4_template,
  });

  useEffect(() => {
    setDraft({
      thermal_printer: settings.thermal_printer,
      a4_printer: settings.a4_printer,
      thermal_template: settings.thermal_template,
      a4_template: settings.a4_template,
    });
  }, [settings]);

  const { thermal, a4 } = useMemo(() => {
    const t = printers.filter((p) => p.matchedType === "thermal");
    const a = printers.filter((p) => p.matchedType === "a4");
    return { thermal: t, a4: a };
  }, [printers]);

  const save = () => onUpdate(draft);

  return (
    <section className="card">
      <div className="card-head">
        <h2>Printers &amp; Templates</h2>
        <button className="btn small" onClick={onRefresh}>Fetch Printers</button>
      </div>

      <PrinterSelect
        label="Thermal (80mm) printer"
        value={draft.thermal_printer}
        printers={thermal}
        placeholder="Search by model or name..."
        emptyText="No connected thermal printers detected — click Fetch Printers"
        onChange={(value) => setDraft((d) => ({ ...d, thermal_printer: value }))}
      />
      <label className="field">
        <span className="label">Thermal template</span>
        <select
          value={draft.thermal_template}
          onChange={(e) => setDraft((d) => ({ ...d, thermal_template: e.target.value }))}
        >
          {thermalTemplates.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </label>

      <PrinterSelect
        label="A4 printer"
        value={draft.a4_printer}
        printers={a4}
        placeholder="Search by model or name..."
        emptyText="No connected A4 printers detected — click Fetch Printers"
        onChange={(value) => setDraft((d) => ({ ...d, a4_printer: value }))}
      />
      <label className="field">
        <span className="label">A4 template</span>
        <select
          value={draft.a4_template}
          onChange={(e) => setDraft((d) => ({ ...d, a4_template: e.target.value }))}
        >
          {a4Templates.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </label>

      <button className="btn" onClick={save}>Save Settings</button>
    </section>
  );
}
