import {
  ExternalLinkIcon,
  FolderIcon,
  FolderInputIcon,
  FoldersIcon,
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  StickyNoteIcon,
  Trash2Icon,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";
import { Button } from "@hypr/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@hypr/ui/components/ui/dropdown-menu";
import { cn, format, safeParseDate } from "@hypr/utils";

import { MoveToFolderDialog } from "./move-to-folder-dialog";
import { Section } from "./shared";

import { StandardTabWrapper } from "~/shared/main";
import { type TabItem, TabItemBase } from "~/shared/tabs";
import {
  FolderBreadcrumb,
  useFolderChain,
} from "~/shared/ui/folder-breadcrumb";
import { useSession } from "~/store/tinybase/hooks";
import { sessionOps } from "~/store/tinybase/persister/session/ops";
import {
  captureSessionData,
  deleteSessionCascade,
} from "~/store/tinybase/store/deleteSession";
import * as main from "~/store/tinybase/store/main";
import { createSession } from "~/store/tinybase/store/sessions";
import { type Tab, useTabs } from "~/store/zustand/tabs";
import { useUndoDelete } from "~/store/zustand/undo-delete";

// Custom drag MIME so dropping a note onto a folder card moves it there.
const SESSION_DND = "application/x-mew-session";

function useFolderTree() {
  const sessionIds = main.UI.useRowIds("sessions", main.STORE_ID);
  const store = main.UI.useStore(main.STORE_ID);

  return useMemo(() => {
    if (!store || !sessionIds)
      return {
        topLevel: [] as string[],
        byParent: {} as Record<string, string[]>,
      };

    const allFolders = new Set<string>();
    for (const id of sessionIds) {
      const folderId = store.getCell("sessions", id, "folder_id") as string;
      if (folderId) {
        const parts = folderId.split("/");
        for (let i = 1; i <= parts.length; i++) {
          allFolders.add(parts.slice(0, i).join("/"));
        }
      }
    }

    const topLevel: string[] = [];
    const byParent: Record<string, string[]> = {};

    for (const folder of allFolders) {
      const parts = folder.split("/");
      if (parts.length === 1) {
        topLevel.push(folder);
      } else {
        const parent = parts.slice(0, -1).join("/");
        byParent[parent] = byParent[parent] || [];
        byParent[parent].push(folder);
      }
    }

    return { topLevel: topLevel.sort(), byParent };
  }, [sessionIds, store]);
}

function useFolderName(folderId: string) {
  return useMemo(() => {
    const parts = folderId.split("/");
    return parts[parts.length - 1] || "Untitled";
  }, [folderId]);
}

export const TabItemFolder: TabItem<Extract<Tab, { type: "folders" }>> = (
  props,
) => {
  if (props.tab.type === "folders" && props.tab.id === null) {
    return <TabItemFolderAll {...props} />;
  }

  if (props.tab.type === "folders" && props.tab.id !== null) {
    return <TabItemFolderSpecific {...props} />;
  }

  return null;
};

const TabItemFolderAll: TabItem<Extract<Tab, { type: "folders" }>> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseAll,
  handleCloseOthers,
  handlePinThis,
  handleUnpinThis,
}) => {
  return (
    <TabItemBase
      icon={<FoldersIcon className="h-4 w-4" />}
      title={"Folders"}
      selected={tab.active}
      pinned={tab.pinned}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
      handlePinThis={() => handlePinThis(tab)}
      handleUnpinThis={() => handleUnpinThis(tab)}
    />
  );
};

const TabItemFolderSpecific: TabItem<Extract<Tab, { type: "folders" }>> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
  handlePinThis,
  handleUnpinThis,
}) => {
  const folderId = tab.id!;
  const folders = useFolderChain(folderId);
  const name = useFolderName(folderId);
  const repeatCount = Math.max(0, folders.length - 1);
  const title = " .. / ".repeat(repeatCount) + name;

  return (
    <TabItemBase
      icon={<FolderIcon className="h-4 w-4" />}
      title={title}
      selected={tab.active}
      pinned={tab.pinned}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
      handlePinThis={() => handlePinThis(tab)}
      handleUnpinThis={() => handleUnpinThis(tab)}
    />
  );
};

