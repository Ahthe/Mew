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

// Replace the "Char" brand name with "Mew" in desktop source files, without
// touching the source on disk. Runs as a `pre` transform on the RAW source and
// returns a plain string, so React/esbuild downstream regenerates the sourcemap
// normally — this plugin never participates in sourcemap reconciliation.
function rebrandPlugin(from: string, to: string) {
  return {
    name: "rebrand",
    enforce: "pre" as const,
    transform(code: string, id: string) {
      const path = id.split("?")[0];
      if (path.includes("node_modules")) return null;
      if (!/\.[cm]?tsx?$/.test(path)) return null;
      // Fresh regex per call so the global flag's lastIndex never carries over.
      const result = code.replace(new RegExp(`\\b${from}\\b`, "g"), to);
      return result === code ? null : result;
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
    // Emit to the repo-root `dist/` (outside this package). Vercel detects the
    // Turborepo and resolves the output dir to the root default ("dist"),
    // ignoring vercel.json#outputDirectory — so we put the build exactly where
    // it looks. Outside the Vite root, so Tailwind never scans it; gitignored.
    outDir: "../../dist",
    emptyOutDir: true,
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
