import { app, Menu, Tray, nativeImage } from "electron";
import { startCloudConnection, stopCloudConnection, initWsLog } from "./cloud/connection";
import { initSettings } from "./config/settings";
import { registerIpc } from "./ipc";
import { initJobLog } from "./print/jobLog";
import { createMainWindow, showMainWindow } from "./window";
import icon from "../../resources/icon.png?asset";

let tray: Tray | null = null;

function buildTrayIcon(): Electron.NativeImage {
  return nativeImage.createFromPath(icon).resize({ width: 16, height: 16 });
}

function createTray(): void {
  tray = new Tray(buildTrayIcon());
  tray.setToolTip("Zma Printer Agent");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Open", click: () => showMainWindow() },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() },
    ]),
  );
  tray.on("click", () => showMainWindow());
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => showMainWindow());

  app.whenReady().then(() => {
    initSettings(app);
    initWsLog(app.getPath("userData"));
    initJobLog(app.getPath("userData"));
    registerIpc();
    createMainWindow();
    createTray();

    startCloudConnection();

    app.on("activate", () => showMainWindow());
  });
}

app.on("window-all-closed", () => {
  // Keep running in the tray on both macOS and Windows.
});

app.on("before-quit", () => {
  stopCloudConnection();
  tray?.destroy();
});
