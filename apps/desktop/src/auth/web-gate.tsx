import { CheckCircle2Icon, MailIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Label } from "@hypr/ui/components/ui/label";
import { Spinner } from "@hypr/ui/components/ui/spinner";

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
    <div className="bg-background relative flex h-full w-full items-center justify-center overflow-hidden p-6">
      <div className="bg-primary/10 pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl" />

      <div className="animate-in fade-in-0 zoom-in-95 relative w-full max-w-sm duration-300">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-2xl font-mono text-xl font-semibold">
            {"{ }"}
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome to Char
            </h1>
            <p className="text-muted-foreground text-sm">
              Your notes, goals, and meetings — synced everywhere.
            </p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border p-6 shadow-sm">
          {status === "sent"
            ? (
              <div className="flex flex-col items-center gap-4 py-2 text-center">
                <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full">
                  <CheckCircle2Icon className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">Check your inbox</p>
                  <p className="text-muted-foreground text-sm">
                    We sent a magic link to{" "}
                    <span className="text-foreground font-medium">
                      {email.trim()}
                    </span>. Open it on this device to finish signing in.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatus("idle");
                    setError(null);
                  }}
                >
                  Use a different email
                </Button>
              </div>
            )
            : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <MailIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      placeholder="you@example.com"
                      className="pl-9"
                    />
                  </div>
                </div>

                {error && (
                  <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-xs">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full"
                >
                  {status === "sending"
                    ? (
                      <>
                        <Spinner size={16} />
                        Sending…
                      </>
                    )
                    : "Continue with email"}
                </Button>

                <p className="text-muted-foreground text-center text-xs">
                  No password needed. New here? Your account is created
                  automatically.
                </p>
              </form>
            )}
        </div>

        <p className="text-muted-foreground/70 mt-6 text-center text-xs">
          Private by design — your notes stay yours.
        </p>
      </div>
    </div>
  );
}
