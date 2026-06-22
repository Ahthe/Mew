import { startSync } from "@hypr/sync";
import { useEffect, useRef } from "react";
import type { Store } from "tinybase";

import { supabase } from "~/auth/client";
import { DEFAULT_USER_ID } from "~/shared/utils";

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
    // Only sync for a real signed-in user. The anonymous DEFAULT_USER_ID has no
    // cloud rows and would just fail RLS, so skip it until auth bridges a user.
    if (!store || !userId || userId === DEFAULT_USER_ID || !supabase) return;

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
