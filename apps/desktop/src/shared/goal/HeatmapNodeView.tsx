import { NodeViewWrapper, type NodeViewProps } from "@hypr/tiptap/shared";

import * as main from "~/store/tinybase/store/main";

import { HeatmapGrid, useGoalStats } from "./HeatmapGrid";

export function HeatmapNodeViewComponent(props: NodeViewProps) {
  const { node, updateAttributes } = props;
  const goalId = node.attrs.goalId as string | null;

  const goals = main.UI.useResultTable(main.QUERIES.activeGoals, main.STORE_ID);
  const stats = useGoalStats(goalId ?? "");

  const goalData = goalId
    ? (goals[goalId] as { name?: string; color?: string } | undefined)
    : null;
  const goalColor = goalData?.color ?? "#2d7ff9";
  const goalName = goalData?.name ?? "Goal";

  if (!goalId) {
    return (
      <NodeViewWrapper>
        <div className="my-3 rounded-xl bg-[#1f1f1f] p-4 border border-white/10">
          <p className="text-white/40 text-xs mb-2">
            Select a goal for this heatmap
          </p>
          <select
            className="rounded-lg bg-[#2a2a2a] text-white text-xs px-2 py-1.5 outline-none cursor-pointer w-full max-w-[240px]"
            style={{ colorScheme: "dark" }}
            onChange={(e) =>
              updateAttributes({ goalId: e.target.value || null })
            }
            defaultValue=""
          >
            <option value="" style={{ background: "#2a2a2a", color: "#ffffff" }}>
              Choose goal…
            </option>
            {Object.entries(goals).map(([id, g]) => (
              <option
                key={id}
                value={id}
                style={{ background: "#2a2a2a", color: "#ffffff" }}
              >
                {(g as { name?: string }).name}
              </option>
            ))}
          </select>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <div
        className="my-3 rounded-xl bg-[#1f1f1f] p-4 border border-white/10 select-none"
        contentEditable={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-full"
              style={{ background: goalColor }}
            />
            <span className="text-white text-xs font-semibold">{goalName}</span>
          </div>
          <div className="flex items-center gap-3">
            {stats.todayTotal > 0 && (
              <span className="text-white/40 text-[10px] tabular-nums">
                {stats.todayChecked}/{stats.todayTotal} today
              </span>
            )}
            {stats.streak > 0 && (
              <span className="text-white/60 text-[10px]">
                🔥 {stats.streak} day streak
              </span>
            )}
          </div>
        </div>

        <HeatmapGrid goalId={goalId} goalColor={goalColor} />
      </div>
    </NodeViewWrapper>
  );
}