export function TabContentFolder({ tab }: { tab: Tab }) {
  if (tab.type !== "folders") {
    return null;
  }

  return (
    <StandardTabWrapper>
      {tab.id === null
        ? <TabContentFolderTopLevel />
        : <TabContentFolderSpecific folderId={tab.id} />}
    </StandardTabWrapper>
  );
}

function TabContentFolderTopLevel() {
  const { topLevel: topLevelFolderIds } = useFolderTree();

  return (
    <div className="flex flex-col gap-6">
      <Section
        icon={<FolderIcon className="h-4 w-4" />}
        title="Folders"
        action={<NewFolderButton />}
      >
        {topLevelFolderIds.length > 0
          ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {topLevelFolderIds.map((folderId) => (
                <FolderCard key={folderId} folderId={folderId} />
              ))}
            </div>
          )
          : <FoldersEmptyState />}
      </Section>
    </div>
  );
}

function TabContentFolderSpecific({ folderId }: { folderId: string }) {
  const { byParent } = useFolderTree();
  const childFolderIds = byParent[folderId] || [];

  const sessionIds = main.UI.useSliceRowIds(
    main.INDEXES.sessionsByFolder,
    folderId,
    main.STORE_ID,
  );
  const hasNotes = (sessionIds?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      <TabContentFolderBreadcrumb folderId={folderId} />

      <Section
        icon={<FolderIcon className="h-4 w-4" />}
        title="Folders"
        action={<NewFolderButton parentFolderId={folderId} />}
      >
        {childFolderIds.length > 0
          ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {childFolderIds.map((childId) => (
                <FolderCard key={childId} folderId={childId} />
              ))}
            </div>
          )
          : (
            <p className="text-char-muted-soft px-1 py-2 text-xs">
              No subfolders
            </p>
          )}
      </Section>

      <Section icon={<StickyNoteIcon className="h-4 w-4" />} title="Notes">
        {hasNotes
          ? (
            <div className="flex flex-col gap-2">
              {sessionIds!.map((sessionId) => (
                <FolderSessionItem key={sessionId} sessionId={sessionId} />
              ))}
            </div>
          )
          : (
            <p className="text-char-muted-soft px-1 py-2 text-xs">
              No notes here yet — drag a note onto this folder, or move one in
              from its ⋮ menu.
            </p>
          )}
      </Section>
    </div>
  );
}

function TabContentFolderBreadcrumb({ folderId }: { folderId: string }) {
  const openCurrent = useTabs((state) => state.openCurrent);

  return (
    <FolderBreadcrumb
      folderId={folderId}
      renderBefore={() => (
        <button
          onClick={() => openCurrent({ type: "folders", id: null })}
          className="hover:text-foreground"
        >
          <FoldersIcon className="h-4 w-4" />
        </button>
      )}
      renderCrumb={({ id, name, isLast }) => (
        <button
          onClick={() => !isLast && openCurrent({ type: "folders", id })}
          className={isLast
            ? "text-foreground font-medium"
            : "hover:text-foreground"}
        >
          {name}
        </button>
      )}
    />
  );
}

