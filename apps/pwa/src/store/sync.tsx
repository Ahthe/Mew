import { startSync } from "@hypr/sync";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useRef } from "react";
import type { Store } from "tinybase";

import { STORE_ID, UI } from "./index";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Single Supabase client for the PWA — auth state is shared across components.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function SyncComponent() {
  const store = UI.useStore(STORE_ID);
  const userId = UI.useValue("user_id", STORE_ID) as string | undefined;
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!store || !userId) return;

    let cancelled = false;
    startSync({
      store: store as unknown as Store,
      supabase,
      userId,
      onError: (err) => console.error("[sync]", err),
    }).then((cleanup) => {
      if (cancelled) {
        cleanup();
      } else {
        cleanupRef.current = cleanup;
      }
    });

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [store, userId]);

  return null;
}
