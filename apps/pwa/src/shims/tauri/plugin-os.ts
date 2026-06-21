// Browser shim for @tauri-apps/plugin-os. Best-effort from the user agent.
function detectPlatform(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "windows";
  if (ua.includes("mac")) return "macos";
  if (ua.includes("linux")) return "linux";
  if (ua.includes("android")) return "android";
  if (ua.includes("iphone") || ua.includes("ipad")) return "ios";
  return "windows";
}

export function platform(): string {
  return detectPlatform();
}

export function arch(): string {
  return "x86_64";
}

export function version(): string {
  return "web";
}

export function type(): string {
  return detectPlatform();
}

export function locale(): Promise<string | null> {
  return Promise.resolve(navigator.language ?? "en-US");
}

export function hostname(): Promise<string | null> {
  return Promise.resolve(window.location.hostname);
}
