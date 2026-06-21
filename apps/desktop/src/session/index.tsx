import { useQuery } from "@tanstack/react-query";
import { convertFileSrc } from "@tauri-apps/api/core";
import { StickyNoteIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";
import { cn } from "@hypr/utils";

import { CaretPositionProvider } from "./components/caret-position-context";
import { FloatingActionButton } from "./components/floating";
import { NoteInput } from "./components/note-input";
import { DelegateOverlay } from "./components/note-input/delegate/DelegateOverlay";
import { SearchProvider } from "./components/note-input/transcript/search-context";
import { OuterHeader } from "./components/outer-header";
import { DateDisplay } from "./components/outer-header/metadata/date";
import { SessionPreviewCard } from "./components/session-preview-card";
import { useCurrentNoteTab, useHasTranscript } from "./components/shared";
import { TitleInput } from "./components/title-input";
import { useAutoEnhance } from "./hooks/useAutoEnhance";
import { useIsSessionEnhancing } from "./hooks/useEnhancedNotes";
import { useContributionSync } from "./hooks/useContributionSync";

import { useTitleGeneration } from "~/ai/hooks";
import * as AudioPlayer from "~/audio-player";
import { useShell } from "~/contexts/shell";
import { StandardTabWrapper } from "~/shared/main";
import { TomorrowPlanCard } from "~/shared/main/tomorrow-plan/TomorrowPlanCard";
import { GoalCreatePopover } from "~/shared/goal/GoalCreatePopover";
import { type TabItem, TabItemBase } from "~/shared/tabs";
import * as main from "~/store/tinybase/store/main";
import { useSessionTitle } from "~/store/zustand/live-title";
import { type Tab, useTabs } from "~/store/zustand/tabs";
import { useListener } from "~/stt/contexts";
import { useStartListening } from "~/stt/useStartListening";
import { useSTTConnection } from "~/stt/useSTTConnection";

const SIDEBAR_WIDTH = 280;
const LAYOUT_PADDING = 4;

export const TabItemNote: TabItem<Extract<Tab, { type: "sessions" }>> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
  handlePinThis,
  handleUnpinThis,
  pendingCloseConfirmationTab,
  setPendingCloseConfirmationTab,
}) => {
  const storeTitle = main.UI.useCell(
    "sessions",
    tab.id,
    "title",
    main.STORE_ID,
  );
  const title = useSessionTitle(tab.id, storeTitle as string | undefined);
  const sessionMode = useListener((state) => state.getSessionMode(tab.id));
  const stop = useListener((state) => state.stop);
  const isEnhancing = useIsSessionEnhancing(tab.id);
  const isActive = sessionMode === "active" || sessionMode === "finalizing";
  const isFinalizing = sessionMode === "finalizing";
  const isBatching = sessionMode === "running_batch";
  const showSpinner =
    !tab.active && (isFinalizing || isEnhancing || isBatching);

  const showCloseConfirmation =
    pendingCloseConfirmationTab?.type === "sessions" &&
    pendingCloseConfirmationTab?.id === tab.id;

  const handleCloseConfirmationChange = (show: boolean) => {
    if (!show) {
      setPendingCloseConfirmationTab?.(null);
    }
  };

  const handleCloseWithStop = useCallback(() => {
    if (isActive) {
      stop();
    }
    handleCloseThis(tab);
  }, [isActive, stop, tab, handleCloseThis]);

  return (
    <SessionPreviewCard sessionId={tab.id} side="bottom" enabled={!tab.active}>
      <TabItemBase
        icon={<StickyNoteIcon className="h-4 w-4" />}
        title={title || "Untitled"}
        selected={tab.active}
        active={isActive}
        accent={isActive ? "red" : "neutral"}
        finalizing={showSpinner}
        pinned={tab.pinned}
        tabIndex={tabIndex}
        showCloseConfirmation={showCloseConfirmation}
        onCloseConfirmationChange={handleCloseConfirmationChange}
        handleCloseThis={handleCloseWithStop}
        handleSelectThis={() => handleSelectThis(tab)}
        handleCloseOthers={handleCloseOthers}
        handleCloseAll={handleCloseAll}
        handlePinThis={() => handlePinThis(tab)}
        handleUnpinThis={() => handleUnpinThis(tab)}
      />
    </SessionPreviewCard>
  );
};

