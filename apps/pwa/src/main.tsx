// The PWA IS the desktop frontend. `~` is aliased to apps/desktop/src in
// vite.config.ts, so this boots the exact desktop entry point. The Tauri runtime
// is shimmed by public/tauri-web-shim.js (loaded from index.html) so native calls
// no-op in the browser.
//
// install-web-adapter MUST be imported first: it swaps the filesystem-backed
// StorageAdapter for a localStorage-backed one before the store's persisters are
// created, so notes/goals persist in the browser.
import "./install-web-adapter";
import "~/main";
