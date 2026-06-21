import { startSync } from "@hypr/sync";
import { useEffect, useRef } from "react";
import type { Store } from "tinybase";

import { supabase } from "~/auth/client";

import {
  STORE_ID,
  UI,
  type Store as TypedStore,
} from "./main";

export function useSupabaseSync() {
  const store = UI.useStore(STORE_ID) as TypedStore | undefined;
  const userId = UI.useValue("user_id", STORE_ID) as string | undefined;
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!store || !userId || !supabase) return;

    let cancelled = false;
    startSync({
      store: store as unknown as Store,
      supabase,
      userId,
      onError: (err) => console.error("[supabase-sync]", err),
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
}
