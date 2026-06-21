// Browser shim for @tauri-apps/api/event. No native event bus in the PWA, so
// listeners register but never fire, and emits are dropped.

export type UnlistenFn = () => void;
export type EventCallback<T> = (event: Event<T>) => void;

export interface Event<T> {
  event: string;
  id: number;
  payload: T;
}

export interface Options {
  target?: string | { kind: string; label?: string };
}

export const TauriEvent = {
  WINDOW_RESIZED: "tauri://resize",
  WINDOW_MOVED: "tauri://move",
  WINDOW_CLOSE_REQUESTED: "tauri://close-requested",
  WINDOW_DESTROYED: "tauri://destroyed",
  WINDOW_FOCUS: "tauri://focus",
  WINDOW_BLUR: "tauri://blur",
  WINDOW_SCALE_FACTOR_CHANGED: "tauri://scale-change",
  WINDOW_THEME_CHANGED: "tauri://theme-changed",
  WINDOW_CREATED: "tauri://window-created",
  WEBVIEW_CREATED: "tauri://webview-created",
  DRAG_ENTER: "tauri://drag-enter",
  DRAG_OVER: "tauri://drag-over",
  DRAG_DROP: "tauri://drag-drop",
  DRAG_LEAVE: "tauri://drag-leave",
} as const;

export async function listen<T>(
  _event: string,
  _handler: EventCallback<T>,
  _options?: Options,
): Promise<UnlistenFn> {
  return () => {};
}

export async function once<T>(
  _event: string,
  _handler: EventCallback<T>,
  _options?: Options,
): Promise<UnlistenFn> {
  return () => {};
}

export async function emit(_event: string, _payload?: unknown): Promise<void> {}

export async function emitTo(
  _target: string | { kind: string; label?: string },
  _event: string,
  _payload?: unknown,
): Promise<void> {}
