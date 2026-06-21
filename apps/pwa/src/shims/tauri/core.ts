// Browser shim for @tauri-apps/api/core.
// The desktop app and every @hypr/plugin-* binding routes native calls through
// `invoke`. In the PWA there is no Tauri runtime, so we no-op them. Features that
// depend on native commands simply do nothing here (intentional, for now).

const warned = new Set<string>();

export async function invoke<T = unknown>(cmd: string, _args?: unknown): Promise<T> {
  if (!warned.has(cmd)) {
    warned.add(cmd);
    if (import.meta.env.DEV) {
      console.debug(`[tauri-shim] invoke('${cmd}') no-op (web build)`);
    }
  }
  // Permissive default: undefined. Callers that need a concrete shape are
  // expected to guard; broken native features are acceptable for the web build.
  return undefined as T;
}

export function convertFileSrc(filePath: string, _protocol?: string): string {
  return filePath;
}

export function isTauri(): boolean {
  return false;
}

export function transformCallback<T = unknown>(
  callback?: (response: T) => void,
  _once = false,
): number {
  // Return a fake rid; real Tauri uses this to route channel messages.
  void callback;
  return Math.floor(Math.random() * 1_000_000);
}

export class Channel<T = unknown> {
  id = 0;
  onmessage: ((response: T) => void) | null = null;
  set onMessage(handler: (response: T) => void) {
    this.onmessage = handler;
  }
  toJSON() {
    return `__CHANNEL__:${this.id}`;
  }
}

export class PluginListener {
  constructor(
    public plugin: string,
    public event: string,
    public channelId: number,
  ) {}
  async unregister(): Promise<void> {}
}

export async function addPluginListener<T = unknown>(
  plugin: string,
  event: string,
  cb: (payload: T) => void,
): Promise<PluginListener> {
  void cb;
  return new PluginListener(plugin, event, 0);
}

export class Resource {
  get rid(): number {
    return 0;
  }
  async close(): Promise<void> {}
}

export const SERIALIZE_TO_IPC_FN = "__TAURI_TO_IPC_KEY__";
