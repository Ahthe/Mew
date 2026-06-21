import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@hypr/utils";

import * as main from "~/store/tinybase/store/main";

import { GOAL_COLORS } from "./colors";

export function GoalCreatePopover() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(GOAL_COLORS[0].hex);
  const [cadence, setCadence] = useState<"daily" | "weekly">("daily");
  const [weeklyTarget, setWeeklyTarget] = useState(3);

  const store = main.UI.useStore(main.STORE_ID);
  const userId = main.UI.useValue("user_id", main.STORE_ID) as string | undefined;

  useEffect(() => {
    const handler = () => {
      setName("");
      setColor(GOAL_COLORS[0].hex);
      setCadence("daily");
      setWeeklyTarget(3);
      setOpen(true);
    };
    window.addEventListener("char:create-goal", handler);
    return () => window.removeEventListener("char:create-goal", handler);
  }, []);

  const handleSave = () => {
    if (!name.trim() || !store) return;
    const goalId = crypto.randomUUID();
    store.setRow("goals", goalId, {
      user_id: userId ?? "",
      created_at: new Date().toISOString(),
      name: name.trim(),
      color,
      cadence,
      weekly_target: cadence === "weekly" ? weeklyTarget : 0,
      archived: false,
    });
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") setOpen(false);
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[320px] rounded-2xl bg-[#1a1a1a] p-5 shadow-2xl"
          >
            <h3 className="text-white text-sm font-semibold mb-4">New Goal</h3>

            {/* Name input */}
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Goal name…"
              className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none mb-4"
            />

            {/* Color swatches */}
            <div className="mb-4">
              <p className="text-white/50 text-xs mb-2">Color</p>
              <div className="flex flex-wrap gap-2">
                {GOAL_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setColor(c.hex)}
                    className={cn([
                      "size-6 rounded-full transition-transform",
                      color === c.hex && "ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1a] scale-110",
                    ])}
                    style={{ background: c.hex }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* Cadence */}
            <div className="mb-5">
              <p className="text-white/50 text-xs mb-2">Cadence</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCadence("daily")}
                  className={cn([
                    "rounded-lg px-3 py-1.5 text-xs transition-colors",
                    cadence === "daily"
                      ? "bg-white/20 text-white"
                      : "text-white/50 hover:text-white",
                  ])}
                >
                  Daily
                </button>
                <button
                  onClick={() => setCadence("weekly")}
                  className={cn([
                    "rounded-lg px-3 py-1.5 text-xs transition-colors",
                    cadence === "weekly"
                      ? "bg-white/20 text-white"
                      : "text-white/50 hover:text-white",
                  ])}
                >
                  Weekly
                </button>
                {cadence === "weekly" && (
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => setWeeklyTarget((t) => Math.max(1, t - 1))}
                      className="text-white/50 hover:text-white text-xs px-1"
                    >
                      −
                    </button>
                    <span className="text-white text-xs w-4 text-center">{weeklyTarget}×</span>
                    <button
                      onClick={() => setWeeklyTarget((t) => Math.min(7, t + 1))}
                      className="text-white/50 hover:text-white text-xs px-1"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-1.5 text-xs text-white/50 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                disabled={!name.trim()}
                className="rounded-lg px-4 py-1.5 text-xs font-medium text-white transition-opacity disabled:opacity-40"
                style={{ background: color }}
              >
                Create Goal
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
