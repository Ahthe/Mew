import { createJsonFilePersister } from "~/store/tinybase/persister/factories";
import type { Store } from "~/store/tinybase/store/main";

export function createGoalContributionPersister(store: Store) {
  return createJsonFilePersister(store, {
    tableName: "goal_contributions",
    filename: "goal-contributions.json",
    label: "GoalContributionPersister",
  });
}
