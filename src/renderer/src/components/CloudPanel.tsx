import { useEffect, useState } from "react";
import type { Settings } from "../../../main/config/defaults";
import type { CloudStatus } from "../../../main/types";
import { api } from "../api";

interface Props {
  settings: Settings;
  onUpdate: (patch: Partial<Settings>) => void;
  onDisconnect: () => void;
}

const statusLabel: Record<CloudStatus, string> = {
  connected: "Connected",
  connecting: "Connecting...",
  disconnected: "Disconnected",
  no_internet: "No Internet",
  disabled: "Disabled",
};

const statusBadge: Record<CloudStatus, string> = {
  connected: "badge-green",
  connecting: "badge-gray",
  disconnected: "badge-red",
  no_internet: "badge-red",
  disabled: "badge-gray",
};

export default function CloudPanel({ settings, onUpdate, onDisconnect }: Props) {
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>("disabled");
  const [draft, setDraft] = useState<Settings["cloud"]>(settings.cloud);

  useEffect(() => {
    setDraft(settings.cloud);
  }, [settings.cloud]);

  useEffect(() => {
    let mounted = true;
    void api.getCloudStatus().then((status) => {
      if (mounted) setCloudStatus(status);
    });
    const unsubscribe = api.onCloudStatus((status) => {
      if (mounted) setCloudStatus(status);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const patch = (patch: Partial<Settings["cloud"]>) => setDraft((prev) => ({ ...prev, ...patch }));
  const save = () => onUpdate({ cloud: draft });

  return (
    <section className="card">
      <div className="card-head">
        <h2>Cloud Push</h2>
        <span className={`badge ${statusBadge[cloudStatus]}`}>{statusLabel[cloudStatus]}</span>
      </div>
      <label className="field">
        <span className="label">API base URL</span>
        <input
          type="text"
          value={draft.base_url}
          onChange={(e) => patch({ base_url: e.target.value })}
          placeholder="https://api.example.com"
        />
      </label>
      <label className="field">
        <span className="label">WebSocket URL</span>
        <input
          type="text"
          value={draft.ws_url}
          onChange={(e) => patch({ ws_url: e.target.value })}
          placeholder="wss://api.example.com/ws/printing/"
        />
      </label>
      <label className="field">
        <span className="label">POS Secret</span>
        <input
          type="password"
          value={draft.secret}
          onChange={(e) => patch({ secret: e.target.value })}
          placeholder="Paste your POS print secret"
        />
      </label>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={draft.enabled}
          onChange={(e) => patch({ enabled: e.target.checked })}
        />
        <span>Enable cloud push</span>
      </label>
      <button className="btn" onClick={save}>Save Settings</button>
      <button className="btn danger" onClick={onDisconnect}>Disconnect</button>
      <p className="hint">
        Connects to the backend over WebSocket and prints invoices as soon as they are created. Reconnects automatically.
      </p>
    </section>
  );
}
