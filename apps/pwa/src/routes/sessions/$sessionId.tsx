import { createFileRoute } from "@tanstack/react-router";
import Editor, { type JSONContent } from "@hypr/tiptap/editor";
import { useCallback, useMemo } from "react";

import { QUERIES, STORE_ID, UI } from "~/store";

export const Route = createFileRoute("/sessions/$sessionId")({
  component: SessionDetailPage,
});

function SessionDetailPage() {
  const { sessionId } = Route.useParams();
  const store = UI.useStore(STORE_ID);

  const title = (UI.useCell("sessions", sessionId, "title", STORE_ID) ?? "") as string;
  const rawMd = (UI.useCell("sessions", sessionId, "raw_md", STORE_ID) ?? "") as string;
  const createdAt = (UI.useCell("sessions", sessionId, "created_at", STORE_ID) ?? "") as string;

  const goals = UI.useResultTable(QUERIES.activeGoals, STORE_ID);

  const goalMentionItems = useMemo(
    () =>
      Object.entries(goals).map(([id, g]) => ({
        id,
        type: "goal" as const,
        label: (g.name as string) || "Untitled goal",
        content: (g.color as string) || "#888",
      })),
    [goals],
  );

  const initialContent = useMemo<JSONContent | undefined>(() => {
    if (!rawMd) return undefined;
    try {
      return JSON.parse(rawMd) as JSONContent;
    } catch {
      return {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: rawMd }] }],
      };
    }
    // Only re-parse when switching sessions, not on every keystroke
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleChange = useCallback(
    (content: JSONContent) => {
      store?.setCell("sessions", sessionId, "raw_md", JSON.stringify(content));

      // When a heading has a goalId attribute (set via @ mention), create a contribution for today
      const today = new Date().toISOString().slice(0, 10);
      const goalIds = extractGoalIds(content);
      const userId = (store?.getValue("user_id") as string) ?? "";

      for (const goalId of goalIds) {
        const contribId = `${sessionId}:${goalId}:${today}`;
        if (!store?.hasRow("goal_contributions", contribId)) {
          store?.setRow("goal_contributions", contribId, {
            user_id: userId,
            goal_id: goalId,
            date: today,
            checked: 1,
            total: 1,
          });
        }
      }
    },
    [store, sessionId],
  );

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      store?.setCell("sessions", sessionId, "title", e.target.value);
    },
    [store, sessionId],
  );

  if (!store) return null;

  return (
    <div className="flex h-full flex-col bg-char-card">
      {/* Title */}
      <div className="mt-5 shrink-0 px-8">
        <input
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled"
          className="w-full bg-transparent text-2xl font-semibold text-char-ink outline-none placeholder:text-char-faint"
        />
      </div>

      {/* Date */}
      <div className="mt-1 px-8">
        <span className="text-xs text-char-muted">{formatDate(createdAt)}</span>
      </div>

      {/* Editor */}
      <div
        key={sessionId}
        className="mt-6 min-h-0 flex-1 overflow-y-auto px-7 pb-8 [scrollbar-width:thin]"
      >
        <Editor
          initialContent={initialContent}
          handleChange={handleChange}
          setContentFromOutside={false}
          mentionConfig={{
            trigger: "@",
            goals: goalMentionItems,
            handleSearch: async (query: string) => {
              const sessionRows = Object.entries(
                (store.getTable("sessions") ?? {}) as Record<string, { title?: string }>,
              );
              return sessionRows
                .filter(
                  ([id, s]) =>
                    id !== sessionId &&
                    (s.title ?? "").toLowerCase().includes(query.toLowerCase()),
                )
                .slice(0, 5)
                .map(([id, s]) => ({
                  id,
                  type: "session",
                  label: s.title || "Untitled",
                }));
            },
          }}
        />
      </div>
    </div>
  );
}

function extractGoalIds(content: JSONContent): string[] {
  const ids: string[] = [];
  const scan = (node: JSONContent) => {
    if (node.type === "heading" && node.attrs?.goalId) {
      ids.push(node.attrs.goalId as string);
    }
    node.content?.forEach(scan);
  };
  scan(content);
  return [...new Set(ids)];
}

function formatDate(iso: string) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}
