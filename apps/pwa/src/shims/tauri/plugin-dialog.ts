// Browser shim for @tauri-apps/plugin-dialog.
export async function message(msg: string, _options?: unknown): Promise<void> {
  window.alert(msg);
}

export async function ask(msg: string, _options?: unknown): Promise<boolean> {
  return window.confirm(msg);
}

export async function confirm(msg: string, _options?: unknown): Promise<boolean> {
  return window.confirm(msg);
}

// `open` is used as both selectFile and selectFolder in the desktop code.
// The browser can't pick arbitrary FS paths, so return null (cancelled).
export async function open(_options?: unknown): Promise<string | string[] | null> {
  return null;
}

export async function save(_options?: unknown): Promise<string | null> {
  return null;
}