export function TabContentNote({
  tab,
}: {
  tab: Extract<Tab, { type: "sessions" }>;
}) {
  const listenerStatus = useListener((state) => state.live.status);
  const sessionMode = useListener((state) => state.getSessionMode(tab.id));
  const updateSessionTabState = useTabs((state) => state.updateSessionTabState);
  const { conn } = useSTTConnection();
  const startListening = useStartListening(tab.id);
  const hasAttemptedAutoStart = useRef(false);

  useEffect(() => {
    if (
      sessionMode === "running_batch" &&
      tab.state.view?.type !== "transcript"
    ) {
      updateSessionTabState(tab, {
        ...tab.state,
        view: { type: "transcript" },
      });
    }
  }, [sessionMode, tab, updateSessionTabState]);

  useEffect(() => {
    if (!tab.state.autoStart) {
      hasAttemptedAutoStart.current = false;
      return;
    }

    if (hasAttemptedAutoStart.current) {
      return;
    }

    if (listenerStatus !== "inactive") {
      return;
    }

    if (!conn) {
      return;
    }

    hasAttemptedAutoStart.current = true;
    startListening();
    updateSessionTabState(tab, { ...tab.state, autoStart: null });
  }, [
    tab.id,
    tab.state,
    tab.state.autoStart,
    listenerStatus,
    conn,
    startListening,
    updateSessionTabState,
  ]);

  const { data: audioUrl } = useQuery({
    enabled: listenerStatus === "inactive",
    queryKey: ["audio", tab.id, "url"],
    queryFn: () => fsSyncCommands.audioPath(tab.id),
    select: (result) => {
      if (result.status === "error") {
        return null;
      }
      return convertFileSrc(result.data);
    },
  });

  const showTimeline =
    tab.state.view?.type === "transcript" &&
    Boolean(audioUrl) &&
    listenerStatus === "inactive";

  return (
    <CaretPositionProvider>
      <SearchProvider>
        <AudioPlayer.Provider sessionId={tab.id} url={audioUrl ?? ""}>
          <TabContentNoteInner tab={tab} showTimeline={showTimeline} />
        </AudioPlayer.Provider>
      </SearchProvider>
    </CaretPositionProvider>
  );
}

