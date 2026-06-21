import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The PWA builds the desktop frontend verbatim: `~` resolves to apps/desktop/src,
// and a standalone window.__TAURI_INTERNALS__ shim (public/tauri-web-shim.js,
// loaded from index.html) makes the real @tauri-apps/* packages no-op in the
// browser. The desktop's committed routeTree.gen.ts is used as-is, so the
// tanstack router plugin is not needed here.
const desktopSrc = fileURLToPath(new URL("../desktop/src", import.meta.url));

// Replace the "Char" brand name with "Mew" in all desktop source files at
// transform time, without touching the desktop source on disk.
function rebrandPlugin(from: string, to: string) {
  const re = new RegExp(`\\b${from}\\b`, "g");
  return {
    name: "rebrand",
    transform(code: string, id: string) {
      if (id.includes("node_modules")) return null;
      if (!id.endsWith(".ts") && !id.endsWith(".tsx")) return null;
      const result = code.replace(re, to);
      if (result === code) return null;
      return { code: result, map: null };
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), rebrandPlugin("Char", "Mew")],
  resolve: {
    alias: {
      "~": desktopSrc,
    },
    dedupe: [
      "react",
      "react-dom",
      "@codemirror/state",
      "@codemirror/view",
      "@codemirror/autocomplete",
      "@codemirror/language",
      "@codemirror/lint",
      "@codemirror/lang-jinja",
      "codemirror-readonly-ranges",
      "@uiw/react-codemirror",
    ],
  },
  build: {
    target: "esnext",
    outDir: "dist",
    chunkSizeWarningLimit: 5000,
  },
  server: { port: 3001 },
  // Pre-bundle deps by crawling from the desktop entry point so the first
  // `pnpm dev` load doesn't discover all 139 deps lazily (which caused the
  // minutes-long timeout on the previous scaffold).
  optimizeDeps: {
    entries: ["../desktop/src/main.tsx"],
  },
});
