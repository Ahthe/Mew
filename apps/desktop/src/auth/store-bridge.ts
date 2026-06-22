import { useEffect } from "react";

import { useAuth } from "./context";

import { DEFAULT_USER_ID } from "~/shared/utils";
import * as main from "~/store/tinybase/store/main";

// Loose view of the store so we can iterate every table generically (the typed
// store rejects a string table + "user_id" cell that not all tables declare).
type LooseStore = {
  getValue: (id: string) => unknown;
  setValue: (id: string, value: unknown) => void;
  getRowIds: (table: string) => string[];
  getCell: (table: string, rowId: string, cellId: string) => unknown;
  setCell: (table: string, rowId: string, cellId: string, value: unknown) => void;
  hasRow: (table: string, rowId: string) => boolean;
  setRow: (table: string, rowId: string, row: Record<string, unknown>) => void;
  transaction: (fn: () => void) => void;
};

// Bridges the authenticated Supabase user into the TinyBase store's `user_id`
// value. Cloud sync (@hypr/sync) filters every table by user_id, so without this
// sync runs under the shared anonymous DEFAULT_USER_ID and data never reaches the
// signed-in account. On first sign-in we re-key existing anonymous rows to the
// new user so locally-created notes, folders, goals, and contributions sync up.
export function useAuthStoreBridge(): void {
  const { session } = useAuth();
  const store = main.UI.useStore(main.STORE_ID) as unknown as
    | LooseStore
    | undefined;

  useEffect(() => {
    if (!store) {
      return;
    }

    const sessionUserId = session?.user.id;
    const currentUserId = store.getValue("user_id") as string | undefined;

    if (sessionUserId) {
      if (currentUserId === sessionUserId) {
        return;
      }

      store.transaction(() => {
        const previousId = currentUserId ?? DEFAULT_USER_ID;

        // Claim anonymous local data so it belongs to (and syncs for) the user.
        if (previousId === DEFAULT_USER_ID) {
          for (const table of main.TABLES) {
            for (const rowId of store.getRowIds(table)) {
              if (store.getCell(table, rowId, "user_id") === previousId) {
                store.setCell(table, rowId, "user_id", sessionUserId);
              }
            }
          }
        }

        if (!store.hasRow("humans", sessionUserId)) {
          store.setRow("humans", sessionUserId, {
            user_id: sessionUserId,
            name: session?.user.email ?? "",
            email: session?.user.email ?? "",
            org_id: "",
          });
        }

        store.setValue("user_id", sessionUserId);
      });
    } else if (currentUserId && currentUserId !== DEFAULT_USER_ID) {
      // Signed out — revert to anonymous scope so sync stops targeting the account.
      store.setValue("user_id", DEFAULT_USER_ID);
    }
  }, [session, store]);
}
