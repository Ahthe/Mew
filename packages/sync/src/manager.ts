import type { SupabaseClient, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import type { Store } from "tinybase";

import { SYNC_TABLES, type SyncTable } from "./tables";

export interface SyncConfig {
  store: Store;
  supabase: SupabaseClient;
  userId: string;
  onError?: (err: unknown) => void;
}

export async function startSync(config: SyncConfig): Promise<() => void> {
  const { store, supabase, userId, onError } = config;
  const cleanups: (() => void)[] = [];

  // Tracks rows currently being pushed so Realtime echoes don't re-trigger pushes.
  let applyingRemote = false;

  // Per-row debounce timers: key = "table:rowId"
  const debounce = new Map<string, ReturnType<typeof setTimeout>>();

  function schedulePush(table: SyncTable, rowId: string) {
    const key = `${table.tinybase}:${rowId}`;
    const existing = debounce.get(key);
    if (existing) clearTimeout(existing);
    debounce.set(
      key,
      setTimeout(() => {
        debounce.delete(key);
        pushRow(store, supabase, userId, table, rowId).catch(onError);
      }, 1500),
    );
  }

  // 1. Initial pull — loads all existing Supabase rows into the local store.
  await pull(store, supabase, userId, onError, (v) => {
    applyingRemote = v;
  });

  // 2. Supabase Realtime subscription for live updates from other clients.
  const channel = supabase.channel(`hypr-sync-${userId}`);
  for (const table of SYNC_TABLES) {
    channel.on(
      "postgres_changes" as never,
      {
        event: "*",
        schema: "public",
        table: table.supabase,
        filter: `user_id=eq.${userId}`,
      },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        applyingRemote = true;
        try {
          applyRemoteChange(store, table, payload);
        } finally {
          applyingRemote = false;
        }
      },
    );
  }
  await channel.subscribe();
  cleanups.push(() => {
    supabase.removeChannel(channel);
  });

  // 3. Push TinyBase changes to Supabase (debounced per row).
  for (const table of SYNC_TABLES) {
    const listenerId = store.addRowListener(
      table.tinybase as never,
      null,
      (_s: unknown, _t: unknown, rowId: string) => {
        if (applyingRemote) return;
        schedulePush(table, rowId);
      },
    );
    cleanups.push(() => {
      store.delListener(listenerId);
    });
  }

  return () => {
    for (const t of debounce.values()) clearTimeout(t);
    debounce.clear();
    cleanups.forEach((fn) => fn());
  };
}

async function pull(
  store: Store,
  supabase: SupabaseClient,
  userId: string,
  onError: ((err: unknown) => void) | undefined,
  setApplyingRemote: (v: boolean) => void,
) {
  setApplyingRemote(true);
  try {
    for (const table of SYNC_TABLES) {
      const { data, error } = await supabase
        .from(table.supabase)
        .select("*")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });

      if (error) {
        onError?.(error);
        continue;
      }
      if (!data || data.length === 0) continue;

      store.transaction(() => {
        for (const row of data) {
          const tinyRow: Record<string, unknown> = {};
          for (const col of table.columns) {
            const val = (row as Record<string, unknown>)[col];
            if (val !== null && val !== undefined) {
              tinyRow[col] = val;
            }
          }
          (store as never as { setRow: (t: string, r: string, v: Record<string, unknown>) => void })
            .setRow(table.tinybase, (row as { id: string }).id, tinyRow);
        }
      });
    }
  } finally {
    setApplyingRemote(false);
  }
}

async function pushRow(
  store: Store,
  supabase: SupabaseClient,
  userId: string,
  table: SyncTable,
  rowId: string,
) {
  const hasRow = (store as never as { hasRow: (t: string, r: string) => boolean }).hasRow(
    table.tinybase,
    rowId,
  );

  if (!hasRow) {
    // Soft-delete in Supabase; the other client's Realtime subscription removes it locally.
    await supabase
      .from(table.supabase)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", rowId)
      .eq("user_id", userId);
    return;
  }

  const row = (store as never as { getRow: (t: string, r: string) => Record<string, unknown> }).getRow(
    table.tinybase,
    rowId,
  );

  const payload: Record<string, unknown> = { id: rowId, user_id: userId };
  for (const col of table.columns) {
    if (col !== "user_id" && col in row) {
      payload[col] = row[col];
    }
  }

  await supabase.from(table.supabase).upsert(payload);
}

function applyRemoteChange(
  store: Store,
  table: SyncTable,
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
) {
  const newRow = (payload as { new?: Record<string, unknown> }).new;
  const oldRow = (payload as { old?: Record<string, unknown> }).old;

  if (payload.eventType === "DELETE" || newRow?.["deleted_at"]) {
    const id = (newRow?.["id"] ?? oldRow?.["id"]) as string | undefined;
    if (id) {
      (store as never as { delRow: (t: string, r: string) => void }).delRow(table.tinybase, id);
    }
    return;
  }

  if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
    if (!newRow) return;
    const id = newRow["id"] as string;
    const row: Record<string, unknown> = {};
    for (const col of table.columns) {
      const val = newRow[col];
      if (val !== null && val !== undefined) {
        row[col] = val;
      }
    }
    (store as never as { setRow: (t: string, r: string, v: Record<string, unknown>) => void })
      .setRow(table.tinybase, id, row);
  }
}
