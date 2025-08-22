import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("appApi", {
  exportJson: (payload: unknown) =>
    ipcRenderer.invoke("app:export-json", payload),
  importJson: () => ipcRenderer.invoke("app:import-json"),
});
