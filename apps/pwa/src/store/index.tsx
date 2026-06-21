import { useEffect } from "react";
import {
  createBroadcastChannelSynchronizer,
} from "tinybase/synchronizers/synchronizer-broadcast-channel/with-schemas";
import * as _UI from "tinybase/ui-react/with-schemas";
import {
  createIndexes,
  createMergeableStore,
  createQueries,
  type MergeableStore,
} from "tinybase/with-schemas";

import { SCHEMA, type Schemas } from "@hypr/store";

const {
  useCreateMergeableStore,
  useCreateSynchronizer,
  useCreateIndexes,
  useCreateQueries,
  useProvideStore,
  useProvideIndexes,
  useProvideQueries,
  useProvideSynchronizer,
} = _UI as _UI.WithSchemas<Schemas>;

export const UI = _UI as TypedUI;
export type Store = MergeableStore<Schemas>;
export { type Schemas };

export const STORE_ID = "main";

export const QUERIES = {
  activeSessions: "activeSessions",
  activeGoals: "activeGoals",
} as const;

export const INDEXES = {
  sessionsByDate: "sessionsByDate",
  contributionsByGoal: "contributionsByGoal",
  contributionsByDate: "contributionsByDate",
  enhancedNotesBySession: "enhancedNotesBySession",
} as const;

export const StoreComponent = () => {
  const store = useCreateMergeableStore(() =>
    createMergeableStore()
      .setTablesSchema(SCHEMA.table)
      .setValuesSchema(SCHEMA.value),
  );

  useIdbPersister(store as Store);

  const synchronizer = useCreateSynchronizer(store, async (s) =>
    createBroadcastChannelSynchronizer(s, "hypr-pwa-sync").startSync(),
  );

  const queries = useCreateQueries(
    store,
    (s) =>
      createQueries(s)
        .setQueryDefinition(QUERIES.activeSessions, "sessions", ({ select }) => {
          select("title");
          select("created_at");
          select("event_json");
          select("folder_id");
        })
        .setQueryDefinition(QUERIES.activeGoals, "goals", ({ select, where }) => {
          select("created_at");
          select("name");
          select("color");
          select("cadence");
          select("weekly_target");
          where("archived", false);
        }),
    [],
  )!;

  const indexes = useCreateIndexes(store, (s) =>
    createIndexes(s)
      .setIndexDefinition(INDEXES.sessionsByDate, "sessions", "created_at")
      .setIndexDefinition(INDEXES.contributionsByGoal, "goal_contributions", "goal_id", "date")
      .setIndexDefinition(INDEXES.contributionsByDate, "goal_contributions", "date", "goal_id")
      .setIndexDefinition(INDEXES.enhancedNotesBySession, "enhanced_notes", "session_id", "position"),
  );

  useProvideStore(STORE_ID, store);
  useProvideQueries(STORE_ID, queries);
  useProvideIndexes(STORE_ID, indexes!);
  useProvideSynchronizer(STORE_ID, synchronizer);

  return null;
};

function useIdbPersister(store: Store) {
  useEffect(() => {
    let destroyed = false;
    let destroyFn: (() => void) | null = null;

    import("tinybase/persisters/persister-indexed-db").then(
      async ({ createIndexedDbPersister }) => {
        if (destroyed) return;
        // MergeableStore satisfies the Store interface the persister expects
        const persister = await createIndexedDbPersister(
          store as never,
          "hyprnote-pwa",
        );
        if (destroyed) {
          persister.destroy();
          return;
        }
        await persister.startAutoLoad();
        await persister.startAutoSave();
        destroyFn = () => persister.destroy();
      },
    );

    return () => {
      destroyed = true;
      destroyFn?.();
    };
  }, [store]);
}

type QueryId = (typeof QUERIES)[keyof typeof QUERIES];

interface _QueryResultRows {
  activeSessions: {
    title: string;
    created_at: string;
    event_json: string;
    folder_id: string;
  };
  activeGoals: {
    created_at: string;
    name: string;
    color: string;
    cadence: string;
    weekly_target: number;
  };
}

export type QueryResultRowMap = { [K in QueryId]: _QueryResultRows[K] };

type QueriesOrQueriesId = _UI.WithSchemas<Schemas>["QueriesOrQueriesId"];

type TypedUI = Omit<
  _UI.WithSchemas<Schemas>,
  "useResultTable" | "useResultRow"
> & {
  useResultTable: <Q extends QueryId>(
    queryId: Q,
    queriesOrQueriesId?: QueriesOrQueriesId,
  ) => Record<string, QueryResultRowMap[Q]>;
  useResultRow: <Q extends QueryId>(
    queryId: Q,
    rowId: string,
    queriesOrQueriesId?: QueriesOrQueriesId,
  ) => QueryResultRowMap[Q];
};
