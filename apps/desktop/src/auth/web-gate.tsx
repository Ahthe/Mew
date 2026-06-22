import { useState } from "react";

import { IS_WEB, supabase } from "./client";
import { useAuth } from "./context";

// In the browser the desktop OAuth deep-link flow can't run, so gate the app
// behind a passwordless magic-link sign-in. On native (Tauri) this renders
// children unchanged. A missing Supabase config also passes through so the app
// stays usable locally.
export function WebAuthGate({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();

  if (!IS_WEB || !supabase || session) {
    return <>{children}</>;
  }

  return <MagicLinkScreen />;
}

function MagicLinkScreen() {
  const { signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      return;
    }

    setStatus("sending");
    setError(null);

    const { error: authError } = await signInWithMagicLink(trimmed);
    if (authError) {
      setError(authError);
      setStatus("idle");
      return;
    }

    setStatus("sent");
  }

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-8 shadow-lg">
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold">Sign in to Char</h1>
          <p className="text-sm text-muted-foreground">
            Get a one-time magic link by email — no password to remember. New
            here? The same link creates your account.
          </p>
        </div>

        {status === "sent"
          ? (
            <div className="space-y-3">
              <p className="rounded-md bg-muted px-3 py-3 text-sm">
                Check your inbox — we sent a sign-in link to{" "}
                <span className="font-medium">{email.trim()}</span>. Open it on
                this device to finish signing in.
              </p>
              <button
                onClick={() => {
                  setStatus("idle");
                  setError(null);
                }}
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Use a different email
              </button>
            </div>
          )
          : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
                  placeholder="you@example.com"
                />
              </div>

              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {status === "sending" ? "Sending…" : "Send magic link"}
              </button>
            </form>
          )}
      </div>
    </div>
  );
}
