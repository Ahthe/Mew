import { createJsonFilePersister } from "~/store/tinybase/persister/factories";
import type { Store } from "~/store/tinybase/store/main";

export function createGoalPersister(store: Store) {
  return createJsonFilePersister(store, {
    tableName: "goals",
    filename: "goals.json",
    label: "GoalPersister",
  });
}
