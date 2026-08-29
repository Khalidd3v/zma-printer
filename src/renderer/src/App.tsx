import { useEffect, useState } from "react";
import { api } from "./api";
import type { Settings } from "../../main/config/defaults";
import type { JobLogEntry, PrinterInfo } from "../../main/types";
import PrintersPanel from "./components/PrintersPanel";
import CloudPanel from "./components/CloudPanel";
import TestPrintButtons from "./components/TestPrintButtons";
import JobLog from "./components/JobLog";
import DesignScreen from "./components/DesignScreen";
import DeveloperScreen from "./components/DeveloperScreen";

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [jobs, setJobs] = useState<JobLogEntry[]>([]);
  const [flash, setFlash] = useState("");
  const [screen, setScreen] = useState<"home" | "design" | "developer">("home");

  const notify = (message: string) => {
    setFlash(message);
    window.setTimeout(() => setFlash(""), 3000);
  };

  const reload = async () => {
    const [s, p, j] = await Promise.all([api.getSettings(), api.listPrinters(), api.listJobs()]);
    setSettings(s);
    setPrinters(p);
    setJobs(j);
  };

  const refreshPrinters = async () => {
    const p = await api.refreshPrinters();
    setPrinters(p);
    notify(`${p.length} printers found`);
    return p;
  };

  useEffect(() => {
    const bootstrap = async () => {
      const p = await refreshPrinters();
      const [s, j] = await Promise.all([api.getSettings(), api.listJobs()]);

      const thermalPrinters = p.filter((printer) => printer.matchedType === "thermal");
      const a4Printers = p.filter((printer) => printer.matchedType === "a4");

      const pickBest = (list: PrinterInfo[]): string => {
        if (list.length === 0) return "";
        return (list.find((printer) => printer.isDefault) || list[0]).name;
      };

      const patch: Partial<Settings> = {};
      if (!s.thermal_printer && thermalPrinters.length > 0) {
        patch.thermal_printer = pickBest(thermalPrinters);
      }
      if (!s.a4_printer && a4Printers.length > 0) {
        patch.a4_printer = pickBest(a4Printers);
      }

      if (Object.keys(patch).length > 0) {
        const next = await api.updateSettings(patch);
        setSettings(next);
      } else {
        setSettings(s);
      }
      setJobs(j);
    };
    bootstrap();
    const unsubscribeJobs = api.onJobsUpdated((jobs) => setJobs(jobs));
    return () => unsubscribeJobs();
  }, []);

  const update = async (patch: Partial<Settings>) => {
    const next = await api.updateSettings(patch);
    setSettings(next);
    notify("Settings saved");
  };

  const testPrint = async (type: "thermal" | "a4") => {
    notify(`Sending ${type} test print...`);
    await api.printTest(type);
    await reload();
    notify(`${type} test print finished`);
  };

  const clearJobs = async () => {
    await api.clearJobs();
    setJobs([]);
    notify("Job log cleared");
  };

  const disconnectCloud = async () => {
    const next = await api.updateSettings({
      cloud: { enabled: false, base_url: "", ws_url: "", secret: "" },
    });
    setSettings(next);
    notify("Cloud disconnected");
  };

  if (!settings) {
    return <div className="loading">Loading Zma Printer Agent...</div>;
  }

  return (
    <div className="app">
      <header className="titlebar">
        <div>
          <h1>Zma Printer Agent</h1>
          <p className="subtitle">WebSocket printing bridge</p>
        </div>
        {screen === "home" ? (
          <div className="titlebar-actions">
            <button className="btn small" onClick={() => setScreen("design")}>Invoice Design</button>
            <button className="btn small danger" onClick={() => setScreen("developer")}>Developer</button>
          </div>
        ) : (
          <button className="btn small" onClick={() => setScreen("home")}>← Dashboard</button>
        )}
      </header>

      {flash && <div className="flash">{flash}</div>}

      {screen === "design" ? (
        <main className="design-wrap">
          <DesignScreen settings={settings} onUpdate={update} onBack={() => setScreen("home")} />
        </main>
      ) : screen === "developer" ? (
        <main className="dev-wrap">
          <DeveloperScreen settings={settings} onBack={() => setScreen("home")} />
        </main>
      ) : (
        <main className="grid">
          <CloudPanel settings={settings} onUpdate={update} onDisconnect={disconnectCloud} />
          <PrintersPanel settings={settings} printers={printers} onUpdate={update} onRefresh={refreshPrinters} />
          <TestPrintButtons onTest={testPrint} />
          <JobLog jobs={jobs} onClear={clearJobs} />
        </main>
      )}
    </div>
  );
}
