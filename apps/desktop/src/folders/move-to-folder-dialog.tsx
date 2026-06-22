import { FolderIcon, FolderInputIcon, PlusIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

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

import { sessionOps } from "~/store/tinybase/persister/session/ops";
import * as main from "~/store/tinybase/store/main";

// Searchable "move note → folder" palette: pick an existing folder, jump to the
// top level, or type a brand-new folder name to create-and-move in one step.
export function MoveToFolderDialog({
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
    if (!store || !sessionIds) {
      return {} as Record<string, string>;
    }
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
      setSearch("");
      onClose();
    },
    [sessionId, onClose],
  );

  const trimmed = search.trim();
  const exactMatch = Object.entries(folders).some(
    ([fid, name]) =>
      fid === trimmed || name.toLowerCase() === trimmed.toLowerCase(),
  );
  const showCreate = trimmed.length > 0 && !trimmed.includes("/") && !exactMatch;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xs p-0">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="text-sm font-medium">
            Move to folder
          </DialogTitle>
        </DialogHeader>
        <Command>
          <CommandInput
            placeholder="Search or type a new folder…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {trimmed ? null : "No folders yet — type a name to create one."}
            </CommandEmpty>
            <CommandGroup>
              <CommandItem value="__root__" onSelect={() => handleMove("")}>
                <FolderInputIcon className="mr-2 h-4 w-4" />
                No folder (top level)
              </CommandItem>
              {Object.entries(folders).map(([fid, name]) => (
                <CommandItem
                  key={fid}
                  value={name}
                  onSelect={() => handleMove(fid)}
                >
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
