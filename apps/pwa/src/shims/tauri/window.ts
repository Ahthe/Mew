// Browser shim for @tauri-apps/api/window.
import type { UnlistenFn } from "./event";

class StubWindow {
  label = "main";
  async setTitle(_title: string): Promise<void> {}
  async title(): Promise<string> {
    return document.title;
  }
  async show(): Promise<void> {}
  async hide(): Promise<void> {}
  async close(): Promise<void> {}
  async destroy(): Promise<void> {}
  async center(): Promise<void> {}
  async setFocus(): Promise<void> {}
  async isFocused(): Promise<boolean> {
    return document.hasFocus();
  }
  async isVisible(): Promise<boolean> {
    return true;
  }
  async isMinimized(): Promise<boolean> {
    return false;
  }
  async isMaximized(): Promise<boolean> {
    return false;
  }
  async minimize(): Promise<void> {}
  async maximize(): Promise<void> {}
  async unmaximize(): Promise<void> {}
  async toggleMaximize(): Promise<void> {}
  async startDragging(): Promise<void> {}
  async setResizable(_b: boolean): Promise<void> {}
  async setSize(_s: unknown): Promise<void> {}
  async setMinSize(_s: unknown): Promise<void> {}
  async setMaxSize(_s: unknown): Promise<void> {}
  async innerSize(): Promise<{ width: number; height: number }> {
    return { width: window.innerWidth, height: window.innerHeight };
  }
  async outerSize(): Promise<{ width: number; height: number }> {
    return { width: window.innerWidth, height: window.innerHeight };
  }
  async scaleFactor(): Promise<number> {
    return window.devicePixelRatio || 1;
  }
  async theme(): Promise<"light" | "dark"> {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  async onResized(): Promise<UnlistenFn> {
    return () => {};
  }
  async onMoved(): Promise<UnlistenFn> {
    return () => {};
  }
  async onFocusChanged(): Promise<UnlistenFn> {
    return () => {};
  }
  async onCloseRequested(): Promise<UnlistenFn> {
    return () => {};
  }
  async onThemeChanged(): Promise<UnlistenFn> {
    return () => {};
  }
  async listen(): Promise<UnlistenFn> {
    return () => {};
  }
  async emit(): Promise<void> {}
  async setAlwaysOnTop(_b: boolean): Promise<void> {}
  async setDecorations(_b: boolean): Promise<void> {}
  async setShadow(_b: boolean): Promise<void> {}
  async setIgnoreCursorEvents(_b: boolean): Promise<void> {}
}

const stub = new StubWindow();

export function getCurrentWindow(): StubWindow {
  return stub;
}

export function getAllWindows(): StubWindow[] {
  return [stub];
}

export const Window = StubWindow;
export const appWindow = stub;
export const currentMonitor = async () => null;
export const primaryMonitor = async () => null;
export const availableMonitors = async () => [];
export const LogicalSize = class {
  constructor(public width: number, public height: number) {}
};
export const PhysicalSize = class {
  constructor(public width: number, public height: number) {}
};
export const LogicalPosition = class {
  constructor(public x: number, public y: number) {}
};
export const PhysicalPosition = class {
  constructor(public x: number, public y: number) {}
};
