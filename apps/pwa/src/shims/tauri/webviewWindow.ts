// Browser shim for @tauri-apps/api/webviewWindow.
import { getCurrentWindow } from "./window";
import type { UnlistenFn } from "./event";

class StubWebviewWindow {
  label: string;
  constructor(label = "main", _options?: unknown) {
    this.label = label;
  }
  static getByLabel(_label: string): StubWebviewWindow | null {
    return null;
  }
  static getCurrent(): StubWebviewWindow {
    return current;
  }
  static getAll(): StubWebviewWindow[] {
    return [current];
  }
  async setTitle(_t: string): Promise<void> {}
  async show(): Promise<void> {}
  async hide(): Promise<void> {}
  async close(): Promise<void> {}
  async destroy(): Promise<void> {}
  async setFocus(): Promise<void> {}
  async center(): Promise<void> {}
  async listen(): Promise<UnlistenFn> {
    return () => {};
  }
  async once(): Promise<UnlistenFn> {
    return () => {};
  }
  async emit(): Promise<void> {}
  async onCloseRequested(): Promise<UnlistenFn> {
    return () => {};
  }
  // Delegate common window methods to the window stub.
  get window() {
    return getCurrentWindow();
  }
}

const current = new StubWebviewWindow("main");

export function getCurrentWebviewWindow(): StubWebviewWindow {
  return current;
}

export const WebviewWindow = StubWebviewWindow;
