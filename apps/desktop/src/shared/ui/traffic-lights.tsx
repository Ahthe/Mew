import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { platform } from "@tauri-apps/plugin-os";

import { cn } from "@hypr/utils";

// macOS draws its own native traffic lights via titleBarStyle Overlay,
// so the HTML dots are only needed on frameless Windows/Linux builds.
function useShouldRenderDots() {
  try {
    return platform() !== "macos";
  } catch {
    return false;
  }
}

export function TrafficLights({ className }: { className?: string }) {
  const shouldRender = useShouldRenderDots();

  const withWindow = async (
    cb: (w: {
      close: () => unknown;
      minimize: () => unknown;
      toggleMaximize: () => unknown;
    }) => unknown | Promise<unknown>,
  ) => {
    if (!isTauri()) {
      return;
    }
    await cb(getCurrentWebviewWindow());
  };

  if (!shouldRender) {
    return null;
  }

  const onClose = () => withWindow((w) => w.close());
  const onMinimize = () => withWindow((w) => w.minimize());
  const onMaximize = () => withWindow((w) => w.toggleMaximize());

  return (
    <div className={cn(["flex items-center gap-2", className])}>
      <button
        type="button"
        data-tauri-drag-region="false"
        onClick={() => {
          void onClose();
        }}
        className="h-3 w-3 rounded-full border border-black/10 bg-[#ff5f57] transition-all hover:brightness-90"
      />
      <button
        type="button"
        data-tauri-drag-region="false"
        onClick={() => {
          void onMinimize();
        }}
        className="h-3 w-3 rounded-full border border-black/10 bg-[#ffbd2e] transition-all hover:brightness-90"
      />
      <button
        type="button"
        data-tauri-drag-region="false"
        onClick={() => {
          void onMaximize();
        }}
        className="h-3 w-3 rounded-full border border-black/10 bg-[#28c840] transition-all hover:brightness-90"
      />
    </div>
  );
}
