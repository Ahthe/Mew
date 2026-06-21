import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { createPortal } from "react-dom";
import { PlusIcon, Trash2Icon, XIcon } from "lucide-react";

import { cn } from "@hypr/utils";
import * as main from "~/store/tinybase/store/main";

import { HeatmapGrid, useGoalStats } from "./HeatmapGrid";

function GoalCard({
  goalId,
  goalData,
  onDelete,
}: {
  goalId: string;
  goalData: { name?: string; color?: string; cadence?: string };
  onDelete: () => void;
}) {
  const goalColor = (goalData.color as string | undefined) ?? "#2d7ff9";
  const goalName = (goalData.name as string | undefined) ?? "Goal";
  const { streak, todayChecked, todayTotal } = useGoalStats(goalId);

  const todayProgress = todayTotal > 0 ? todayChecked / todayTotal : 0;

  return (
    <div className="group relative rounded-2xl bg-white/5 p-4 border border-white/8">
      {/* Delete button — appears on hover */}
      <button
        onClick={onDelete}
        className={cn([
          "absolute top-3 right-3 rounded-full p-1.5",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          "text-white/30 hover:text-red-400 hover:bg-red-500/15",
        ])}
        title="Delete goal"
      >
        <Trash2Icon className="size-3.5" />
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-3 pr-6">
        <div className="flex items-center gap-2">
          <span
            className="size-2.5 rounded-full shrink-0"
            style={{ background: goalColor }}
          />
          <span className="text-white text-sm font-semibold">{goalName}</span>
        </div>
        <div className="flex items-center gap-3">
          {todayTotal > 0 && (
            <span className="text-white/40 text-[10px] tabular-nums">
              {todayChecked}/{todayTotal} today
            </span>
          )}
          {streak > 0 && (
            <span className="text-white/60 text-[10px]">🔥 {streak}</span>
          )}
        </div>
      </div>

      {/* Today progress bar */}
      {todayTotal > 0 && (
        <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden mb-3">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${Math.round(todayProgress * 100)}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              background: goalColor,
              opacity: todayProgress === 1 ? 1 : 0.7,
            }}
          />
        </div>
      )}

      <HeatmapGrid goalId={goalId} goalColor={goalColor} />
    </div>
  );
}

export function GoalsDashboard({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const goals = main.UI.useResultTable(main.QUERIES.activeGoals, main.STORE_ID);
  const store = main.UI.useStore(main.STORE_ID);
  const goalsList = useMemo(() => Object.entries(goals), [goals]);

  const handleDelete = (goalId: string) => {
    store?.delRow("goals", goalId);
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel — slides up from bottom */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-2xl rounded-t-3xl bg-[#141414] shadow-2xl"
            style={{ maxHeight: "85vh" }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-2 pb-4">
              <h2 className="text-white text-base font-semibold">Goals</h2>
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() =>
                    window.dispatchEvent(new CustomEvent("char:create-goal"))
                  }
                  className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/15 transition-colors"
                >
                  <PlusIcon className="size-3" />
                  New Goal
                </motion.button>
                <button
                  onClick={onClose}
                  className="rounded-full p-1.5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <XIcon className="size-4" />
                </button>
              </div>
            </div>

            {/* Goals list */}
            <div
              className="overflow-y-auto px-5 pb-8"
              style={{ maxHeight: "calc(85vh - 100px)" }}
            >
              {goalsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <span className="text-white/20 text-sm">No goals yet</span>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() =>
                      window.dispatchEvent(new CustomEvent("char:create-goal"))
                    }
                    className="rounded-full bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/15 transition-colors"
                  >
                    Create your first goal
                  </motion.button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {goalsList.map(([id, g]) => (
                    <GoalCard
                      key={id}
                      goalId={id}
                      goalData={
                        g as { name?: string; color?: string; cadence?: string }
                      }
                      onDelete={() => handleDelete(id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
