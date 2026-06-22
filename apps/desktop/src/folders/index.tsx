import {
  FolderIcon,
  FoldersIcon,
  PlusIcon,
  StickyNoteIcon,
  Trash2Icon,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";
import { cn } from "@hypr/utils";

import { Section } from "./shared";

import { StandardTabWrapper } from "~/shared/main";
import { type TabItem, TabItemBase } from "~/shared/tabs";
import {
  FolderBreadcrumb,
  useFolderChain,
} from "~/shared/ui/folder-breadcrumb";
import { useSession } from "~/store/tinybase/hooks";
import { sessionOps } from "~/store/tinybase/persister/session/ops";
import { deleteSessionCascade } from "~/store/tinybase/store/deleteSession";
import * as main from "~/store/tinybase/store/main";
import { createSession } from "~/store/tinybase/store/sessions";
import { type Tab, useTabs } from "~/store/zustand/tabs";

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
      {tab.id === null ? (
        <TabContentFolderTopLevel />
      ) : (
        <TabContentFolderSpecific folderId={tab.id} />
      )}
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
            <div className="grid grid-cols-4 gap-4">
              {topLevelFolderIds.map((folderId) => (
                <FolderCard key={folderId} folderId={folderId} />
              ))}
            </div>
          )
          : (
            <div className="flex flex-col items-center gap-1 py-10 text-center">
              <FoldersIcon className="text-muted-foreground/60 h-8 w-8" />
              <p className="text-muted-foreground text-sm">
                No folders yet
              </p>
              <p className="text-muted-foreground/70 text-xs">
                Use “New Folder” above to start organizing your notes.
              </p>
            </div>
          )}
      </Section>
    </div>
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

  const handleDelete = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
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
      const sessionIdsToDelete = store
        .getRowIds("sessions")
        .filter((id) => {
          const fid = store.getCell("sessions", id, "folder_id") as
            | string
            | undefined;
          return fid === folderId || fid?.startsWith(prefix);
        });

      for (const id of sessionIdsToDelete) {
        deleteSessionCascade(store, indexes, id);
      }

      await fsSyncCommands.deleteFolder(folderId);
      openCurrent({ type: "folders", id: null });
    },
    [store, indexes, folderId, name, openCurrent],
  );

  return (
    <div
      className={cn([
        "group relative flex flex-col items-center justify-center",
        "hover:bg-muted cursor-pointer gap-2 rounded-lg border p-6",
      ])}
      onClick={() => {
        if (!isEditing) {
          openCurrent({ type: "folders", id: folderId });
        }
      }}
    >
      <button
        type="button"
        onClick={handleDelete}
        title="Delete folder"
        className={cn([
          "absolute right-2 top-2 rounded-md p-1 opacity-0 transition-opacity",
          "text-muted-foreground hover:bg-background hover:text-destructive",
          "group-hover:opacity-100",
        ])}
      >
        <Trash2Icon className="h-4 w-4" />
      </button>
      <FolderIcon className="text-muted-foreground h-12 w-12" />
      {isEditing ? (
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
            "w-full text-center text-sm font-medium",
            "border-none bg-transparent focus:underline focus:outline-hidden",
          ])}
        />
      ) : (
        <span
          className="text-center text-sm font-medium"
          onClick={(e) => {
            e.stopPropagation();
            setEditValue(name);
            setIsEditing(true);
          }}
        >
          {name}
        </span>
      )}
      {childCount > 0 && (
        <span className="text-muted-foreground text-xs">
          {childCount} items
        </span>
      )}
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

  const isEmpty =
    childFolderIds.length === 0 && (sessionIds?.length ?? 0) === 0;

  return (
    <div className="flex flex-col gap-6">
      <TabContentFolderBreadcrumb folderId={folderId} />

      <Section
        icon={<FolderIcon className="h-4 w-4" />}
        title="Folders"
        action={<NewFolderButton parentFolderId={folderId} />}
      >
        {childFolderIds.length > 0 && (
          <div className="grid grid-cols-4 gap-4">
            {childFolderIds.map((childId) => (
              <FolderCard key={childId} folderId={childId} />
            ))}
          </div>
        )}
      </Section>

      {!isEmpty && (
        <Section icon={<StickyNoteIcon className="h-4 w-4" />} title="Notes">
          {(sessionIds?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-2">
              {sessionIds!.map((sessionId) => (
                <FolderSessionItem key={sessionId} sessionId={sessionId} />
              ))}
            </div>
          )}
        </Section>
      )}
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
          className={
            isLast ? "text-foreground font-medium" : "hover:text-foreground"
          }
        >
          {name}
        </button>
      )}
    />
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
        <div className="flex items-center gap-1.5 rounded-md border px-2 py-1">
          <FolderIcon className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
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
            className="w-28 bg-transparent text-xs outline-none"
          />
        </div>
        {error && (
          <span className="text-destructive text-[10px]">{error}</span>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setCreating(true)}
      className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
    >
      <PlusIcon className="h-3.5 w-3.5" />
      New Folder
    </button>
  );
}

function FolderSessionItem({ sessionId }: { sessionId: string }) {
  const session = useSession(sessionId);
  const openCurrent = useTabs((state) => state.openCurrent);

  return (
    <div
      className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2"
      onClick={() => openCurrent({ type: "sessions", id: sessionId })}
    >
      <StickyNoteIcon className="text-muted-foreground h-4 w-4" />
      <span className="text-sm">{session.title || "Untitled"}</span>
    </div>
  );
}