function FolderCard({ folderId }: { folderId: string }) {
  const name = useFolderName(folderId);
  const openCurrent = useTabs((state) => state.openCurrent);
  const { byParent } = useFolderTree();
  const store = main.UI.useStore(main.STORE_ID);
  const indexes = main.UI.useIndexes(main.STORE_ID);

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const [isDragOver, setIsDragOver] = useState(false);

  const childFolderIds = byParent[folderId] || [];
  const sessionIds = main.UI.useSliceRowIds(
    main.INDEXES.sessionsByFolder,
    folderId,
    main.STORE_ID,
  );
  const childCount = childFolderIds.length + (sessionIds?.length ?? 0);

  const handleRename = useCallback(async () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === name) {
      setEditValue(name);
      setIsEditing(false);
      return;
    }

    const parts = folderId.split("/");
    parts[parts.length - 1] = trimmed;
    const newFolderId = parts.join("/");

    const result = await sessionOps.renameFolder(folderId, newFolderId);
    if (result.status === "error") {
      setEditValue(name);
    }
    setIsEditing(false);
  }, [editValue, name, folderId]);

  const handleDelete = useCallback(async () => {
    if (!store) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${name}" and everything inside it? This can't be undone.`,
    );
    if (!confirmed) {
      return;
    }

    const prefix = folderId + "/";
    const ids = store.getRowIds("sessions").filter((id) => {
      const fid = store.getCell("sessions", id, "folder_id") as
        | string
        | undefined;
      return fid === folderId || fid?.startsWith(prefix);
    });

    for (const id of ids) {
      deleteSessionCascade(store, indexes, id);
    }

    await fsSyncCommands.deleteFolder(folderId);
    openCurrent({ type: "folders", id: null });
  }, [store, indexes, folderId, name, openCurrent]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const dropped = e.dataTransfer.getData(SESSION_DND);
      if (dropped) {
        await sessionOps.moveSessionToFolder(dropped, folderId);
      }
    },
    [folderId],
  );

  return (
    <div
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(SESSION_DND)) {
          e.preventDefault();
          setIsDragOver(true);
        }
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => {
        if (!isEditing) {
          openCurrent({ type: "folders", id: folderId });
        }
      }}
      className={cn([
        "group relative flex cursor-pointer flex-col gap-3 rounded-xl border p-4",
        "bg-char-card/40 transition-all duration-150 hover:bg-char-card hover:shadow-sm",
        isDragOver && "border-primary ring-primary/40 bg-primary/5 ring-2",
      ])}
    >
      <div className="flex items-start justify-between">
        <FolderIcon
          className={cn([
            "h-9 w-9 transition-colors",
            isDragOver ? "text-primary" : "text-char-muted-soft",
          ])}
        />
        <RowMenu>
          <DropdownMenuItem
            onSelect={() => {
              setEditValue(name);
              setIsEditing(true);
            }}
          >
            <PencilIcon className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={handleDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2Icon className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </RowMenu>
      </div>

      {isEditing
        ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleRename();
              } else if (e.key === "Escape") {
                setEditValue(name);
                setIsEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            className={cn([
              "w-full rounded-md border bg-background px-2 py-1 text-sm font-medium",
              "outline-none focus:border-ring focus:ring-1 focus:ring-ring",
            ])}
          />
        )
        : (
          <div className="flex flex-col gap-0.5">
            <span className="text-char-ink truncate text-sm font-medium">
              {name}
            </span>
            <span className="text-char-muted-soft text-xs">
              {childCount === 0
                ? "Empty"
                : `${childCount} item${childCount === 1 ? "" : "s"}`}
            </span>
          </div>
        )}
    </div>
  );
}

