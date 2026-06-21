import { memo, useCallback, useMemo, useState } from "react";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";
import { commands as openerCommands } from "@hypr/plugin-opener2";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@hypr/ui/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@hypr/ui/components/ui/dialog";
import { Spinner } from "@hypr/ui/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
import { cn, format, getYear, safeParseDate, TZDate } from "@hypr/utils";

import {
  type EventTimelineItem,
  type SessionTimelineItem,
  type TimelineItem,
  TimelinePrecision,
} from "./utils";

import { FolderIcon, PlusIcon } from "lucide-react";

import { SessionPreviewCard } from "~/session/components/session-preview-card";
import { useIsSessionEnhancing } from "~/session/hooks/useEnhancedNotes";
import { getSessionEvent } from "~/session/utils";
import type { MenuItemDef } from "~/shared/hooks/useNativeContextMenu";
import { InteractiveButton } from "~/shared/ui/interactive-button";
import { useIgnoredEvents } from "~/store/tinybase/hooks";
import { sessionOps } from "~/store/tinybase/persister/session/ops";
import {
  captureSessionData,
  deleteSessionCascade,
} from "~/store/tinybase/store/deleteSession";
import * as main from "~/store/tinybase/store/main";
import { getOrCreateSessionForEventId } from "~/store/tinybase/store/sessions";
import { useSessionTitle } from "~/store/zustand/live-title";
import { type TabInput, useTabs } from "~/store/zustand/tabs";
import { useTimelineSelection } from "~/store/zustand/timeline-selection";
import { useUndoDelete } from "~/store/zustand/undo-delete";
import { useListener } from "~/stt/contexts";

export const TimelineItemComponent = memo(
  ({
    item,
    precision,
    selected,
    timezone,
    multiSelected,
    flatItemKeys,
  }: {
    item: TimelineItem;
    precision: TimelinePrecision;
    selected: boolean;
    timezone?: string;
    multiSelected: boolean;
    flatItemKeys: string[];
  }) => {
    if (item.type === "event") {
      return (
        <EventItem
          item={item}
          precision={precision}
          selected={selected}
          timezone={timezone}
          multiSelected={multiSelected}
          flatItemKeys={flatItemKeys}
        />
      );
    }
    return (
      <SessionItem
        item={item}
        precision={precision}
        selected={selected}
        timezone={timezone}
        multiSelected={multiSelected}
        flatItemKeys={flatItemKeys}
      />
    );
  },
);

