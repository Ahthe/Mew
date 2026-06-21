import { useQuery } from "@tanstack/react-query";
import { AxeIcon, FolderIcon, PanelLeftCloseIcon } from "lucide-react";
import { lazy, Suspense, useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { Kbd } from "@hypr/ui/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/utils";

import { ProfileSection } from "./profile";
import { TimelineView } from "./timeline";
import { ToastArea } from "./toast";

import { useShell } from "~/contexts/shell";
import { SearchResults } from "~/search/components/sidebar";
import { useSearch } from "~/search/contexts/ui";
import { TrafficLights } from "~/shared/ui/traffic-lights";
import { useTabs } from "~/store/zustand/tabs";
import { commands } from "~/types/tauri.gen";

const DevtoolView = lazy(() =>
  import("./devtool").then((m) => ({ default: m.DevtoolView })),
);

export function LeftSidebar() {
  const { leftsidebar } = useShell();
  const { query } = useSearch();
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  const openCurrent = useTabs((state) => state.openCurrent);

  const { data: showDevtoolButton = false } = useQuery({
    queryKey: ["show_devtool"],
    queryFn: () => commands.showDevtool(),
  });

  const showSearchResults = query.trim() !== "";

  return (
    <div className="flex h-full w-70 shrink-0 flex-col gap-1 overflow-hidden">
      <header
        data-tauri-drag-region
        className={cn([
          "flex flex-row items-center",
          "h-9 w-full py-1",
          "justify-between px-3",
          "shrink-0",
          "rounded-xl bg-char-sidebar",
        ])}
      >
        <TrafficLights />
        <div className="flex items-center">
          {showDevtoolButton && (
            <Button
              size="icon"
              variant="ghost"
              onClick={leftsidebar.toggleDevtool}
            >
              <AxeIcon size={16} />
            </Button>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={leftsidebar.toggleExpanded}
              >
                <PanelLeftCloseIcon size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="flex items-center gap-2">
              <span>Toggle sidebar</span>
              <Kbd className="animate-kbd-press">⌘ \</Kbd>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-1 overflow-hidden">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {leftsidebar.showDevtool ? (
            <Suspense fallback={null}>
              <DevtoolView />
            </Suspense>
          ) : showSearchResults ? (
            <SearchResults />
          ) : (
            <TimelineView />
          )}
          {!leftsidebar.showDevtool && (
            <ToastArea isProfileExpanded={isProfileExpanded} />
          )}
        </div>
        <button
          onClick={() => openCurrent({ type: "folders", id: null })}
          className={cn([
            "mx-1 flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5",
            "text-sm text-char-muted hover:bg-char-selected hover:text-char-ink",
          ])}
        >
          <FolderIcon size={14} />
          <span>Folders</span>
        </button>
        <div className="relative z-30">
          <ProfileSection onExpandChange={setIsProfileExpanded} />
        </div>
      </div>
    </div>
  );
}
