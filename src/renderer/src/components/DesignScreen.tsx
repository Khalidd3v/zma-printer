import { useEffect, useState } from "react";
import type { Settings, TableColumnId } from "../../../main/config/defaults";
import { DEFAULT_A4_COLUMNS, DEFAULT_THERMAL_COLUMNS } from "../../../main/config/defaults";
import ColumnEditor from "./ColumnEditor";

interface Props {
  settings: Settings;
  onUpdate: (patch: Partial<Settings>) => void;
  onBack: () => void;
}

export default function DesignScreen({ settings, onUpdate, onBack }: Props) {
  const [thermalColumns, setThermalColumns] = useState<TableColumnId[]>(settings.columns?.thermal || DEFAULT_THERMAL_COLUMNS);
  const [a4Columns, setA4Columns] = useState<TableColumnId[]>(settings.columns?.a4 || DEFAULT_A4_COLUMNS);
  const [thermalNote, setThermalNote] = useState(settings.thermal_note || "");
  const [thermalFooter, setThermalFooter] = useState(settings.thermal_footer || "");
  const [a4Note, setA4Note] = useState(settings.a4_note || "");
  const [a4Footer, setA4Footer] = useState(settings.a4_footer || "");

  useEffect(() => {
    setThermalColumns(settings.columns?.thermal || DEFAULT_THERMAL_COLUMNS);
    setA4Columns(settings.columns?.a4 || DEFAULT_A4_COLUMNS);
    setThermalNote(settings.thermal_note || "");
    setThermalFooter(settings.thermal_footer || "");
    setA4Note(settings.a4_note || "");
    setA4Footer(settings.a4_footer || "");
  }, [settings]);

  const save = () => {
    onUpdate({
      columns: { thermal: thermalColumns, a4: a4Columns },
      thermal_note: thermalNote,
      thermal_footer: thermalFooter,
      a4_note: a4Note,
      a4_footer: a4Footer,
    });
  };

  return (
    <section className="card design-screen">
      <div className="card-head">
        <h2>Invoice Design</h2>
        <button className="btn small" onClick={onBack}>← Back</button>
      </div>

      <div className="design-grid">
        <div className="design-col">
          <h3 className="design-title">Thermal (80mm)</h3>
          <div className="field">
            <span className="label">Table columns (max 4)</span>
            <ColumnEditor
              title="Thermal Columns"
              initial={thermalColumns}
              maxColumns={4}
              onSave={(cols) => setThermalColumns(cols)}
            />
          </div>
          <label className="field">
            <span className="label">Note message</span>
            <textarea
              className="design-textarea"
              rows={3}
              value={thermalNote}
              onChange={(e) => setThermalNote(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="label">Footer message (one line per row)</span>
            <textarea
              className="design-textarea"
              rows={2}
              value={thermalFooter}
              onChange={(e) => setThermalFooter(e.target.value)}
            />
          </label>
        </div>

        <div className="design-col">
          <h3 className="design-title">A4</h3>
          <div className="field">
            <span className="label">Table columns (max 5)</span>
            <ColumnEditor
              title="A4 Columns"
              initial={a4Columns}
              maxColumns={5}
              onSave={(cols) => setA4Columns(cols)}
            />
          </div>
          <label className="field">
            <span className="label">Note message</span>
            <textarea
              className="design-textarea"
              rows={3}
              value={a4Note}
              onChange={(e) => setA4Note(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="label">Footer message (one line per row)</span>
            <textarea
              className="design-textarea"
              rows={2}
              value={a4Footer}
              onChange={(e) => setA4Footer(e.target.value)}
            />
          </label>
        </div>
      </div>

      <button className="btn" onClick={save}>Save Design</button>
    </section>
  );
}
