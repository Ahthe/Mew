import { capabilities } from "~/shared/capabilities";

import { tauriStorageAdapter } from "./tauri-adapter";
import type { StorageAdapter } from "./types";

export type {
  CleanupTarget,
  JsonValue,
  ParsedDocument,
  ScanResult,
  StorageAdapter,
  StorageResult,
  UnlistenFn,
} from "./types";

// The capability flag drives adapter selection (Phase 0 seams meet here).
// Desktop declares `fileSystem: true`, so the Tauri adapter is installed by
// default. A Web/PWA build declares `fileSystem: false` and must register its
// own adapter (e.g. IndexedDB) via `setStorageAdapter` before the store loads.
let current: StorageAdapter | null = capabilities.fileSystem
  ? tauriStorageAdapter
  : null;

export function getStorageAdapter(): StorageAdapter {
  if (!current) {
    throw new Error(
      "No storage adapter registered for this platform. Call setStorageAdapter() during app init.",
    );
  }
  return current;
}

export function setStorageAdapter(adapter: StorageAdapter): void {
  current = adapter;
}
