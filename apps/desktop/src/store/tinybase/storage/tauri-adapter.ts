// Desktop implementation of the StorageAdapter seam: delegates each primitive to
// the existing Tauri plugin commands. Behavior-preserving by construction — this
// is the same set of calls the persister layer made directly before Phase 0.
import { sep } from "@tauri-apps/api/path";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";
import { commands as fs2Commands } from "@hypr/plugin-fs2";
import { events as notifyEvents } from "@hypr/plugin-notify";
import { commands as settingsCommands } from "@hypr/plugin-settings";

import type { StorageAdapter } from "./types";

export const tauriStorageAdapter: StorageAdapter = {
  pathSep: () => sep(),
  vaultBase: () => settingsCommands.vaultBase(),

  readTextFile: (path) => fs2Commands.readTextFile(path),
  remove: (path) => fs2Commands.remove(path),
  writeJsonBatch: (items) => fsSyncCommands.writeJsonBatch(items),
  writeDocumentBatch: (items) => fsSyncCommands.writeDocumentBatch(items),
  readDocumentBatch: (dirPath) => fsSyncCommands.readDocumentBatch(dirPath),
  deserialize: (input) => fsSyncCommands.deserialize(input),

  scanAndRead: (scanDir, filePatterns, recursive, pathFilter) =>
    fsSyncCommands.scanAndRead(scanDir, filePatterns, recursive, pathFilter),
  cleanupOrphan: (target, validIds) =>
    fsSyncCommands.cleanupOrphan(target, validIds),

  onFileChanged: (handler) =>
    notifyEvents.fileChanged.listen((event) => handler(event.payload.path)),
};