function TabContentNoteInner({
  tab,
  showTimeline,
}: {
  tab: Extract<Tab, { type: "sessions" }>;
  showTimeline: boolean;
}) {
  const titleInputRef = React.useRef<HTMLInputElement>(null);
  const noteInputRef = React.useRef<{
    editor: import("@hypr/tiptap/editor").TiptapEditor | null;
  }>(null);
  const noteContainerRef = React.useRef<HTMLDivElement>(null);
  const [showTomorrowPlan, setShowTomorrowPlan] = useState(false);

  const currentView = useCurrentNoteTab(tab);
  const { generateTitle } = useTitleGeneration(tab);
  const hasTranscript = useHasTranscript(tab.id);

  const sessionId = tab.id;
  const { skipReason } = useAutoEnhance(tab);
  const [showConsentBanner, setShowConsentBanner] = useState(false);

  useContributionSync(tab.id);

  const sessionMode = useListener((state) => state.getSessionMode(sessionId));
  const prevSessionMode = useRef<string | null>(sessionMode);

  useAutoFocusTitle({ sessionId, titleInputRef });

  useEffect(() => {
    const justStartedListening =
      prevSessionMode.current !== "active" && sessionMode === "active";
    const justStoppedListening =
      prevSessionMode.current === "active" && sessionMode !== "active";

    prevSessionMode.current = sessionMode;

    if (justStartedListening) {
      setShowConsentBanner(true);
    } else if (justStoppedListening) {
      setShowConsentBanner(false);
    }
  }, [sessionMode]);

  useEffect(() => {
    if (!showConsentBanner) {
      return;
    }

    const timer = setTimeout(() => {
      setShowConsentBanner(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, [showConsentBanner]);

  const focusTitle = React.useCallback(() => {
    titleInputRef.current?.focus();
  }, []);

  const focusEditor = React.useCallback(() => {
    noteInputRef.current?.editor?.commands.focus();
  }, []);

  return (
    <>
      <StandardTabWrapper
        afterBorder={showTimeline && <AudioPlayer.Timeline />}
        floatingButton={<FloatingActionButton tab={tab} />}
        showTimeline={showTimeline}
      >
        <div className="flex h-full flex-col bg-char-card">
          <div className="pr-1 pl-3">
            <OuterHeader sessionId={tab.id} currentView={currentView} />
          </div>
          <div className="mt-4 shrink-0 px-8">
            <TitleInput
              ref={titleInputRef}
              tab={tab}
              onNavigateToEditor={focusEditor}
              onGenerateTitle={hasTranscript ? generateTitle : undefined}
            />
          </div>
          <div ref={noteContainerRef} className="mt-8 min-h-0 flex-1 px-7">
            <div className="mb-6">
              <DateDisplay sessionId={tab.id} />
            </div>
            <NoteInput
              ref={noteInputRef}
              tab={tab}
              onNavigateToTitle={focusTitle}
            />
          </div>
        </div>
      </StandardTabWrapper>
      <DelegateOverlay containerRef={noteContainerRef} />
      <TomorrowPlanCard
        open={showTomorrowPlan}
        onClose={() => setShowTomorrowPlan(false)}
      />
      <GoalCreatePopover />
      <StatusBanner
        skipReason={skipReason}
        showConsentBanner={showConsentBanner}
        showTimeline={showTimeline}
      />
    </>
  );
}

function StatusBanner({
  skipReason,
  showConsentBanner,
  showTimeline,
}: {
  skipReason: string | null;
  showConsentBanner: boolean;
  showTimeline: boolean;
}) {
  const { leftsidebar, chat } = useShell();
  const [chatPanelWidth, setChatPanelWidth] = useState(0);

  const isChatPanelOpen = chat.mode === "RightPanelOpen";

  useEffect(() => {
    if (!isChatPanelOpen) {
      setChatPanelWidth(0);
      return;
    }

    const updateChatWidth = () => {
      const panels = document.querySelectorAll("[data-panel-id]");
      const lastPanel = panels[panels.length - 1];
      if (lastPanel) {
        setChatPanelWidth(lastPanel.getBoundingClientRect().width);
      }
    };

    updateChatWidth();
    window.addEventListener("resize", updateChatWidth);

    const resizeObserver = new ResizeObserver(updateChatWidth);
    const panels = document.querySelectorAll("[data-panel-id]");
    const lastPanel = panels[panels.length - 1];
    if (lastPanel) {
      resizeObserver.observe(lastPanel);
    }

    return () => {
      window.removeEventListener("resize", updateChatWidth);
      resizeObserver.disconnect();
    };
  }, [isChatPanelOpen]);

  const leftOffset = leftsidebar.expanded
    ? (SIDEBAR_WIDTH + LAYOUT_PADDING) / 2
    : 0;
  const rightOffset = chatPanelWidth / 2;
  const totalOffset = leftOffset - rightOffset;

  return createPortal(
    <AnimatePresence>
      {(skipReason || showConsentBanner) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{ left: `calc(50% + ${totalOffset}px)` }}
          className={cn([
            "fixed z-50 -translate-x-1/2",
            "text-center text-xs whitespace-nowrap",
            skipReason ? "text-red-400" : "text-stone-300",
            showTimeline ? "bottom-[76px]" : "bottom-6",
          ])}
        >
          {skipReason || "Ask for consent when using Char"}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function useAutoFocusTitle({
  sessionId,
  titleInputRef,
}: {
  sessionId: string;
  titleInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const didAutoFocus = useRef(false);

  const title = main.UI.useCell("sessions", sessionId, "title", main.STORE_ID);

  useEffect(() => {
    if (didAutoFocus.current) return;

    if (!title) {
      titleInputRef.current?.focus();
      didAutoFocus.current = true;
    }
  }, [sessionId, title]);
}
