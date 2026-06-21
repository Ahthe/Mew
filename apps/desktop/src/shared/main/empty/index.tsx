import { AppWindowIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { MorningBrief } from "../morning-brief";
import { useNewNote } from "../useNewNote";
import { OpenNoteDialog } from "./open-note-dialog";

import { StandardTabWrapper } from "~/shared/main";
import { type TabItem, TabItemBase } from "~/shared/tabs";
import { type Tab, useTabs } from "~/store/zustand/tabs";

export const TabItemEmpty: TabItem<Extract<Tab, { type: "empty" }>> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
  handlePinThis,
  handleUnpinThis,
}) => {
  return (
    <TabItemBase
      icon={<AppWindowIcon className="h-4 w-4" />}
      title="New tab"
      selected={tab.active}
      allowPin={false}
      isEmptyTab
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

export function TabContentEmpty({
  tab: _tab,
}: {
  tab: Extract<Tab, { type: "empty" }>;
}) {
  return (
    <StandardTabWrapper>
      <EmptyView />
    </StandardTabWrapper>
  );
}

function EmptyView() {
  const newNote = useNewNote({ behavior: "current" });
  const openCurrent = useTabs((state) => state.openCurrent);
  const [openNoteDialogOpen, setOpenNoteDialogOpen] = useState(false);

  const openCalendar = useCallback(
    () => openCurrent({ type: "calendar" }),
    [openCurrent],
  );
  const openContacts = useCallback(
    () => openCurrent({ type: "contacts" }),
    [openCurrent],
  );
  const openSettings = useCallback(
    () => openCurrent({ type: "settings" }),
    [openCurrent],
  );
  const openAiSettings = useCallback(
    () => openCurrent({ type: "ai" }),
    [openCurrent],
  );
  const openAdvancedSearch = useCallback(
    () => openCurrent({ type: "search" }),
    [openCurrent],
  );
  const openSession = useCallback(
    (id: string) => openCurrent({ type: "sessions", id }),
    [openCurrent],
  );

  useHotkeys(
    "mod+o",
    () => setOpenNoteDialogOpen(true),
    { preventDefault: true, enableOnFormTags: true },
    [setOpenNoteDialogOpen],
  );

  return (
    <>
      <MorningBrief
        actions={{
          newNote,
          openCalendar,
          openContacts,
          openSettings,
          openAiSettings,
          openAdvancedSearch,
        }}
        openSession={openSession}
      />
      <OpenNoteDialog
        open={openNoteDialogOpen}
        onOpenChange={setOpenNoteDialogOpen}
      />
    </>
  );
}
