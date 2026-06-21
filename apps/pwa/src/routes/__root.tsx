import {
  createRootRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { PenSquare, Target } from "lucide-react";
import { lazy, Suspense } from "react";

import { QUERIES, STORE_ID, UI } from "~/store";

export const Route = createRootRoute({
  component: Root,
});

function Root() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (pathname.startsWith("/auth")) {
    return (
      <div className="flex h-full items-center justify-center bg-char-canvas">
        <Outlet />
        <DevTools />
      </div>
    );
  }

  return (
    <div className="flex h-full gap-1 overflow-hidden bg-char-canvas p-1">
      <Sidebar />
      <main className="relative flex flex-1 flex-col overflow-hidden rounded-xl border border-char-line bg-char-card">
        <Outlet />
      </main>
      <DevTools />
    </div>
  );
}

function Sidebar() {
  const sessions = UI.useResultTable(QUERIES.activeSessions, STORE_ID);
  const store = UI.useStore(STORE_ID);
  const navigate = useNavigate();

  const sessionEntries = Object.entries(sessions).sort(([, a], [, b]) =>
    (b.created_at ?? "").localeCompare(a.created_at ?? ""),
  );

  function createSession() {
    const id = crypto.randomUUID();
    store?.setRow("sessions", id, {
      user_id: (store.getValue("user_id") as string) ?? "",
      title: "Untitled",
      created_at: new Date().toISOString(),
      folder_id: "",
      event_json: "",
      raw_md: "",
    });
    void navigate({ to: "/sessions/$sessionId", params: { sessionId: id } });
  }

  return (
    <div className="flex h-full w-70 shrink-0 flex-col gap-1 overflow-hidden">
      {/* Header bar */}
      <div className="flex h-9 shrink-0 items-center justify-between rounded-xl bg-char-sidebar px-3">
        <span className="text-xs font-semibold text-char-ink">Notes</span>
        <button
          onClick={createSession}
          title="New note"
          className="flex h-6 w-6 items-center justify-center rounded-md text-char-muted hover:bg-char-selected hover:text-char-ink transition-colors"
        >
          <PenSquare size={13} />
        </button>
      </div>

      {/* Session list + Goals nav */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl bg-char-sidebar">
        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto px-1 pt-1 [scrollbar-width:none]">
          {sessionEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-char-muted">
              <p className="text-xs">No notes yet</p>
              <button
                onClick={createSession}
                className="text-xs underline underline-offset-2 hover:text-char-ink transition-colors"
              >
                Create one
              </button>
            </div>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {sessionEntries.map(([id, session]) => (
                <li key={id}>
                  <Link
                    to="/sessions/$sessionId"
                    params={{ sessionId: id }}
                    className="flex flex-col gap-0.5 rounded-lg px-2 py-2 transition-colors hover:bg-char-selected"
                    activeProps={{ className: "bg-char-selected" }}
                  >
                    <span className="truncate text-xs font-medium text-char-ink">
                      {session.title || "Untitled"}
                    </span>
                    <span className="text-[10px] text-char-muted">
                      {formatDate(session.created_at ?? "")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Goals nav */}
        <div className="shrink-0 border-t border-char-line px-1 pb-1 pt-1">
          <Link
            to="/goals"
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-char-muted transition-colors hover:bg-char-selected hover:text-char-ink"
            activeProps={{ className: "bg-char-selected text-char-ink" }}
          >
            <Target size={13} />
            <span>Goals</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

const TanStackRouterDevtools =
  import.meta.env.PROD
    ? () => null
    : lazy(() =>
        import("@tanstack/react-router-devtools").then((m) => ({
          default: m.TanStackRouterDevtools,
        })),
      );

function DevTools() {
  return (
    <Suspense>
      <TanStackRouterDevtools position="bottom-right" />
    </Suspense>
  );
}