function FolderSessionItem({ sessionId }: { sessionId: string }) {
  const session = useSession(sessionId);
  const store = main.UI.useStore(main.STORE_ID);
  const indexes = main.UI.useIndexes(main.STORE_ID);
  const openCurrent = useTabs((state) => state.openCurrent);
  const openNew = useTabs((state) => state.openNew);
  const invalidateResource = useTabs((state) => state.invalidateResource);
  const addDeletion = useUndoDelete((state) => state.addDeletion);
  const [moveOpen, setMoveOpen] = useState(false);

  const createdAt = main.UI.useCell(
    "sessions",
    sessionId,
    "created_at",
    main.STORE_ID,
  ) as string | undefined;

  const displayDate = useMemo(() => {
    const d = safeParseDate(createdAt);
    return d ? format(d, "MMM d, yyyy") : "";
  }, [createdAt]);

  const handleDelete = useCallback(() => {
    if (!store) {
      return;
    }

    const captured = captureSessionData(store, indexes, sessionId);
    invalidateResource("sessions", sessionId);
    void deleteSessionCascade(store, indexes, sessionId, { skipAudio: true });

    if (captured) {
      addDeletion(captured, () => {
        void fsSyncCommands.audioDelete(sessionId);
      });
    }
  }, [store, indexes, sessionId, invalidateResource, addDeletion]);

  return (
    <>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(SESSION_DND, sessionId);
          e.dataTransfer.effectAllowed = "move";
        }}
        onClick={() => openCurrent({ type: "sessions", id: sessionId })}
        className={cn([
          "group flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5",
          "bg-char-card/40 transition-all duration-150 hover:bg-char-card hover:shadow-sm",
          "active:cursor-grabbing",
        ])}
      >
        <StickyNoteIcon className="text-char-muted-soft h-4 w-4 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-char-ink truncate text-sm font-medium">
            {session.title || "Untitled"}
          </span>
          {displayDate && (
            <span className="text-char-muted-soft text-xs">{displayDate}</span>
          )}
        </div>
        <RowMenu>
          <DropdownMenuItem
            onSelect={() => openNew({ type: "sessions", id: sessionId })}
          >
            <ExternalLinkIcon className="mr-2 h-4 w-4" />
            Open in new tab
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setMoveOpen(true)}>
            <FolderInputIcon className="mr-2 h-4 w-4" />
            Move to folder…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={handleDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2Icon className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </RowMenu>
      </div>
      <MoveToFolderDialog
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        sessionId={sessionId}
      />
    </>
  );
}

// Shared hover-revealed "⋮" menu for folder cards and note rows.
function RowMenu({ children }: { children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn([
            "rounded-md p-1 opacity-0 transition-opacity",
            "text-char-muted-soft hover:bg-background hover:text-char-ink",
            "group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100",
          ])}
        >
          <MoreVerticalIcon className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NewFolderButton({ parentFolderId }: { parentFolderId?: string }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const store = main.UI.useStore(main.STORE_ID);
  const openCurrent = useTabs((state) => state.openCurrent);
  const { topLevel, byParent } = useFolderTree();

  const reset = useCallback(() => {
    setCreating(false);
    setName("");
    setError(null);
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      reset();
      return;
    }
    if (!store) {
      return;
    }
    if (trimmed.includes("/")) {
      setError("Folder names can't contain “/”.");
      return;
    }

    const siblings = parentFolderId ? byParent[parentFolderId] || [] : topLevel;
    const folderId = parentFolderId ? `${parentFolderId}/${trimmed}` : trimmed;
    if (siblings.includes(folderId)) {
      setError("A folder with that name already exists here.");
      return;
    }

    createSession(store, "Untitled", folderId);
    openCurrent({ type: "folders", id: folderId });
    reset();
  }, [name, store, parentFolderId, byParent, topLevel, openCurrent, reset]);

  if (creating) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5 rounded-md border bg-background px-2 py-1">
          <FolderIcon className="text-char-muted-soft h-3.5 w-3.5 shrink-0" />
          <input
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
              if (e.key === "Escape") reset();
            }}
            onBlur={handleSubmit}
            placeholder="Folder name"
            className="w-32 bg-transparent text-xs outline-none"
          />
        </div>
        {error && <span className="text-destructive text-[10px]">{error}</span>}
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setCreating(true)}
      className="text-char-muted-soft hover:text-char-ink gap-1 px-2"
    >
      <PlusIcon className="h-3.5 w-3.5" />
      New Folder
    </Button>
  );
}

function FoldersEmptyState() {
  return (
    <div className="border-char-line flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center">
      <FoldersIcon className="text-char-muted-soft/50 h-10 w-10" />
      <p className="text-char-ink text-sm font-medium">No folders yet</p>
      <p className="text-char-muted-soft text-xs">
        Create a folder, then drag notes into it to stay organized.
      </p>
    </div>
  );
}
