import { AnimatePresence } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { DelegatedResult } from "./DelegatedResult";
import { DelegatePill } from "./DelegatePill";
import { ThinkingChip } from "./ThinkingChip";

type DelegateState = "idle" | "thinking" | "revealing" | "done";

interface HoveredTask {
  rect: DOMRect;
  text: string;
}

export function DelegateOverlay({
  containerRef,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [hovered, setHovered] = useState<HoveredTask | null>(null);
  const [state, setState] = useState<DelegateState>("idle");
  const [result, setResult] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onMouseOver = (e: MouseEvent) => {
      const li = (e.target as Element).closest(
        'ul[data-type="taskList"] > li',
      ) as HTMLElement | null;
      if (!li) return;

      clearTimeout(hideTimer.current);
      const rect = li.getBoundingClientRect();
      const label =
        li.querySelector("div[data-node-view-content]")?.textContent?.trim()
        ?? li.querySelector("div")?.textContent?.trim()
        ?? "";
      setHovered({ rect, text: label });
      setState("idle");
      setResult(null);
    };

    const onMouseLeave = (e: MouseEvent) => {
      if (overlayRef.current?.contains(e.relatedTarget as Node)) return;
      hideTimer.current = setTimeout(() => setHovered(null), 250);
    };

    container.addEventListener("mouseover", onMouseOver);
    container.addEventListener("mouseleave", onMouseLeave);
    return () => {
      clearTimeout(hideTimer.current);
      container.removeEventListener("mouseover", onMouseOver);
      container.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [containerRef]);

  const handleDelegate = useCallback(() => {
    setState("thinking");
    // TODO(phase2): replace mock with real delegation engine
    setTimeout(() => {
      setResult(
        "I've analysed the context and drafted a follow-up email for @Artem with the launch checklist trimmed.",
      );
      setState("revealing");
      setTimeout(() => setState("done"), 500);
    }, 1400);
  }, []);

  if (!hovered) return null;

  const pillWidth = 130;
  const left = Math.max(8, hovered.rect.right - pillWidth - 8);
  const top = hovered.rect.top + hovered.rect.height / 2;

  return createPortal(
    <div
      ref={overlayRef}
      style={{
        position: "fixed",
        top,
        left,
        transform: "translateY(-50%)",
        zIndex: 50,
        pointerEvents: "all",
      }}
      onMouseEnter={() => clearTimeout(hideTimer.current)}
      onMouseLeave={() => {
        hideTimer.current = setTimeout(() => setHovered(null), 250);
      }}
    >
      <AnimatePresence mode="wait">
        {state === "idle" && (
          <DelegatePill key="pill" onDelegate={handleDelegate} />
        )}
        {state === "thinking" && <ThinkingChip key="thinking" />}
        {(state === "revealing" || state === "done") && result && (
          <DelegatedResult key="result" text={result} />
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
