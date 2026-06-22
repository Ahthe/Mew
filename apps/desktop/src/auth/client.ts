import {
  createClient,
  processLock,
  type SupabaseClient,
  type SupportedStorage,
} from "@supabase/supabase-js";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

import { commands as authCommands } from "@hypr/plugin-auth";

import { env } from "~/env";

// The PWA build sets this marker (public/tauri-web-shim.js) before any module
// evaluates. In the browser the Tauri http/storage plugins no-op, so the client
// must use the browser's own fetch + localStorage and consume the magic-link
// session from the redirect URL (detectSessionInUrl).
export const IS_WEB =
  typeof window !== "undefined" &&
  (window as unknown as { __MEW_WEB__?: boolean }).__MEW_WEB__ === true;

export const tauriStorage: SupportedStorage = {
  async getItem(key: string): Promise<string | null> {
    const result = await authCommands.getItem(key);
    if (result.status === "error") {
      return null;
    }
    return result.data;
  },
  async setItem(key: string, value: string): Promise<void> {
    const result = await authCommands.setItem(key, value);
    if (result.status === "error") {
      throw new Error(`auth storage setItem failed: ${result.error}`);
    }
  },
  async removeItem(key: string): Promise<void> {
    const result = await authCommands.removeItem(key);
    if (result.status === "error") {
      throw new Error(`auth storage removeItem failed: ${result.error}`);
    }
  },
};

function createBrowserClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: {
      storage: window.localStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Consume the ?code=... that magic-link redirects land on, then clean the URL.
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });
}

function createTauriClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    global: {
      fetch: tauriFetch,
    },
    auth: {
      storage: tauriStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  });
}

export const supabase: SupabaseClient | null =
  env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY
    ? IS_WEB
      ? createBrowserClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
      : createTauriClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
    : null;
