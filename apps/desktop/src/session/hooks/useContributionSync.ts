import { useCallback, useEffect } from "react";
import { format } from "@hypr/utils";
import * as main from "~/store/tinybase/store/main";

type GoalContrib = { checked: number; total: number };

function countTasks(node: any): GoalContrib {
  let checked = 0;
  let total = 0;
  if (node.type === "taskItem") {
    total += 1;
    if (node.attrs?.checked === true) checked += 1;
  }
  for (const child of node.content ?? []) {
    const sub = countTasks(child);
    checked += sub.checked;
    total += sub.total;
  }
  return { checked, total };
}

function extractGoalContributions(
  doc: any,
): Map<string, GoalContrib> {
  const result = new Map<string, GoalContrib>();
  const nodes: any[] = doc?.content ?? [];

  let currentGoalId: string | null = null;
  let currentContrib: GoalContrib = { checked: 0, total: 0 };

  function flush() {
    if (currentGoalId) {
      const existing = result.get(currentGoalId) ?? { checked: 0, total: 0 };
      result.set(currentGoalId, {
        checked: existing.checked + currentContrib.checked,
        total: existing.total + currentContrib.total,
      });
    }
  }

  for (const node of nodes) {
    if (node.type === "heading") {
      flush();
      currentGoalId = (node.attrs?.goalId as string | null) ?? null;
      currentContrib = { checked: 0, total: 0 };
    } else if (currentGoalId) {
      const sub = countTasks(node);
      currentContrib.checked += sub.checked;
      currentContrib.total += sub.total;
    }
  }
  flush();

  return result;
}

export function useContributionSync(sessionId: string) {
  const rawMd = main.UI.useCell(
    "sessions",
    sessionId,
    "raw_md",
    main.STORE_ID,
  );
  const store = main.UI.useStore(main.STORE_ID);
  const userId = main.UI.useValue("user_id", main.STORE_ID) as
    | string
    | undefined;

  const sync = useCallback(() => {
    if (!store || !rawMd) return;

    let doc: any;
    try {
      doc = JSON.parse(rawMd as string);
    } catch {
      return;
    }

    const contributions = extractGoalContributions(doc);
    const today = format(new Date(), "yyyy-MM-dd");

    contributions.forEach(({ checked, total }, goalId) => {
      const rowId = `${goalId}:${today}`;
      store.setRow("goal_contributions", rowId, {
        user_id: userId ?? "",
        goal_id: goalId,
        date: today,
        checked,
        total,
      });
    });
  }, [rawMd, store, userId]);

  useEffect(() => {
    sync();
  }, [sync]);
}
