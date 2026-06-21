import { useRouteContext } from "@tanstack/react-router";
import { useCallback } from "react";
import { useShallow } from "zustand/shallow";

import { id } from "~/shared/utils";
import { useTabs } from "~/store/zustand/tabs";

export function useNewNoteFromGoal() {
  const { persistedStore, internalStore } = useRouteContext({
    from: "__root__",
  });
  const { openNew, openCurrent } = useTabs(
    useShallow((state) => ({
      openNew: state.openNew,
      openCurrent: state.openCurrent,
    })),
  );

  return useCallback(
    (
      goalId: string,
      goalColor: string,
      goalName: string,
      behavior: "new" | "current" = "current",
    ) => {
      const user_id = internalStore?.getValue("user_id") ?? "";
      const sessionId = id();
      const now = new Date().toISOString();

      const seedContent = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: {
              level: 1,
              goalId,
              goalColor,
            },
            content: [{ type: "text", text: goalName }],
          },
          {
            type: "paragraph",
            content: [],
          },
        ],
      });

      persistedStore?.setRow("sessions", sessionId, {
        user_id,
        created_at: now,
        title: goalName,
        raw_md: seedContent,
        folder_id: "",
        event_json: "",
      });

      const ff = behavior === "new" ? openNew : openCurrent;
      ff({ type: "sessions", id: sessionId });

      return sessionId;
    },
    [persistedStore, internalStore, openNew, openCurrent],
  );
}
