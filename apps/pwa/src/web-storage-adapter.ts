// Web implementation of the StorageAdapter seam (the Phase 0 boundary). The
// desktop writes per-entity markdown/JSON files to disk via Tauri; the browser
// has no filesystem, so we emulate one in localStorage. Because this adapter both
// writes AND reads every "file", we store each as a JSON blob — so deserialize()
// and readDocumentBatch() simply parse what writeDocumentBatch() wrote, with no
// real markdown-frontmatter parsing needed.
//
// Registered via setStorageAdapter() in install-web-adapter.ts before the store
// mounts. Persistence is real and survives reload; cross-tab updates ride the
// native `storage` event.
import type {
  CleanupTarget,
  JsonValue,
  ParsedDocument,
  ScanResult,
  StorageAdapter,
  StorageResult,
  UnlistenFn,
} from "~/store/tinybase/storage";

const PREFIX = "hypr-fs:";
const VAULT = "vault";

const ok = <T>(data: T): StorageResult<T> => ({ status: "ok", data });
const errNotFound = (path: string): StorageResult<never> => ({
  status: "error",
  error: `ENOENT: not found: ${path}`,
});

function keyFor(path: string): string {
  return PREFIX + path;
}

function readRaw(path: string): string | null {
  return localStorage.getItem(keyFor(path));
}

function writeRaw(path: string, content: string): void {
  localStorage.setItem(keyFor(path), content);
}

// Enumerate stored file paths (without the PREFIX) that live under `dir`.
function listUnder(dir: string): string[] {
  const needle = PREFIX + (dir.endsWith("/") ? dir : dir + "/");
  const out: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(needle)) out.push(k.slice(PREFIX.length));
  }
  return out;
}

function basename(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] ?? "";
}

function matchesPattern(filename: string, patterns: string[]): boolean {
  if (!patterns.length) return true;
  return patterns.some((p) => {
    if (p.startsWith("*.")) return filename.endsWith(p.slice(1));
    return filename === p;
  });
}

export const webStorageAdapter: StorageAdapter = {
  pathSep: () => "/",

  vaultBase: async () => ok(VAULT),

  readTextFile: async (path) => {
    const v = readRaw(path);
    return v === null ? errNotFound(path) : ok(v);
  },

  remove: async (path) => {
    localStorage.removeItem(keyFor(path));
    return ok(null);
  },

  writeJsonBatch: async (items: [JsonValue, string][]) => {
    for (const [data, path] of items) {
      writeRaw(path, JSON.stringify(data));
    }
    return ok(null);
  },

  writeDocumentBatch: async (items: [ParsedDocument, string][]) => {
    for (const [doc, path] of items) {
      writeRaw(path, JSON.stringify(doc));
    }
    return ok(null);
  },

  readDocumentBatch: async (dirPath) => {
    const result: Record<string, ParsedDocument> = {};
    for (const path of listUnder(dirPath)) {
      const name = basename(path);
      if (!name.endsWith(".md")) continue;
      const id = name.slice(0, -3);
      const raw = readRaw(path);
      if (raw === null) continue;
      result[id] = parseDoc(raw);
    }
    return ok(result);
  },

  deserialize: async (input) => ok(parseDoc(input)),

  scanAndRead: async (
    scanDir,
    filePatterns,
    _recursive,
    _pathFilter,
  ): Promise<StorageResult<ScanResult>> => {
    const files: Record<string, string> = {};
    const dirs = new Set<string>();
    const base = scanDir.endsWith("/") ? scanDir.slice(0, -1) : scanDir;
    for (const path of listUnder(base)) {
      const rest = path.slice(base.length + 1);
      const firstSlash = rest.indexOf("/");
      if (firstSlash !== -1) {
        dirs.add(`${base}/${rest.slice(0, firstSlash)}`);
      }
      if (matchesPattern(basename(path), filePatterns)) {
        const raw = readRaw(path);
        if (raw !== null) files[path] = raw;
      }
    }
    return ok({ files, dirs: [...dirs] });
  },

  cleanupOrphan: async (target: CleanupTarget, validIds: string[]) => {
    const valid = new Set(validIds);
    const subdir = [VAULT, target.subdir].join("/");
    let removed = 0;
    for (const path of listUnder(subdir)) {
      const name = basename(path);
      let id: string | null = null;
      if (target.type === "files" || target.type === "filesRecursive") {
        const ext = `.${target.extension}`;
        if (name.endsWith(ext)) id = name.slice(0, -ext.length);
      } else {
        // dirs target: the entity id is the immediate subdir name
        const rest = path.slice(subdir.length + 1);
        id = rest.split("/")[0] ?? null;
      }
      if (id && !valid.has(id)) {
        localStorage.removeItem(keyFor(path));
        removed++;
      }
    }
    return ok(removed);
  },

  onFileChanged: async (handler): Promise<UnlistenFn> => {
    const listener = (e: StorageEvent) => {
      if (e.key && e.key.startsWith(PREFIX)) {
        handler(e.key.slice(PREFIX.length));
      }
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  },
};

function parseDoc(raw: string): ParsedDocument {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "content" in parsed) {
      return {
        frontmatter: (parsed.frontmatter ?? {}) as Record<string, JsonValue>,
        content: String(parsed.content ?? ""),
      };
    }
  } catch {
    // Not JSON — treat as a raw markdown body.
  }
  return { frontmatter: {}, content: raw };
}
