// Browser shim for @tauri-apps/plugin-http. The Tauri HTTP plugin exists to
// bypass CORS from the native side; in the browser we just use window.fetch.
export const fetch: typeof window.fetch = (...args) => window.fetch(...args);
