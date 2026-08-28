import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { App } from "electron";
import { defaultSettings, type Settings } from "./defaults";

export type { Settings } from "./defaults";

let settings: Settings | null = null;
let settingsPath = "";

function mergeWithDefaults(raw: Partial<Settings>): Settings {
  const generated = defaultSettings();
  return {
    ...generated,
    ...raw,
    cloud: {
      ...generated.cloud,
      ...(raw.cloud || {}),
    },
  };
}

export function initSettings(app: App): Settings {
  settingsPath = join(app.getPath("userData"), "settings.json");
  mkdirSync(dirname(settingsPath), { recursive: true });

  if (!existsSync(settingsPath)) {
    const initial = defaultSettings();
    writeFileSync(settingsPath, JSON.stringify(initial, null, 2), "utf-8");
    settings = initial;
    return initial;
  }

  try {
    const raw = JSON.parse(readFileSync(settingsPath, "utf-8")) as Partial<Settings>;
    settings = mergeWithDefaults(raw);
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
    return settings;
  } catch (error) {
    console.error("Failed to load settings, resetting to defaults:", error);
    const initial = defaultSettings();
    writeFileSync(settingsPath, JSON.stringify(initial, null, 2), "utf-8");
    settings = initial;
    return initial;
  }
}

export function getSettings(): Settings {
  if (!settings) {
    throw new Error("Settings not initialized. Call initSettings first.");
  }
  return settings;
}

export function updateSettings(patch: Partial<Settings>): Settings {
  if (!settings) {
    throw new Error("Settings not initialized. Call initSettings first.");
  }
  const next = { ...settings, ...patch };
  const tmpPath = `${settingsPath}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(next, null, 2), "utf-8");
  renameSync(tmpPath, settingsPath);
  settings = next;
  return next;
}
