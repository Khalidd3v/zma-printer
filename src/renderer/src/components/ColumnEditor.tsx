import { useEffect, useState } from "react";
import type { TableColumnId } from "../../../main/config/defaults";

const COLUMN_OPTIONS: { id: TableColumnId; label: string }[] = [
  { id: "item", label: "Item" },
  { id: "size", label: "Size" },
  { id: "qty", label: "Qty" },
  { id: "price", label: "Price" },
  { id: "total", label: "Total" },
];

interface Props {
  title: string;
  initial: TableColumnId[];
  maxColumns: number;
  onSave: (columns: TableColumnId[]) => void;
}

export default function ColumnEditor({ title, initial, maxColumns, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<TableColumnId[]>(initial);

  useEffect(() => {
    setSelected(initial);
  }, [initial]);

  const toggle = (id: TableColumnId) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        // Always keep at least one column.
        if (prev.length <= 1) return prev;
        return prev.filter((c) => c !== id);
      }
      if (prev.length >= maxColumns) {
        // Reaching the max: replace the last-selected (non-required) column.
        return [...prev.slice(0, prev.length - 1), id];
      }
      return [...prev, id];
    });
  };

  const reorder = (id: TableColumnId, dir: -1 | 1) => {
    setSelected((prev) => {
      const idx = prev.indexOf(id);
      const target = idx + dir;
      if (idx === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const save = () => {
    onSave(selected);
    setOpen(false);
  };

  return (
    <div className="column-editor">
      <button className="btn small" onClick={() => setOpen((o) => !o)}>
        {open ? "Close" : "Edit Columns"}
      </button>
      {open && (
        <div className="column-editor-popover">
          <div className="column-editor-head">
            <strong>{title}</strong>
            <span className="column-editor-hint">Max {maxColumns} columns</span>
          </div>
          <div className="column-editor-list">
            {COLUMN_OPTIONS.map((opt) => {
              const isSelected = selected.includes(opt.id);
              const isMaxed = selected.length >= maxColumns && !isSelected;
              return (
                <div key={opt.id} className={`column-editor-item ${isSelected ? "selected" : ""} ${isMaxed ? "disabled" : ""}`}>
                  <label className="column-editor-check">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isMaxed}
                      onChange={() => toggle(opt.id)}
                    />
                    <span>{opt.label}</span>
                  </label>
                  {isSelected && (
                    <div className="column-editor-order">
                      <button className="btn tiny" onClick={() => reorder(opt.id, -1)} disabled={selected.indexOf(opt.id) === 0}>◀</button>
                      <button className="btn tiny" onClick={() => reorder(opt.id, 1)} disabled={selected.indexOf(opt.id) === selected.length - 1}>▶</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="column-editor-footer">
            <span className="column-editor-preview">{selected.map((c) => COLUMN_OPTIONS.find((o) => o.id === c)?.label).join(" · ")}</span>
            <button className="btn small" onClick={save}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}
