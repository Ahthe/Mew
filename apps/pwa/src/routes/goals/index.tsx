import { createFileRoute } from "@tanstack/react-router";
import { Plus, Target } from "lucide-react";
import { useState } from "react";

import { QUERIES, STORE_ID, UI } from "~/store";

export const Route = createFileRoute("/goals/")({
  component: GoalsPage,
});

function GoalsPage() {
  const goals = UI.useResultTable(QUERIES.activeGoals, STORE_ID);
  const store = UI.useStore(STORE_ID);

  const goalEntries = Object.entries(goals).sort(([, a], [, b]) =>
    (a.created_at ?? "").localeCompare(b.created_at ?? ""),
  );

  function createGoal() {
    const id = crypto.randomUUID();
    const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];
    const color = colors[Math.floor(goalEntries.length % colors.length)] ?? "#6366f1";
    store?.setRow("goals", id, {
      user_id: (store.getValue("user_id") as string) ?? "",
      created_at: new Date().toISOString(),
      name: "New goal",
      color,
      cadence: "weekly",
      weekly_target: 3,
      archived: false,
    });
  }

  return (
    <div className="flex h-full flex-col bg-char-card">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-char-line px-6 py-4">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-char-muted" />
          <h1 className="text-sm font-semibold text-char-ink">Goals</h1>
        </div>
        <button
          onClick={createGoal}
          className="flex items-center gap-1.5 rounded-lg bg-char-ink px-2.5 py-1.5 text-xs font-medium text-white hover:bg-char-ink/90 transition-colors"
        >
          <Plus size={12} />
          New goal
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 [scrollbar-width:thin]">
        {goalEntries.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-char-muted">
            <Target size={40} strokeWidth={1} className="text-char-faint" />
            <div className="text-center">
              <p className="text-sm font-medium text-char-ink">No goals yet</p>
              <p className="mt-1 text-xs text-char-muted">
                Create a goal and link notes to it with{" "}
                <kbd className="rounded bg-char-sidebar px-1 py-0.5 font-mono text-[10px] text-char-muted">
                  @
                </kbd>{" "}
                in a heading
              </p>
            </div>
            <button
              onClick={createGoal}
              className="flex items-center gap-1.5 rounded-lg bg-char-ink px-3 py-2 text-xs font-medium text-white hover:bg-char-ink/90 transition-colors"
            >
              <Plus size={12} />
              Create your first goal
            </button>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {goalEntries.map(([id, goal]) => (
              <GoalCard key={id} id={id} goal={goal} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

type GoalRow = {
  name: string;
  color: string;
  cadence: string;
  weekly_target: number;
  created_at: string;
};

function GoalCard({ id, goal }: { id: string; goal: GoalRow }) {
  const [editing, setEditing] = useState(false);
  const store = UI.useStore(STORE_ID);
  const contributions = UI.useSliceRowIds("contributionsByGoal", id, STORE_ID);

  const target = goal.weekly_target ?? 3;
  const thisWeekCount = contributions.length;

  const progress = Math.min(thisWeekCount / target, 1);

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    store?.setCell("goals", id, "name", e.target.value);
  }

  return (
    <li className="rounded-xl border border-char-line bg-char-card p-4 shadow-xs">
      <div className="flex items-start gap-3">
        {/* Color dot */}
        <div
          className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: goal.color }}
        />

        <div className="flex flex-1 flex-col gap-3 min-w-0">
          {/* Name */}
          {editing ? (
            <input
              autoFocus
              value={goal.name}
              onChange={handleNameChange}
              onBlur={() => setEditing(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
              className="text-sm font-medium text-char-ink bg-transparent outline-none border-b border-char-line"
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-left text-sm font-medium text-char-ink hover:text-char-muted transition-colors"
            >
              {goal.name || "Untitled goal"}
            </button>
          )}

          {/* Progress bar */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-char-muted">
                {thisWeekCount}/{target} this week
              </span>
              <span className="text-xs text-char-muted capitalize">{goal.cadence}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-char-line">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress * 100}%`,
                  backgroundColor: goal.color,
                }}
              />
            </div>
          </div>

          {/* 14-day heatmap */}
          <Heatmap goalId={id} color={goal.color} />
        </div>
      </div>
    </li>
  );
}

function Heatmap({ goalId, color }: { goalId: string; color: string }) {
  const contributions = UI.useSliceRowIds("contributionsByGoal", goalId, STORE_ID);

  const today = new Date();
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (13 - i));
    return d.toISOString().slice(0, 10);
  });

  const checkedDates = new Set(
    contributions.map((rowId) => {
      const parts = rowId.split(":");
      return parts[parts.length - 1] ?? "";
    }),
  );

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="flex items-end gap-0.5">
      {days.map((day, i) => {
        const active = checkedDates.has(day);
        const dow = new Date(day).getDay();
        return (
          <div key={day} className="flex flex-col items-center gap-0.5">
            <div
              className="h-4 w-4 rounded-sm transition-colors"
              style={{
                backgroundColor: active ? color : "var(--color-char-line)",
                opacity: active ? 1 : 0.6,
              }}
              title={day}
            />
            {i % 7 === 0 && (
              <span className="text-[8px] text-char-faint">{dayLabels[dow]}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
