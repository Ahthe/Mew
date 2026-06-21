import { useMemo } from "react";

import { format } from "@hypr/utils";

import * as main from "~/store/tinybase/store/main";

const WEEKS_TO_SHOW = 30;

// HabitKit-style intensity: cells are a tint of the goal color encoded in the
// alpha channel, so even level 1 reads as the goal color (not grey), and a
// fully-completed day is the full bright color.
export function cellColor(goalColor: string, intensityIdx: number): string {
  // intensity 0 = "no contribution" — a faint tint of the goal color
  const alphas = ["20", "59", "8C", "C0", "FF"] as const;
  return `${goalColor}${alphas[intensityIdx]}`;
}

export function getIntensityIndex(checked: number, total: number): number {
  if (total === 0) return 0;
  const ratio = checked / total;
  if (ratio === 0) return 0;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio < 1) return 3;
  return 4;
}

type Day = { date: string; checked: number; total: number };

function useGridColumns(goalId: string, weeks: number) {
  const store = main.UI.useStore(main.STORE_ID);
  // Subscribe to the index so the grid re-renders when contributions change.
  const contributions = main.UI.useSliceRowIds(
    main.INDEXES.contributionsByGoal,
    goalId || "",
    main.STORE_ID,
  );

  return useMemo(() => {
    const totalDays = weeks * 7;
    const today = new Date();
    const days: Day[] = [];

    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = format(d, "yyyy-MM-dd");
      const row =
        goalId && store
          ? store.getRow("goal_contributions", `${goalId}:${dateStr}`)
          : null;
      days.push({
        date: dateStr,
        checked: (row?.checked as number | undefined) ?? 0,
        total: (row?.total as number | undefined) ?? 0,
      });
    }

    // Pad the start so the first column begins on a Monday (GitHub-style).
    const firstDay = new Date(today);
    firstDay.setDate(firstDay.getDate() - (totalDays - 1));
    const dayOfWeek = firstDay.getDay(); // 0 = Sunday
    const padCount = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const padded: Array<Day | null> = [
      ...Array(padCount).fill(null),
      ...days,
    ];

    const columns: Array<Array<Day | null>> = [];
    for (let i = 0; i < padded.length; i += 7) {
      columns.push(padded.slice(i, i + 7));
    }
    // Pad the final column up to 7 rows so every column is the same height.
    const last = columns[columns.length - 1];
    if (last) {
      while (last.length < 7) last.push(null);
    }
    // Oldest week on the left, today on the far right (GitHub / HabitKit style).
    return columns;
  }, [contributions, goalId, store, weeks]);
}

export function useGoalStats(goalId: string) {
  const store = main.UI.useStore(main.STORE_ID);
  const contributions = main.UI.useSliceRowIds(
    main.INDEXES.contributionsByGoal,
    goalId || "",
    main.STORE_ID,
  );

  return useMemo(() => {
    if (!store || !goalId) {
      return { streak: 0, todayChecked: 0, todayTotal: 0 };
    }
    const today = new Date();
    const todayRow = store.getRow(
      "goal_contributions",
      `${goalId}:${format(today, "yyyy-MM-dd")}`,
    );

    let streak = 0;
    for (let i = 0; i <= 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const row = store.getRow(
        "goal_contributions",
        `${goalId}:${format(d, "yyyy-MM-dd")}`,
      );
      const checked = (row?.checked as number | undefined) ?? 0;
      const total = (row?.total as number | undefined) ?? 0;
      if (total > 0 && checked === total) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return {
      streak,
      todayChecked: (todayRow?.checked as number | undefined) ?? 0,
      todayTotal: (todayRow?.total as number | undefined) ?? 0,
    };
  }, [contributions, goalId, store]);
}

export function HeatmapGrid({
  goalId,
  goalColor,
  weeks = WEEKS_TO_SHOW,
}: {
  goalId: string;
  goalColor: string;
  weeks?: number;
}) {
  const columns = useGridColumns(goalId, weeks);

  return (
    <div className="w-full">
      {/* Grid — flex-1 columns + aspect-square cells fill the full width */}
      <div className="flex gap-[2px] w-full">
        {columns.map((week, wi) => (
          <div key={wi} className="flex-1 min-w-0 flex flex-col gap-[2px]">
            {week.map((day, di) => {
              if (!day) {
                return (
                  <div
                    key={di}
                    className="w-full aspect-square rounded-[3px]"
                    style={{ background: "transparent" }}
                  />
                );
              }
              const intensityIdx = getIntensityIndex(day.checked, day.total);
              const isDone = intensityIdx === 4;
              return (
                <div
                  key={di}
                  title={`${day.date}: ${day.checked}/${day.total}`}
                  className="w-full aspect-square rounded-[3px] transition-colors duration-200 hover:ring-1 hover:ring-white/25"
                  style={{
                    background: cellColor(goalColor, intensityIdx),
                    boxShadow: isDone ? `0 0 6px ${goalColor}55` : undefined,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 mt-3">
        <span className="text-white/30 text-[9px]">Less</span>
        <div className="flex gap-[2px] items-center">
          {([0, 1, 2, 3, 4] as const).map((level) => (
            <div
              key={level}
              className="size-2 rounded-[2px]"
              style={{ background: cellColor(goalColor, level) }}
            />
          ))}
        </div>
        <span className="text-white/30 text-[9px]">More</span>
      </div>
    </div>
  );
}
