// Browser shim for @tauri-apps/api/path. POSIX-ish string helpers.
export const sep = "/";
export const delimiter = ":";

export async function join(...paths: string[]): Promise<string> {
  return paths
    .filter(Boolean)
    .join("/")
    .replace(/\/+/g, "/");
}

export async function downloadDir(): Promise<string> {
  return "/downloads";
}

export async function appDataDir(): Promise<string> {
  return "/app-data";
}

export async function appConfigDir(): Promise<string> {
  return "/app-config";
}

export async function appLocalDataDir(): Promise<string> {
  return "/app-local-data";
}

export async function homeDir(): Promise<string> {
  return "/home";
}

export async function dirname(path: string): Promise<string> {
  return path.replace(/\/[^/]*$/, "") || "/";
}

export async function basename(path: string, ext?: string): Promise<string> {
  const base = path.replace(/^.*\//, "");
  return ext && base.endsWith(ext) ? base.slice(0, -ext.length) : base;
}

export async function resolve(...paths: string[]): Promise<string> {
  return join(...paths);
}

export async function normalize(path: string): Promise<string> {
  return path.replace(/\/+/g, "/");
}
