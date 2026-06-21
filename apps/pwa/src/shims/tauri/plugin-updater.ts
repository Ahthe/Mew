// Browser shim for @tauri-apps/plugin-updater. The PWA updates via the service
// worker / page reload, so there is never a Tauri update available.
export interface Update {
  available: boolean;
  currentVersion: string;
  version: string;
  body?: string;
  date?: string;
  downloadAndInstall: (onEvent?: (e: unknown) => void) => Promise<void>;
  download: () => Promise<void>;
  install: () => Promise<void>;
  close: () => Promise<void>;
}

export async function check(_options?: unknown): Promise<Update | null> {
  return null;
}
