import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/sessions/")({
  component: SessionsEmptyPage,
});

function SessionsEmptyPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-char-muted">
      <FileText size={32} strokeWidth={1.2} className="text-char-faint" />
      <p className="text-sm">Select a note to start writing</p>
    </div>
  );
}
