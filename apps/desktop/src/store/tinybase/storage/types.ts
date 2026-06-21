// Persistence boundary seam (Phase 0).
//
// Every platform-specific storage primitive the persister layer needs is
// declared here as one interface. Desktop (Tauri) implements it in
// `tauri-adapter.ts`; a future Web/PWA build implements the same contract with
// IndexedDB and registers it via `setStorageAdapter` — no persister code changes.
//
// Type-only imports from the fs-sync plugin describe data SHAPES (markdown docs,
// cleanup targets), not Tauri runtime; they are erased at compile time, so this
// module pulls in zero Tauri code.
import type {
  CleanupTarget,
  JsonValue,
  ParsedDocument,
  ScanResult,
} from "@hypr/plugin-fs-sync";

export type {
  CleanupTarget,
  JsonValue,
  ParsedDocument,
  ScanResult,
} from "@hypr/plugin-fs-sync";

// Structurally identical to the plugins' generated `Result<T, string>`, so the
// Tauri adapter can return plugin results verbatim.
export type StorageResult<T> =
  | { status: "ok"; data: T }
  | { status: "error"; error: string };

export type UnlistenFn = () => void;

export interface StorageAdapter {
  // Path primitives. `pathSep` is synchronous because many path builders are.
  pathSep(): string;
  vaultBase(): Promise<StorageResult<string>>;

  // File read/write.
  readTextFile(path: string): Promise<StorageResult<string>>;
  remove(path: string): Promise<StorageResult<null>>;
  writeJsonBatch(
    items: [JsonValue, string][],
  ): Promise<StorageResult<null>>;
  writeDocumentBatch(
    items: [ParsedDocument, string][],
  ): Promise<StorageResult<null>>;
  readDocumentBatch(
    dirPath: string,
  ): Promise<StorageResult<Partial<Record<string, ParsedDocument>>>>;
  deserialize(input: string): Promise<StorageResult<ParsedDocument>>;

  // Directory scan + orphan cleanup.
  scanAndRead(
    scanDir: string,
    filePatterns: string[],
    recursive: boolean,
    pathFilter: string | null,
  ): Promise<StorageResult<ScanResult>>;
  cleanupOrphan(
    target: CleanupTarget,
    validIds: string[],
  ): Promise<StorageResult<number>>;

  // File-change notifications. Resolves to an unlisten function.
  onFileChanged(handler: (path: string) => void): Promise<UnlistenFn>;
}