function ItemBase({
  title,
  displayTime,
  calendarId,
  showSpinner,
  selected,
  ignored,
  multiSelected,
  onClick,
  onCmdClick,
  onShiftClick,
  contextMenu,
}: {
  title: string;
  displayTime: string;
  calendarId: string | null;
  showSpinner?: boolean;
  selected: boolean;
  ignored?: boolean;
  multiSelected: boolean;
  onClick: () => void;
  onCmdClick: () => void;
  onShiftClick: () => void;
  contextMenu: MenuItemDef[];
}) {
  const hasSelection = useTimelineSelection((s) => s.selectedIds.length > 0);

  return (
    <InteractiveButton
      onClick={onClick}
      onCmdClick={onCmdClick}
      onShiftClick={onShiftClick}
      contextMenu={hasSelection ? undefined : contextMenu}
      className={cn([
        "w-full cursor-pointer rounded-md px-3 py-2 text-left",
        "border-b border-char-line/70 last:border-b-0",
        multiSelected && "bg-char-selected",
        !multiSelected && selected && "bg-char-selected",
        !multiSelected && !selected && "hover:bg-char-card/70",
        ignored && "opacity-40",
      ])}
    >
      <div className="flex items-center gap-2">
        {showSpinner && (
          <div className="shrink-0">
            <Spinner size={14} />
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div
            className={cn(
              "pointer-events-none truncate text-sm font-normal",
              selected && "font-medium text-char-ink",
              ignored && "line-through",
            )}
          >
            {title || <span className="text-neutral-400">Untitled</span>}
          </div>
          {displayTime && (
            <div className="text-xs text-char-muted-soft">{displayTime}</div>
          )}
        </div>
        {calendarId && <CalendarIndicator calendarId={calendarId} />}
      </div>
    </InteractiveButton>
  );
}

const EventItem = memo(
  ({
    item,
    precision,
    selected,
    timezone,
    multiSelected,
    flatItemKeys,
  }: {
    item: EventTimelineItem;
    precision: TimelinePrecision;
    selected: boolean;
    timezone?: string;
    multiSelected: boolean;
    flatItemKeys: string[];
  }) => {
    const store = main.UI.useStore(main.STORE_ID);
    const openCurrent = useTabs((state) => state.openCurrent);
    const openNew = useTabs((state) => state.openNew);

    const eventId = item.id;
    const trackingIdEvent = item.data.tracking_id_event;
    const title = item.data.title || "Untitled";
    const calendarId = item.data.calendar_id ?? null;
    const recurrenceSeriesId = item.data.recurrence_series_id;

    const {
      isIgnored,
      ignoreEvent,
      unignoreEvent,
      ignoreSeries,
      unignoreSeries,
    } = useIgnoredEvents();

    const ignored = isIgnored(trackingIdEvent, recurrenceSeriesId);

    const displayTime = useMemo(
      () => formatDisplayTime(item.data.started_at, precision, timezone),
      [item.data.started_at, precision, timezone],
    );

    const openEvent = useCallback(
      (openInNewTab: boolean) => {
        if (!store || !eventId) {
          return;
        }

        const sessionId = getOrCreateSessionForEventId(store, eventId, title);
        const tab: TabInput = { id: sessionId, type: "sessions" };
        openInNewTab ? openNew(tab) : openCurrent(tab);
      },
      [eventId, store, title, openCurrent, openNew],
    );

    const itemKey = `event-${item.id}`;

    const handleClick = useCallback(() => {
      useTimelineSelection.getState().setAnchor(itemKey);
      openEvent(false);
    }, [openEvent, itemKey]);

    const handleCmdClick = useCallback(() => {
      useTimelineSelection.getState().toggleSelect(itemKey);
    }, [itemKey]);

    const handleShiftClick = useCallback(() => {
      useTimelineSelection.getState().selectRange(flatItemKeys, itemKey);
    }, [flatItemKeys, itemKey]);

    const handleIgnore = useCallback(() => {
      if (!trackingIdEvent) return;
      ignoreEvent(trackingIdEvent);
    }, [trackingIdEvent, ignoreEvent]);

    const handleUnignore = useCallback(() => {
      if (!trackingIdEvent) return;
      unignoreEvent(trackingIdEvent);
    }, [trackingIdEvent, unignoreEvent]);

    const handleUnignoreSeries = useCallback(() => {
      if (!recurrenceSeriesId) return;
      unignoreSeries(recurrenceSeriesId);
    }, [recurrenceSeriesId, unignoreSeries]);

    const handleIgnoreSeries = useCallback(() => {
      if (!recurrenceSeriesId) return;
      ignoreSeries(recurrenceSeriesId);
    }, [recurrenceSeriesId, ignoreSeries]);

    const contextMenu = useMemo(() => {
      if (ignored) {
        if (recurrenceSeriesId) {
          return [
            {
              id: "unignore",
              text: "Unignore Only This Event",
              action: handleUnignore,
            },
            {
              id: "unignore-series",
              text: "Unignore All Recurring Events",
              action: handleUnignoreSeries,
            },
          ];
        }
        return [
          { id: "unignore", text: "Unignore Event", action: handleUnignore },
        ];
      }
      const menu = [
        { id: "ignore", text: "Ignore Event", action: handleIgnore },
      ];
      if (recurrenceSeriesId) {
        menu.push({
          id: "ignore-series",
          text: "Ignore All Recurring Events",
          action: handleIgnoreSeries,
        });
      }
      return menu;
    }, [
      ignored,
      handleIgnore,
      handleUnignore,
      handleUnignoreSeries,
      handleIgnoreSeries,
      recurrenceSeriesId,
    ]);

    return (
      <ItemBase
        title={title}
        displayTime={displayTime}
        calendarId={calendarId}
        selected={selected}
        ignored={ignored}
        multiSelected={multiSelected}
        onClick={handleClick}
        onCmdClick={handleCmdClick}
        onShiftClick={handleShiftClick}
        contextMenu={contextMenu}
      />
    );
  },
);

const SessionItem = memo(
  ({
    item,
    precision,
    selected,
    timezone,
    multiSelected,
    flatItemKeys,
  }: {
    item: SessionTimelineItem;
    precision: TimelinePrecision;
    selected: boolean;
    timezone?: string;
    multiSelected: boolean;
    flatItemKeys: string[];
  }) => {
    const store = main.UI.useStore(main.STORE_ID);
    const indexes = main.UI.useIndexes(main.STORE_ID);
    const openCurrent = useTabs((state) => state.openCurrent);
    const openNew = useTabs((state) => state.openNew);
    const invalidateResource = useTabs((state) => state.invalidateResource);
    const addDeletion = useUndoDelete((state) => state.addDeletion);
    const [folderDialogOpen, setFolderDialogOpen] = useState(false);

    const sessionId = item.id;
    const storeTitle = main.UI.useCell(
      "sessions",
      sessionId,
      "title",
      main.STORE_ID,
    ) as string | undefined;
    const title = useSessionTitle(sessionId, storeTitle);

    const sessionMode = useListener((state) => state.getSessionMode(sessionId));
    const isEnhancing = useIsSessionEnhancing(sessionId);
    const isFinalizing = sessionMode === "finalizing";
    const isBatching = sessionMode === "running_batch";
    const showSpinner =
      !selected && (isFinalizing || isEnhancing || isBatching);

    const sessionEvent = useMemo(
      () => getSessionEvent(item.data),
      [item.data.event_json],
    );

    const calendarId = sessionEvent?.calendar_id ?? null;
    const hasEvent = !!item.data.event_json;

    const displayTime = useMemo(
      () =>
        formatDisplayTime(
          sessionEvent?.started_at ?? item.data.created_at,
          precision,
          timezone,
        ),
      [sessionEvent?.started_at, item.data.created_at, precision, timezone],
    );

    const itemKey = `session-${item.id}`;

    const handleClick = useCallback(() => {
      useTimelineSelection.getState().setAnchor(itemKey);
      openCurrent({ id: sessionId, type: "sessions" });
    }, [sessionId, openCurrent, itemKey]);

    const handleCmdClick = useCallback(() => {
      useTimelineSelection.getState().toggleSelect(itemKey);
    }, [itemKey]);

    const handleShiftClick = useCallback(() => {
      useTimelineSelection.getState().selectRange(flatItemKeys, itemKey);
    }, [flatItemKeys, itemKey]);

    const handleOpenNewTab = useCallback(() => {
      openNew({ id: sessionId, type: "sessions" });
    }, [sessionId, openNew]);

    const handleDelete = useCallback(() => {
      if (!store) {
        return;
      }

      const capturedData = captureSessionData(store, indexes, sessionId);

      invalidateResource("sessions", sessionId);
      void deleteSessionCascade(store, indexes, sessionId, {
        skipAudio: true,
      });

      if (capturedData) {
        addDeletion(capturedData, () => {
          void fsSyncCommands.audioDelete(sessionId);
        });
      }
    }, [store, indexes, sessionId, invalidateResource, addDeletion]);

    const handleShowInFinder = useCallback(async () => {
      const result = await fsSyncCommands.sessionDir(sessionId);
      if (result.status === "ok") {
        await openerCommands.openPath(result.data, null);
      }
    }, [sessionId]);

    const contextMenu = useMemo(
      () => [
        {
          id: "open-new-tab",
          text: "Open in New Tab",
          action: handleOpenNewTab,
        },
        {
          id: "show",
          text: "Show in Finder",
          action: handleShowInFinder,
        },
        {
          id: "move-to-folder",
          text: "Move to Folder...",
          action: () => setFolderDialogOpen(true),
        },
        { separator: true as const },
        {
          id: "delete",
          text: hasEvent ? "Delete Attached Note" : "Delete Note",
          action: handleDelete,
        },
      ],
      [handleOpenNewTab, handleShowInFinder, handleDelete, hasEvent],
    );

    return (
      <>
        <SessionPreviewCard
          sessionId={sessionId}
          side="right"
          enabled={!selected}
        >
          <ItemBase
            title={title}
            displayTime={displayTime}
            calendarId={calendarId}
            showSpinner={showSpinner}
            selected={selected}
            multiSelected={multiSelected}
            onClick={handleClick}
            onCmdClick={handleCmdClick}
            onShiftClick={handleShiftClick}
            contextMenu={contextMenu}
          />
        </SessionPreviewCard>
        <FolderPickerDialog
          open={folderDialogOpen}
          onClose={() => setFolderDialogOpen(false)}
          sessionId={sessionId}
        />
      </>
    );
  },
);

function formatDisplayTime(
  timestamp: string | null | undefined,
  precision: TimelinePrecision,
  timezone?: string,
): string {
  const parsed = safeParseDate(timestamp);
  if (!parsed) {
    return "";
  }

  const date = timezone ? new TZDate(parsed, timezone) : parsed;
  const time = format(date, "h:mm a");

  if (precision === "time") {
    return time;
  }

  const now = timezone ? new TZDate(new Date(), timezone) : new Date();
  const sameYear = getYear(date) === getYear(now);
  const dateStr = sameYear
    ? format(date, "MMM d")
    : format(date, "MMM d, yyyy");

  return `${dateStr}, ${time}`;
}

function FolderPickerDialog({
  open,
  onClose,
  sessionId,
}: {
  open: boolean;
  onClose: () => void;
  sessionId: string;
}) {
  const [search, setSearch] = useState("");
  const store = main.UI.useStore(main.STORE_ID);
  const sessionIds = main.UI.useRowIds("sessions", main.STORE_ID);

  const folders = useMemo(() => {
    if (!store || !sessionIds) return {} as Record<string, string>;
    const f: Record<string, string> = {};
    for (const sid of sessionIds) {
      const fid = store.getCell("sessions", sid, "folder_id") as string;
      if (fid && !f[fid]) {
        const parts = fid.split("/");
        f[fid] = parts[parts.length - 1] ?? fid;
      }
    }
    return f;
  }, [sessionIds, store]);

  const handleMove = useCallback(
    async (folderId: string) => {
      await sessionOps.moveSessionToFolder(sessionId, folderId);
      onClose();
    },
    [sessionId, onClose],
  );

  const trimmed = search.trim();
  const exactMatch = Object.keys(folders).some(
    (fid) =>
      fid === trimmed || (folders[fid] ?? "").toLowerCase() === trimmed.toLowerCase(),
  );
  const showCreate = trimmed.length > 0 && !exactMatch;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xs p-0">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="text-sm font-medium">Move to Folder</DialogTitle>
        </DialogHeader>
        <Command>
          <CommandInput
            placeholder="Search or type new folder..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {trimmed ? null : "No folders yet — type a name to create one."}
            </CommandEmpty>
            <CommandGroup>
              {Object.entries(folders).map(([fid, name]) => (
                <CommandItem key={fid} value={name} onSelect={() => handleMove(fid)}>
                  <FolderIcon className="mr-2 h-4 w-4" />
                  {name}
                </CommandItem>
              ))}
              {showCreate && (
                <CommandItem
                  value={`__create__${trimmed}`}
                  onSelect={() => handleMove(trimmed)}
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Create &ldquo;{trimmed}&rdquo;
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function CalendarIndicator({ calendarId }: { calendarId: string }) {
  const calendar = main.UI.useRow("calendars", calendarId, main.STORE_ID);

  const name = calendar?.name ? String(calendar.name) : undefined;
  const color = calendar?.color ? String(calendar.color) : "#888";

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <div
          className="size-2 shrink-0 rounded-full opacity-60"
          style={{ backgroundColor: color }}
        />
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {name || "Calendar"}
      </TooltipContent>
    </Tooltip>
  );
}
