import { MaximizeIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@hypr/utils";

import { CharlieBar } from "~/chat/components/charlie-bar";

export interface ArtifactData {
  id: string;
  title: string;
  kind: "document" | "pricing" | "checklist";
  content?: string;
}

// TODO(phase2): replace mock with real artifact loaded from TinyBase
const MOCK_ARTIFACT: ArtifactData = {
  id: "mock-pricing",
  title: "Pricing plan exploration",
  kind: "pricing",
};

function PricingBody() {
  const plans = [
    {
      name: "Solo",
      price: "$9",
      features: ["1 user", "Unlimited notes", "10 delegations / mo"],
    },
    {
      name: "Pro",
      price: "$19",
      features: ["Up to 5 users", "Unlimited notes", "100 delegations / mo"],
      highlight: true,
    },
    {
      name: "Team",
      price: "$49",
      features: ["Unlimited users", "Shared memory", "Unlimited delegations"],
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-[11px] tracking-wider uppercase text-char-muted-soft">
        Recommended launch set
      </p>
      <div className="grid grid-cols-3 gap-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={cn([
              "flex flex-col gap-2 rounded-xl border p-4",
              plan.highlight
                ? "border-char-coral/30 bg-char-coral/5"
                : "border-char-line bg-char-card",
            ])}
          >
            <div className="font-mono text-xs text-char-muted">{plan.name}</div>
            <div className="text-2xl font-bold text-char-ink">{plan.price}</div>
            <ul className="flex flex-col gap-1">
              {plan.features.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-1.5 text-xs text-char-muted"
                >
                  <span className="size-1 rounded-full bg-char-faint" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-char-line p-4">
        <p className="mb-2 font-mono text-[11px] tracking-wider uppercase text-char-muted-soft">
          Notes
        </p>
        <ul className="flex flex-col gap-1.5 text-sm text-char-muted">
          <li>
            • Annual billing saves 20% — consider making it the default CTA
          </li>
          <li>
            • Team plan could include API access to differentiate from Pro
          </li>
          <li>• Add a free tier to reduce activation friction</li>
        </ul>
      </div>
    </div>
  );
}

function ArtifactModalInner({
  artifact,
  onClose,
}: {
  artifact: ArtifactData;
  onClose: () => void;
}) {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cn([
        "relative flex flex-col overflow-hidden rounded-2xl border border-char-line bg-char-card shadow-2xl",
        fullscreen ? "fixed inset-4 z-[60]" : "max-h-[80vh] w-[560px]",
      ])}
    >
      <div className="flex items-center justify-between border-b border-char-line px-5 py-3">
        <button
          onClick={() => setFullscreen((v) => !v)}
          className="rounded-md p-1 text-char-faint transition-colors hover:text-char-muted"
        >
          <MaximizeIcon className="size-4" />
        </button>
        <h2 className="flex-1 px-4 font-mono text-sm font-semibold text-char-ink">
          {"📄"} {artifact.title}
        </h2>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-char-faint transition-colors hover:text-char-muted"
        >
          <XIcon className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {artifact.kind === "pricing" && <PricingBody />}
        {artifact.kind === "document" && (
          <p className="text-sm text-char-muted">{artifact.content}</p>
        )}
      </div>

      <div className="border-t border-char-line p-3">
        <CharlieBar
          prefilledContext={artifact.title}
          // TODO(phase2): wire onSend to real chat actions scoped to this artifact
        />
      </div>
    </motion.div>
  );
}

export function ArtifactModal({
  open,
  onClose,
  artifact = MOCK_ARTIFACT,
}: {
  open: boolean;
  onClose: () => void;
  artifact?: ArtifactData;
}) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="relative z-10">
            <ArtifactModalInner artifact={artifact} onClose={onClose} />
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
