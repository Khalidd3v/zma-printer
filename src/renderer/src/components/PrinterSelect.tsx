import { useEffect, useMemo, useRef, useState } from "react";
import type { PrinterInfo } from "../../../main/types";

interface Props {
  value: string;
  label: string;
  printers: PrinterInfo[];
  placeholder: string;
  emptyText: string;
  onChange: (value: string) => void;
}

export default function PrinterSelect({ value, label, printers, placeholder, emptyText, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = printers.find((p) => p.name === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return printers;
    return printers.filter((p) =>
      `${p.displayName} ${p.name} ${p.brand || ""} ${p.model || ""}`.toLowerCase().includes(q),
    );
  }, [printers, query]);

  useEffect(() => {
    if (selected) setQuery(selected.displayName);
  }, [value, selected]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <label className="field">
      <span className="label">{label}</span>
      <div className="printer-select" ref={rootRef}>
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onFocus={() => {
            setOpen(true);
            if (!query) setQuery("");
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
        />
        {open && (
          <div className="printer-select-menu">
            <button
              type="button"
              className="printer-option"
              onClick={() => {
                onChange("");
                setQuery("");
                setOpen(false);
              }}
            >
              OS default
            </button>
            {filtered.length === 0 ? (
              <div className="printer-option muted">{emptyText}</div>
            ) : (
              filtered.map((p) => (
                <button
                  type="button"
                  key={p.name}
                  className={`printer-option${p.name === value ? " selected" : ""}`}
                  onClick={() => {
                    onChange(p.name);
                    setQuery(p.displayName);
                    setOpen(false);
                  }}
                >
                  <span className="printer-option-main">{p.displayName}</span>
                  <span className="printer-option-meta">
                    {p.brand ? `${p.brand} · ` : ""}
                    {p.model || p.name}
                    {p.isDefault ? " · default" : ""}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      <p className="hint">{filtered.length} printer(s) available.</p>
    </label>
  );
}
