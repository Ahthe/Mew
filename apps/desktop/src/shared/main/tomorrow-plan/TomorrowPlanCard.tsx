import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@hypr/utils";

// TODO(phase2): replace with AI-generated suggestions
const MOCK_SUGGESTIONS = [
  {
    id: "1",
    title: "Follow up with @Artem on the pricing plan",
    detail: "You discussed this today but left it open.",
  },
  {
    id: "2",
    title: "Trim the launch checklist with the team",
    detail: "3 items are still unresolved from yesterday.",
  },
  {
    id: "3",
    title: "Review the Q3 OKRs before the all-hands",
    detail: "Meeting is at 10 AM tomorrow.",
  },
];

export function TomorrowPlanCard({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd?: (suggestion: { id: string; title: string }) => void;
}) {
  const [index, setIndex] = useState(0);
  const suggestion = MOCK_SUGGESTIONS[index];

  const prev = () =>
    setIndex(
      (i) => (i - 1 + MOCK_SUGGESTIONS.length) % MOCK_SUGGESTIONS.length,
    );
  const next = () => setIndex((i) => (i + 1) % MOCK_SUGGESTIONS.length);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/10"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className={cn([
              "fixed bottom-8 left-1/2 z-50 w-[480px] -translate-x-1/2",
              "rounded-2xl bg-[#1a1a1a] text-white shadow-2xl",
              "overflow-hidden",
            ])}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-white/40">
                  {"{ }"}
                </span>
                <span className="font-mono text-[11px] font-semibold tracking-wider uppercase text-white/50">
                  Tomorrow plan
                </span>
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-1 text-white/30 transition-colors hover:text-white/60"
              >
                <XIcon className="size-3.5" />
              </button>
            </div>

            <div className="px-5 pb-2">
              <p className="text-base font-semibold text-white/90">
                Great job today. Plan tomorrow.
              </p>
            </div>

            <div className="px-5 py-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18 }}
                  className="rounded-xl border border-white/10 bg-white/[0.06] p-4"
                >
                  <p className="mb-1 text-sm font-medium text-white/90">
                    {suggestion.title}
                  </p>
                  <p className="text-xs text-white/45">{suggestion.detail}</p>
                </motion.div>
              </AnimatePresence>

              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  onClick={prev}
                  className="rounded-full p-1 text-white/30 transition-colors hover:text-white/60"
                >
                  <ChevronLeftIcon className="size-4" />
                </button>
                <div className="flex gap-1.5">
                  {MOCK_SUGGESTIONS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setIndex(i)}
                      className={cn([
                        "rounded-full transition-all duration-150",
                        i === index
                          ? "size-2 bg-white/70"
                          : "size-1.5 bg-white/25 hover:bg-white/40",
                      ])}
                    />
                  ))}
                </div>
                <button
                  onClick={next}
                  className="rounded-full p-1 text-white/30 transition-colors hover:text-white/60"
                >
                  <ChevronRightIcon className="size-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-white/[0.08] px-5 py-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
                className="rounded-xl border border-white/15 px-3 py-1.5 text-xs text-white/50 transition-colors hover:border-white/30 hover:text-white/70"
              >
                Decline
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                className="rounded-xl border border-white/15 px-3 py-1.5 text-xs text-white/50 transition-colors hover:border-white/30 hover:text-white/70"
              >
                Ask to change…
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  onAdd?.(suggestion);
                  next();
                }}
                className="ml-auto flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-[#1a1a1a] transition-opacity hover:opacity-90"
              >
                + Add
              </motion.button>
            </div>

            <div className="flex justify-center py-1.5">
              <motion.div
                whileHover={{ opacity: 0.6 }}
                className="h-1 w-8 rounded-full bg-white/20 opacity-30 transition-opacity"
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
