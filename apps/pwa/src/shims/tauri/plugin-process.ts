// Browser shim for @tauri-apps/plugin-process.
export async function relaunch(): Promise<void> {
  window.location.reload();
}

export async function exit(_code?: number): Promise<void> {
  // Best-effort: close the tab if it was script-opened, else no-op.
  window.close();
}
