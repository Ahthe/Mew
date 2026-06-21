# Char Redesign — UI/UX Alignment & Functional Roadmap

> Goal: make this desktop app look, feel, and behave like **Char** (char.com) — the
> "AI notepad that gets things done," with its embedded agent **Charlie**.
>
> This document is split into three parts:
>
> - **Phase 1 — UI/UX.** Make the existing app *visually and interactively* match Char.
>   No new backend intelligence required — this is presentation, components, motion,
>   and the *affordances* for Char's signature interactions.
> - **The Phase System — Goals · Sections · Heatmaps.** A goal-and-consistency layer:
>   tag a note heading to a goal, and completing the tasks beneath it fills a
>   habitkit-style heatmap — *Activity Rings for knowledge work*. Independent of
>   Phase 1/2; ships in parallel.
> - **Phase 2 — Functionality.** Build the engine behind those affordances:
>   delegation, artifacts, context preservation, memory, daily briefs, recurrence.
>
> All file paths below are relative to the repo root (the folder containing `AGENTS.md`,
> i.e. `apps/desktop/...` and `packages/...`).

---

## 0. Design language reference (the target)

Distilled from the `inspiration/` screenshots (`ui-1.png` … `ui-9.png`,
`ui-more examples*.png`) and char.com.

**Product concept.** A single, free-form **daily note**. You write naturally; Charlie
reads the note inline and turns *intent into work*. The hero idea (from `ui-more
examples.png`): _"When a note turns into work, do not make another checkbox. Click
**delegate** and Char carries the links, tags, and intent with it."_

**Brand mark.** `{ }` (curly braces) is **Charlie's** glyph. It precedes every
assistant surface: `{ } Ask Charlie`, `{ } Tomorrow plan`, the composer button.

**Typography — the most visible gap.**
- **Body / prose:** clean humanist sans (our SF Pro is correct).
- **Monospace:** Char uses **monospace for assistant + structured surfaces** —
  artifact titles ("`Pricing plan exploration`"), section headers ("`Recommended
  launch set`"), the `{ }` mark, the "`Ask Charlie`" label, inline code, and
  `#hashtags`. **We currently ship no monospace font at all.** This is the single
  biggest typographic miss.
- **Serif:** Char uses serif only for large editorial display text (the marketing
  "Let AI do the work." headline). We already have Lora for note titles — keep it
  for the note title, but artifact/assistant chrome must be mono, not serif.

**Color.**
- Canvas is warm off-white; cards pure white (we already have `--color-char-canvas`
  `#f4efe9` / `--color-char-card` `#ffffff`).
- **Coral** `#ff5f57` = primary accent (date badge, people names).
- **Blue** `#2d7ff9` = links + checked checkboxes.
- **People @mentions render in coral/red** with a tiny circular initial avatar
  (`A`, `S`, `Y`), not multicolor facehashes.
- **#hashtags render violet/purple** and **monospace** (Char shows `#launch` in a
  purple, code-like style), not amber sans.
- **Assistant overlays are near-black** (`~#1a1a1a`): the floating command bar and
  the "Tomorrow plan" card are dark with white text — a deliberate inversion against
  the light canvas.

**Signature interactions.**
1. **Delegate.** Hover any task row → a **`Delegate` pill** slides in at the right
   end of the row (`ui-2`, `ui-more examples`). Click → **`thinking…`** chip with a
   shimmer over the row (`ui-3`) → Charlie **reveals** generated content with a
   left-to-right blur/clip wipe (`ui-4`), optionally spawning **nested sub-tasks**
   (indented, with a left rule — `ui-2`) and a **linked artifact** (`ui-5`).
2. **Artifacts.** A generated document (e.g. "Pricing plan exploration") is a
   first-class link in the note. Click → opens an **artifact modal** (`ui-6`):
   mono title, expand (top-left) + close (top-right), structured body (e.g. a
   3-column pricing card), and a **docked `{ } Ask Charlie` command bar** at the
   bottom (`ui-7`) that expands into a **chat composer** (`ui-8`, `ui-9`) with `@`
   context chips ("`Pricing plan exploration ✕`") and a Send button.
3. **Tomorrow plan.** End-of-day, a **dark suggestion card** (`ui-more examples-2`)
   overlays the note: `{ } Tomorrow plan` · "Great job today. Plan tomorrow." · a
   carousel of suggestions · actions **Decline / Ask to change… / + Add**.

**Window.** macOS traffic lights, rounded window, generous whitespace, and a small
centered **drag-handle pill** at the bottom of focused/floating surfaces.

---

## 1. Current state (what already exists — reuse it)

The app is *partially* Char-themed already. Inventory of reusable pieces:

| Area | Already exists | Where |
| --- | --- | --- |
| Char color palette | `--color-char-*` incl. coral/blue | `apps/desktop/src/styles/globals.css` (L18–32) |
| Reveal/shimmer motion | `reveal-left`, `shimmer`, `kbd-press` keyframes | `apps/desktop/src/styles/globals.css` (L34–94) |
| Streaming AI text | `Streamdown` + `progressive-blur` | `session/components/note-input/enhanced/streaming.tsx`, `packages/ui/.../ui/progressive-blur.tsx` |
| Editor | TipTap 3.x w/ TaskList, Mention, Hashtag, Link | `packages/tiptap/src/...` |
| Checkbox style | 18px, blue `#3b82f6` checked, white check | `packages/tiptap/src/styles/nodes/task-list.css` |
| Date display | day number, coral, serif, weekday+month | `session/components/outer-header/metadata/date.tsx` |
| Chat panel | "Ask Char anything", floating + right-panel | `chat/components/chat-panel.tsx`, `chat/components/header.tsx` |
| Context chips + `@` | chip list, session picker, mentions | `chat/components/context-bar.tsx`, `chat/context/registry.ts` |
| AI task engine | `enhance` + `title` workflows, streaming, abort | `store/zustand/ai-task/` |
| Morning brief | greeting, meetings, notes, manual tasks | `shared/main/morning-brief/index.tsx` |
| Memory (vocab) | custom vocabulary in TinyBase `memories` | `settings/memory/custom-vocabulary.tsx` |
| Modal primitive | shadcn dialog/modal, carousel, command | `packages/ui/src/components/ui/{modal,dialog,carousel,command}.tsx` |

**What is absent (the gaps Phase 1/2 must fill):**
no monospace font · no `{ }` Charlie mark · **no per-task Delegate affordance** ·
no AI-generated sub-tasks · **no artifact concept or artifact modal** · no dark
command bar · no chat composer docked into artifacts · **no Tomorrow-plan card** ·
mentions are amber facehashes (not coral initials) · hashtags are amber sans (not
violet mono) · no inline event/time chip node in the note body.

---

## 2. PHASE 1 — UI/UX redesign

Each item: **Target → Current → Change → Files.** Phase 1 is presentation only;
where an interaction needs a backend it is **stubbed** (static/mock data, a `TODO:
Phase 2` marker) so the UI is fully reviewable without the engine.

### 1.1 Design tokens & typography ⭐ (do this first)

**Target.** Add a real monospace family and wire it through `@theme` so assistant
and structured surfaces can use `font-mono`.

**Current.** `globals.css` defines `--font-serif` (Lora), `--font-sans` (SF Pro),
`--font-hand` (Caveat). **No `--font-mono`.**

**Change.**
1. Add a mono font. Recommended: **Geist Mono** or **JetBrains Mono** (bundle locally
   under `apps/desktop/public/fonts/` to match the offline-first/local font approach
   already used for SF Pro — do *not* add another Google Fonts `@import` for the core
   UI font).
2. In `apps/desktop/src/styles/globals.css` `@theme`:
   ```css
   --font-mono: "Geist Mono", "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
   ```
   and add the matching `@font-face` blocks beside the SF Pro ones (L124–150).
3. Establish usage rules (document in this file's "component inventory" and apply):
   - `font-mono` → `{ }` mark, "Ask Charlie", artifact titles, artifact section
     headers, inline code, `#hashtags`, keyboard hints.
   - `font-sans` → all note body + UI text.
   - `font-serif` → note **title** only (and any large editorial display).

**Files.** `apps/desktop/src/styles/globals.css`; new `public/fonts/*Mono*` files.

### 1.2 The Charlie identity (`{ }` mark + naming)

**Target.** Assistant is **Charlie**; surfaces read **"Ask Charlie"** and are prefixed
with the mono `{ }` glyph.

**Current.** Header literal is `"Ask Char anything"` (`chat/components/header.tsx`
L123). Floating entry point is an animated **gif** button
(`chat/components/floating-button.tsx`).

**Change.**
1. Create a tiny `CharlieMark` component (mono `{ }`, currentColor) and use it
   wherever the assistant is referenced.
2. Update copy: "Ask Char anything" → **"Ask Charlie anything…"**; floating/chat
   labels → **"`{ } Ask Charlie`"** (mono).
3. Replace the gif floating button with the **dark command-bar pill** (see 1.8).
4. Keep the product name "Char"; the *agent* is "Charlie" (matches char.com).

**Files.** `chat/components/header.tsx`, `chat/components/floating-button.tsx`, new
`chat/components/charlie-mark.tsx`.

### 1.3 Daily-note header & date badge ⭐ (small details matter)

This tiny component sets the tone for the whole note — get it pixel-right.

**Target — exact anatomy (`ui-1`, repeated in `ui-more examples-2`).**
A horizontal group, vertically centered, ~12px gap:

```
┌──────┐  June      ← full month, bold, ink (#2a2622), ~17px sans
│  19  │  Friday    ← full weekday, muted (#817b74), ~14px sans, directly under
└──────┘
  ▲ coral filled rounded tile (~44–48px square, radius ~14–16px / rounded-2xl),
    subtle top→bottom coral gradient (#ff6b63 → #ff5f57), faint inner highlight;
    "19" = WHITE, BOLD, centered, sans (SF Pro), ~20–22px, tabular-nums.
```

Key specifics that are easy to miss:
- The number lives **inside a filled coral tile**, white — it is **not** large
  coral text.
- Month is the **full name** ("June", not "Jun") and is **bold ink**, not coral.
- Weekday is the **full name** ("Friday", not "Fri"), **muted**, on its **own line
  below** the month.
- The number is **sans bold**, not serif (serif is reserved for the note title).

**Current (`date.tsx`).** The opposite on almost every point:
- `dayNumber` = `font-serif text-5xl text-char-coral` → big **coral serif** "19",
  no tile (L27–29).
- `monthWeekday` = `safeFormat(reference, "EEE, MMM")` → `"Fri, Jun"`, **single
  coral line** (L17, L31–33) — wrong order (weekday-first), abbreviated, and the
  wrong color.

**Change.**
1. Replace the number block with a tile:
   ```tsx
   <div className="flex size-11 items-center justify-center rounded-2xl
     bg-gradient-to-b from-[#ff6b63] to-char-coral text-white shadow-sm">
     <span className="text-xl font-bold tabular-nums leading-none">{dayNumber}</span>
   </div>
   ```
2. Split the label into two full-name lines and fix order/colors:
   ```tsx
   const month   = safeFormat(reference, "MMMM");  // "June"
   const weekday = safeFormat(reference, "EEEE");   // "Friday"
   ...
   <div className="flex flex-col leading-tight">
     <span className="text-[17px] font-semibold text-char-ink">{month}</span>
     <span className="text-[13px] text-char-muted">{weekday}</span>
     {timeRange && <span className="text-xs text-char-muted-soft">{timeRange}</span>}
   </div>
   ```
3. Keep the existing `startedAt ?? createdAt` reference logic and the time-range
   line (it only appears for recorded sessions).

**Micro-animations (this is the part the screenshots imply but can't show).**
Use `motion/react`. On **note open / first mount**:
- Tile: `initial={{ scale: 0.9, opacity: 0 }} → { scale: 1, opacity: 1 }`,
  spring (`stiffness ~400, damping ~24`), ~180ms — a small "pop".
- Month + weekday: fade + slide-in from left (`x: -4 → 0`) with a ~40ms **stagger**
  (month leads, weekday follows) so the two lines settle in sequence, not together.
- Optional flourish: the "19" can do a 1-step count-up (e.g. 17→18→19 over ~250ms)
  or a quick blur-to-sharp on mount — keep it subtle, one-shot, never on every
  re-render.

On **hover** (the whole badge): tile lifts `y: -1` + slightly stronger shadow
(~120ms ease-out) — a faint tactile cue, matching Char's "everything is gently
alive" feel.

On **day rollover** (reference date changes to a new day): cross-fade / vertical
flip the number (old up-and-out, new up-and-in, ~200ms) rather than a hard swap.

Respect `prefers-reduced-motion`: skip transforms, keep a plain opacity fade.

**Files.** `session/components/outer-header/metadata/date.tsx` (wrap in a
`motion.div`; add the tile + two-line label + format-string changes).

### 1.4 Note-body inline elements

The note is the product. Bring its inline tokens to Char's exact look.

**1.4a Tasks / checkboxes.** *Keep* the current checkbox (18px, blue checked, white
check) — it already matches `ui-more examples`. Verify radius is `~4px` (rounded, not
circular). **Files:** `packages/tiptap/src/styles/nodes/task-list.css`.

**1.4b People @mentions.** **Target:** coral/red name text preceded by a tiny
**circular initial avatar** (`A`, `S`, `Y` in a thin ring). **Current:** facehash
avatar + label colored from a 10-color **amber** palette. **Change:** in
`packages/tiptap/src/editor/mention.tsx` + `packages/tiptap/src/styles/mention.css`,
render human mentions as `initial-in-circle` + `text-char-coral`; keep facehash only
as a fallback when no initial. Non-human mentions (session/org) keep their icon.

**1.4c #hashtags.** **Target:** **violet + monospace** (`#launch` looks code-like).
**Current:** amber `#f59e0b`, underline, weight 500, sans
(`packages/tiptap/src/styles/nodes/hashtag.css`). **Change:** color → violet
(`#7c3aed`-ish; add `--color-char-tag`), `font-family: var(--font-mono)`, drop or
soften the underline.

**1.4d Inline links.** Already blue `#3b82f6` underlined — matches `ui-1`. No change
beyond mapping the hex to `--color-char-blue` for consistency.
**Files:** `packages/tiptap/src/styles/nodes/link.css`.

**1.4e Inline event / time chips (new).** **Target (`ui-1`):** within the note body,
an inline **`📅 Launch sync  🕐 11:30`** chip and per-task **`🕐 Today`** time badges.
**Current:** event metadata lives only in the *outer header* popover; there is no
inline chip node. **Change (Phase 1 = render-only):** add a TipTap inline node
(`eventChip` / `timeBadge`) that renders an icon + label pill; for Phase 1 it can be
inserted manually / from existing calendar links. (Auto-extraction is Phase 2.)
**Files:** new `packages/tiptap/src/shared/extensions/event-chip.ts` + style.

### 1.5 The **Delegate** interaction (UI shell) ⭐

This is Char's headline gesture. Phase 1 builds the *entire visible choreography*
against a mock; Phase 2 swaps the mock for the real agent.

**Target choreography (`ui-2` → `ui-3` → `ui-4` → `ui-5`):**
1. Hover a task row → **`Delegate` pill** (mono label + `{ }`/arrow icon) fades in,
   right-aligned, pill-shaped, subtle shadow.
2. Click → pill morphs to a **`thinking…`** chip; a **shimmer** sweeps the row
   (reuse `--animate-shimmer`).
3. Resolve → generated text **reveals** with the left→right clip wipe (reuse
   `--animate-reveal-left`) + `progressive-blur` edge.
4. The delegated task may gain **nested sub-tasks** (1.6) and/or a **linked artifact**
   (1.7).

**Current.** No per-task hover affordance exists at all (confirmed in
`packages/tiptap` + `session/components/floating`). The motion primitives, the
`Streamdown` streamer, and `progressive-blur` *do* exist (used by `enhance`).

**Change.**
1. Add a **task-row decoration** in the editor: a ProseMirror plugin / NodeView for
   `taskItem` that renders a hover-only React overlay (`DelegatePill`) at the row's
   trailing edge. (TipTap NodeViews can host React via `ReactNodeViewRenderer`.)
2. Build `DelegatePill`, `ThinkingChip`, and a `DelegatedResult` block (reveal +
   blur). Drive them from a local state machine
   `idle → thinking → revealing → done`.
3. **Phase 1 data = mock:** on click, after ~1.2s, stream a canned paragraph + insert
   one mock sub-task + one mock artifact link. Mark with `// TODO(phase2): replace
   mock with delegation engine`.

**Files.** new `session/components/note-input/delegate/{DelegatePill,ThinkingChip,
DelegatedResult,useDelegate}.tsx`; editor wiring in `packages/tiptap/src/editor/` (a
`taskItemDelegate` extension/NodeView). Reuse `packages/ui/.../progressive-blur.tsx`
and the `note-input/enhanced/streaming.tsx` pattern.

### 1.6 AI-generated sub-tasks rendering

**Target (`ui-2`).** Under a delegated task, indented sub-tasks appear with a **left
vertical rule** and slightly muted text (e.g. "Trim the launch checklist for
@Artem"). They are normal checkable tasks once revealed.

**Current.** TipTap `TaskItem` supports nesting (`nested: true`), but nothing
generates or visually distinguishes AI sub-tasks.

**Change.** Add a `data-ai-generated` attribute on AI sub-task `li`s and style: left
`border-l border-char-line`, `pl-4`, muted-until-confirmed. Add a brief
`reveal-left` on insert. **Files:** `packages/tiptap/src/styles/nodes/task-list.css`,
the delegate result inserter (1.5).

### 1.7 Artifact viewer modal ⭐

**Target (`ui-6`→`ui-9`).** Artifact link in note → **modal/card**: mono title,
**expand** icon (top-left), **close** (top-right), structured body (the pricing
example = a 3-up card "`Recommended launch set`" with Solo/Pro/Team columns + a Notes
list), and a **docked `{ } Ask Charlie` bar** at the bottom that expands into a chat
composer (1.8) scoped to this artifact (context chip pre-filled with the artifact).

**Current.** No artifact concept and no such modal. We *do* have a `modal.tsx`
primitive and a full chat stack to embed.

**Change (Phase 1).**
1. Define an `artifact` link mark/node in the editor that renders as
   `📄 underlined mono title` (`ui-5`).
2. Build `ArtifactModal` from `packages/ui/.../ui/modal.tsx`: header (mono title +
   expand + close), scrollable body that renders artifact content (markdown via
   `Streamdown`, plus support for simple structured blocks like the pricing 3-up),
   and a footer slot hosting the **CharlieBar** (1.8).
3. **Phase 1 data = mock** artifact objects (title + markdown/structured body).
   Mark `// TODO(phase2)`.

**Files.** new `session/components/artifacts/{ArtifactModal,ArtifactLink,
artifact-blocks}.tsx`; editor `artifact` node in `packages/tiptap/src/editor/`.

### 1.8 The dark **Charlie command bar** + chat composer

**Target (`ui-7`→`ui-9`).** A **near-black rounded bar**: collapsed shows
`{ } Ask Charlie anything…` + expand icon; expanded becomes a composer —
"`Chat, delegate or search with Charlie. Use @ to add context`", an `@` button, a row
of **context chips** (`📄 Pricing plan exploration ✕`), and a **Send** button (disabled
until input). In `ui-9` it shows a user bubble above the composer.

**Current.** Chat exists but is **light-themed**, entered via a gif button, docked
right/floating. Context chips + `@` already exist in `chat/components/context-bar.tsx`.

**Change.**
1. Build `CharlieBar` (dark): `bg-[#1a1a1a] text-white rounded-2xl`, mono `{ }` mark,
   collapsed/expanded states, expand-to-fullscreen icon.
2. **Reuse** the existing context-chip + `@`-mention + send plumbing — re-skin it dark
   and mount it (a) as the global floating entry point (replacing the gif button) and
   (b) docked inside `ArtifactModal` (1.7) with the artifact pre-added as a context
   chip.
3. Update placeholder copy to Char's exact strings above.

**Files.** new `chat/components/charlie-bar.tsx`; restyle `chat/components/
context-bar.tsx` (dark variant) and `chat/components/input/*`; replace
`chat/components/floating-button.tsx`.

### 1.9 Tomorrow-plan card (nightly suggestion)

**Target (`ui-more examples-2`).** A **dark overlay card** on the note: `{ } Tomorrow
plan` · headline "Great job today. Plan tomorrow." · a **carousel** of suggestions
(dots) · body text suggestion · actions **Decline** / **Ask to change…** / **+ Add**.

**Current.** None. We have `carousel.tsx` and the morning-brief surface to build on.

**Change (Phase 1).** Build `TomorrowPlanCard` (dark, mono `{ }` header, `carousel.tsx`
for suggestions, three action buttons). Trigger it manually / on a stub condition for
Phase 1; **mock** the suggestion list. Wire **+ Add** to insert the suggestion as a
task in tomorrow's note (local), **Decline** to dismiss, **Ask to change…** to open
the CharlieBar. Mark generation `// TODO(phase2)`.

**Files.** new `shared/main/tomorrow-plan/TomorrowPlanCard.tsx`.

### 1.10 Morning-brief restyle

**Target.** Char's "Morning Brief" summarizes overnight asks + rolled-over tasks in
the same warm, mono-accented language.

**Current.** `shared/main/morning-brief/index.tsx` already shows greeting + meetings
+ notes + manual tasks — structurally fine, just not Char-styled, and tasks are manual.

**Change (Phase 1).** Restyle to the Char card aesthetic (mono section labels, coral
date, warm canvas). Leave AI summarization for Phase 2 (2.5). **Files:**
`shared/main/morning-brief/index.tsx`.

### 1.11 Motion & micro-interactions ⭐ (the small details)

**Philosophy.** Char feels *gently alive* — almost nothing snaps; small things ease,
pop, and stagger. These micro-animations are not optional polish, they are the
brand. Build them as part of each component, not as an afterthought. Use
`motion/react` (per `AGENTS.md`, not framer-motion), keep durations short
(120–250ms), prefer springs for "pop" and ease-out for slides, make mount-effects
**one-shot** (never re-fire on every render), and always honor
`prefers-reduced-motion` (fall back to a plain opacity fade).

Per-element specs:
- **Date badge** (see 1.3): tile pop-in spring; month/weekday left-slide with ~40ms
  stagger; hover lift `y:-1`; day-rollover number flip.
- **Checkbox**: on check, the tick draws/scales in (~120ms spring) and the box fills
  blue with a tiny `scale 0.9→1` bounce; on uncheck, quick fade — not an instant
  toggle.
- **People @mention**: initial-avatar gets a faint `scale 0.95→1` on insert; subtle
  background tint on hover.
- **#hashtag**: on hover, a soft underline grow / color deepen (~100ms).
- **Delegate pill**: fade + slide-in (`x:6→0`) on row hover (~120ms); on click it
  **morphs** to the `thinking…` chip (shared layout / width tween), not a hard swap.
- **thinking → reveal**: `--animate-shimmer` sweeps the row while thinking;
  `--animate-reveal-left` (clip wipe) + `progressive-blur` trailing edge on resolve;
  generated **sub-tasks** slide+fade in with a stagger (top to bottom).
- **Artifact link**: gentle underline + icon nudge on hover; click → modal.
- **Artifact modal**: scale/opacity in (`0.96→1`, ~180ms); expand icon → fullscreen
  spring; close → reverse.
- **Charlie bar**: collapsed→expanded height/opacity tween; context chips pop in
  (`scale 0.9→1`); Send enables with a color fade.
- **Tomorrow card**: slide-up from bottom (`y:24→0`, ease-out) + backdrop fade;
  carousel via `carousel.tsx`; action buttons get a press-down (`scale 0.97`) tap.
- **Bottom drag-handle pill**: add to floating/focused surfaces; faint opacity
  breathe on hover.

Reuse what's already there: `--animate-shimmer`, `--animate-reveal-left`,
`--animate-kbd-press`, `--animate-wiggle` (`globals.css` L34–94), and
`progressive-blur` / `text-animate` / `typewriter` in `packages/ui/.../ui/`.

### Phase 1 — component inventory (build vs reuse)

| New component | Reuses |
| --- | --- |
| `CharlieMark` | — (mono `{ }`) |
| `DelegatePill` / `ThinkingChip` / `DelegatedResult` | `--animate-shimmer`, `--animate-reveal-left`, `progressive-blur`, `Streamdown` |
| `ArtifactLink` (editor node) + `ArtifactModal` | `ui/modal.tsx`, `Streamdown` |
| `artifact-blocks` (pricing 3-up, notes) | `ui/card.tsx` |
| `CharlieBar` (dark) | `chat/context-bar.tsx`, `chat/input/*`, mentions/chips |
| `TomorrowPlanCard` | `ui/carousel.tsx`, `ui/button.tsx` |
| `EventChip` / `TimeBadge` (editor nodes) | TipTap inline node infra |

### Phase 1 — acceptance checklist
- [ ] `font-mono` token + local mono font; `{ }`, artifact titles, `Ask Charlie`,
      code, hashtags all render mono.
- [ ] People @mentions = coral initial-avatars; #hashtags = violet mono.
- [ ] Date badge = filled coral tile w/ white bold "19", full "June" (bold ink) over
      "Friday" (muted); pop-in + staggered slide on mount, hover lift.
- [ ] Hover a task → Delegate pill → thinking → reveal (mock) with sub-tasks + artifact link.
- [ ] Artifact link opens dark-footer modal with the pricing-style body.
- [ ] Dark CharlieBar replaces the gif button; expands to composer with `@` chips.
- [ ] Tomorrow-plan dark card with carousel + Decline/Ask/Add (mock).
- [ ] `pnpm -r typecheck` clean; `pnpm exec dprint fmt` applied.

---

## 3. THE PHASE SYSTEM — Goals · Sections · Heatmaps ⭐

> **The reframe: Activity Rings for knowledge work.** You never *log* a habit — you
> write your daily note and check tasks off, and a heatmap fills as a **byproduct**.
> Every explicit "tracking" action we'd otherwise add, we **delete and derive** instead.
> This part is **independent of Phase 1/2** and can ship in parallel — it adds two
> tables, one heading extension, one editor block node, and a home-screen section.

**The one rule the whole system obeys**

> A **goal section** = a heading bound to a goal **+ every block beneath it until the
> next heading**. Its **contribution for a day** = `checked / total` of the checkboxes
> in that section. That ratio is the *only* thing the heatmap, streaks, and dashboard
> ever read.

**Why it must be derived (the key constraint).** There is **no `tasks` table** — tasks
live only inside the note's TipTap JSON (`sessions.raw_md`). Completion is therefore
not queryable; the contribution engine (3.4) **computes** the ratio from the doc and
**writes** it into a `goal_contributions` table that every view reads. The note stays
the single source of truth; editing a past note retroactively corrects that day.

**Decisions locked** (from design review):
- **Cell fill = completion ratio.** Intensity = `checked/total`; **100% = full goal
  color and a "done" day.** 5 levels: empty · ≤⅓ · ≤⅔ · <100% · 100%.
- **Streaks are per-goal cadence.** Each goal is **daily** (streak = consecutive *done*
  days) **or weekly-target `N×/week`** (a week holds the streak if *done days ≥ N* — a
  single skipped day never breaks it). Show **current + best**.
- **Binding = `@` inside a heading.** Context-aware: caret in a heading → the `@` picker
  shows **Goals**; everywhere else `@` stays people/sessions.
- **Colors = curated palette** (~12 hand-tuned swatches, Apple-Reminders style).

### 3.1 Data layer — `goals` + `goal_contributions` (TinyBase)

**Target.** Two additive tables. **No migration needed** — storage is schema-on-read
(per-table JSON files); new tables simply start empty and never touch existing data.

**Current.** No goal/contribution concept anywhere; tasks are editor-only.

**Change.**
1. `packages/store/src/zod.ts` — add the schemas (+ exported types). Cells are
   `string | number | boolean` only.
   ```ts
   export const goalSchema = z.object({
     user_id: z.string(),
     name: z.string(),
     color: z.string(),          // hex from the curated palette
     cadence: z.string(),        // "daily" | "weekly"
     weekly_target: z.number(),  // used when cadence === "weekly" (e.g. 3); 0 otherwise
     created_at: z.string(),
     archived: z.boolean(),
   });
   export const goalContributionSchema = z.object({
     user_id: z.string(),
     goal_id: z.string(),
     session_id: z.string(),     // the note this contribution came from
     date: z.string(),           // "yyyy-MM-dd" — the note's day
     completed_count: z.number(),
     total_count: z.number(),
   });
   ```
2. `packages/store/src/tinybase.ts` — add both tables to `tableSchemaForTinybase`
   (snake_case cells, `InferTinyBaseSchema<typeof goalSchema>` cross-check), exactly like
   `sessions` (L26).
3. `apps/desktop/src/store/tinybase/store/main.ts` — add ids + defs:
   - `QUERIES.allGoals` over `goals` (select name/color/cadence/weekly_target/archived).
   - `INDEXES.contributionsByGoal` = `goal_contributions` indexed by `goal_id` then
     `date` (mirror `eventsByDate`, L242) — a goal's cells read by date in O(1).
   - one contribution row per **(goal, session)**; the dashboard groups by `date`
     (grouped queries exist — `sessionRecordingTimes`, L171).
4. Persistence — copy the `templates` pattern verbatim: `createJsonFilePersister` →
   `goals.json` / `goal_contributions.json`; register both in `persisters.ts` (L39).
   **Without this, rows vanish on reload.**

**Files.** `packages/store/src/{zod.ts,tinybase.ts}`;
`apps/desktop/src/store/tinybase/store/{main.ts,persisters.ts}`; new
`apps/desktop/src/store/tinybase/persister/goals/{persister.ts,index.ts}`.

### 3.2 Create a goal — `/create goal` ⭐

**Target.** In the note, `/create goal` → a **caret-anchored popover**: name input + the
12-swatch palette + a cadence toggle (**Daily** / **N×/week**) → Enter saves. The goal is
written to `goals`; **it never appears in the note.** If the caret is already in a heading,
the new goal is **bound to that heading immediately** (skips a step).

**Current.** `slash-command.tsx` has formatting items only.

**Change.**
1. Add a `create-goal` item to `SLASH_ITEMS` (`packages/tiptap/src/editor/slash-command.tsx`).
   Its `command(editor, range)` deletes the range and **dispatches a window CustomEvent**
   `char:create-goal` with `{ headingActive: isNodeActive(state, "heading") }` — the same
   pattern as the editor's existing `editor-move-to-title-position` event.
2. A React listener mounted at the session level opens `GoalCreatePopover` at the caret
   rect. On submit → `store.setRow("goals", id(), { … })`; if `headingActive`, also
   `editor.commands.updateAttributes("heading", { goalId: id })`.

**Micro-animation.** Popover scale/opacity in (`0.96→1`, ~160ms); swatch select = `scale
0.9→1` pop; Enter saves with a subtle confirm.

**Files.** `packages/tiptap/src/editor/slash-command.tsx`; new
`apps/desktop/src/session/components/goals/GoalCreatePopover.tsx`; listener in
`apps/desktop/src/session/index.tsx`.

### 3.3 Bind a heading to a goal — `@` in a heading ⭐

**Target.** Caret in a heading + `@` → the picker lists **Goals**; choosing one sets the
heading's `goalId`. The heading **tints to the goal color** with a small **leading dot**,
and a **faint colored rule runs down the section** (heading → next heading) so its tasks
visibly belong to the goal. People-`@` is unchanged everywhere else.

**Current.** `@` (`mention.tsx`) always searches people/sessions/orgs (`raw.tsx` L83-119);
Heading is the default StarterKit node with no `goalId`.

**Change.**
1. **Context-aware items.** In `raw.tsx`'s `mentionConfig.handleSearch`, branch on
   `isNodeActive(editor.state, "heading")` → return goal items (`type:"goal"`,
   id+name+color) from `allGoals`; else the current people/session results.
2. **Custom command branch.** In `mention.tsx`'s `command({ editor, range, props })` add:
   `if (item.type === "goal") editor.chain().focus().deleteRange(range)
   .updateAttributes("heading", { goalId: item.id }).run()` — sets the attr instead of
   inserting a node. (The callback already receives the live editor, so it can run any
   transaction.)
3. **`GoalHeading` node.** Set `heading: false` in StarterKit (`extensions/index.ts`
   L109); add `GoalHeading = Heading.configure({ levels:[1..6] }).extend({ addAttributes(){
   return { ...this.parent?.(), goalId: { default:null, parseHTML, renderHTML →
   data-goal-id } } }, addNodeView(){ return ReactNodeViewRenderer(GoalHeadingView) } })`
   and **register it in `getExtensions()`**. The NodeView uses `NodeViewContent`
   (editable), reads `goalId`, looks up the goal color from the store, applies tint + dot +
   section rule.
4. **Contrast fallback (do better).** If the goal color is too light for text (luminance
   check), tint **only the dot + rule** and keep the heading text ink — always legible.
5. **Clear/change.** `@` again in the heading re-picks; a "None" entry clears `goalId`.

**Micro-animation.** On bind: dot **pops** in (`scale 0.8→1`, spring) and the section rule
**wipes down** (top→bottom, ~200ms); the heading color eases in (~150ms), never a hard swap.

**Files.** `packages/tiptap/src/editor/mention.tsx`,
`packages/tiptap/src/shared/extensions/index.ts`, new
`packages/tiptap/src/editor/goal-heading.tsx` (+ `styles/nodes/heading.css` for rule/dot);
`apps/desktop/src/session/components/note-input/raw.tsx` (goal items).

### 3.4 Contribution engine — derive → persist ⭐

**Target.** Whenever a note's tasks change, recompute each goal section's `checked/total`
and upsert one `goal_contributions` row per (goal, session). The heatmap is always live.

**The scan** (the *one rule*, in code): walk `doc.content`; at each heading carrying a
`goalId`, scan **forward over flat top-level siblings until the next heading**, and for
each intervening `taskList` **recurse its `taskItem`s** counting `attrs.checked`. Headings
and taskLists are top-level siblings; `taskItem`s nest inside `taskList`, so the boundary
is a flat scan but counting descends.
```ts
function goalSectionsFor(doc) {                  // → Map<goalId, {checked,total}>
  const out = new Map();
  doc.content.forEach((block, i) => {
    if (block.type !== "heading" || !block.attrs?.goalId) return;
    let checked = 0, total = 0;
    for (let j = i + 1; j < doc.content.length; j++) {
      if (doc.content[j].type === "heading") break;        // section boundary
      walk(doc.content[j], (n) => {
        if (n.type === "taskItem") { total++; if (n.attrs?.checked) checked++; }
      });
    }
    const acc = out.get(block.attrs.goalId) ?? { checked: 0, total: 0 };
    out.set(block.attrs.goalId, { checked: acc.checked + checked, total: acc.total + total });
  });
  return out;
}
```
**When.** Hook into the **debounced** `persistChange` in `raw.tsx` (L30-36, 500ms): after
writing `raw_md`, compute `goalSectionsFor(json)` and for each goal upsert
`goal_contributions["${goalId}:${sessionId}"] = { goal_id, session_id, date:
noteDay(created_at), completed_count, total_count }`; delete rows for goals no longer in
the note. **Day = the note's date** (each daily note = its own column) — predictable and
retroactively editable.

**Files.** new `apps/desktop/src/session/components/goals/useContributionSync.ts`; wire in
`apps/desktop/src/session/components/note-input/raw.tsx`.

### 3.5 The completion moment ⭐ (the payoff)

**Target.** Checking the **last** task in a goal section *closes the ring*: the heading's
goal dot does a one-shot **ring-close pop** (stroke sweep + `scale 1→1.15→1` spring), and
any on-screen heatmap **lights today's cell** (`scale 0.7→1`, goal color). This is the
emotional reward — without it the heatmap is just a chart.

**Change.** In `GoalHeadingView`, watch the section ratio; fire the pop **only on the
`<1 → =1` transition** (guard against re-fires on every render). The cell animation comes
free from the store update.

**Files.** `packages/tiptap/src/editor/goal-heading.tsx`; `globals.css` (add a `ring-close`
keyframe beside the existing ones).

### 3.6 Inline heatmap — `/heatmap`

**Target.** `/heatmap` inserts a **read-only block** that first shows a small **goal
picker**; pick a goal → it renders that goal's habitkit grid inline (weeks × days, 5-level
intensity in the goal color) + a streak chip.

**Current.** No custom block node is registered in the note schema (`clip.ts` exists only
as the pattern, wired into the web blog editor — not the note editor).

**Change.**
1. New `Heatmap` block node (`Node.create`, `group:"block"`, `atom:true`, attr
   `goalId:null`) — pattern = `packages/tiptap/src/shared/clip.ts`. **Register it in
   `getExtensions()`** (else schema validation rejects docs containing it) with
   `addNodeView(){ return ReactNodeViewRenderer(HeatmapNodeView) }`.
2. `/heatmap` item in `SLASH_ITEMS` inserts `{ type:"heatmap", attrs:{ goalId:null } }`.
3. `HeatmapNodeView`: `goalId == null` → render the picker; else read
   `INDEXES.contributionsByGoal`, bucket each day's `completed/total` into a level, render
   the grid + streak. Read-only (atom; no `NodeViewContent`).
4. **Markdown:** add `renderMarkdown`/`parseMarkdown` (e.g. `<Heatmap goal="…"/>`) so it
   survives MD export — a node with no handler is silently dropped from markdown (JSON
   persistence already round-trips the attr).

**Files.** new `packages/tiptap/src/editor/heatmap.tsx`,
`apps/desktop/src/session/components/goals/HeatmapGrid.tsx` (shared with 3.7);
`packages/tiptap/src/shared/extensions/index.ts`, `slash-command.tsx`.

### 3.7 Home dashboard — Goals in the morning brief

**Target.** The home screen (the morning brief = the `empty` tab) gains a **Goals**
section: each goal's heatmap **stacked** (habitkit home), with name · streak · this-week
progress. **Tap a goal → seed today's note** with that goal's heading + an empty task —
the heatmap doesn't just *measure* work, it *starts* it.

**Current.** `morning-brief/index.tsx` has greeting/meetings/notes/tasks + a QuickAction
row; no goals surface. `useNewNote` creates an empty session.

**Change.**
1. Add a `<Section label="Goals">` to `shared/main/morning-brief/index.tsx` (reuse its
   `Section`/`Divider` helpers) rendering `allGoals` → a row per goal with `HeatmapGrid`
   (shared from 3.6) + streak.
2. **Seed-a-note:** add `useNewNoteFromGoal(goal)` beside `useNewNote.ts` — a clone that
   sets `raw_md` to an explicit doc whose heading carries `attrs:{ goalId }` (build the JSON
   directly so the binding is pre-set) + one empty `taskItem`, then
   `openNew({ type:"sessions", id })`.
3. Empty state: "Set a goal to start your streak" → `/create goal` hint.

**Micro-animation.** Heatmap cells stagger-in (L→R) on first paint; tapping a goal does a
`scale 0.97` press; streak number counts up once.

**Files.** `apps/desktop/src/shared/main/morning-brief/index.tsx`,
`apps/desktop/src/shared/main/empty/index.tsx` (supply a `seedFromGoal` action), new
`apps/desktop/src/shared/main/useNewNote.ts` → `useNewNoteFromGoal`,
`apps/desktop/src/session/components/goals/HeatmapGrid.tsx`.

### 3.8 Goal manager + curated colors (Settings)

**Target.** A **Goals** sub-tab in Settings to rename, recolor, set cadence
(**Daily** / **N×/week**), archive, and delete goals — mirroring the existing settings
"list of rows" pattern (`settings/general/app-settings.tsx` `SettingRow`).

**Curated palette** — the only colors a goal can take (fast, tasteful, always legible):
```
#ff5f57 coral   #ff9f0a orange  #ffd60a amber   #34c759 green
#00c7be mint    #30b0c7 teal    #2d7ff9 blue    #5e5ce6 indigo
#7c3aed violet  #ff2d55 pink    #ac8e68 clay    #8e8e93 graphite
```
Define once as `GOAL_COLORS` in a shared module; the swatch picker (3.2) and the manager
both read it.

**Change.** Add `"goals"` to `SettingsTab` (`tabs/schema.ts` L35) + a `SECTIONS` entry +
`case "goals"` in `settings/index.tsx`; build `SettingsGoals` from the `SettingRow` shape.

**Files.** `apps/desktop/src/settings/index.tsx`,
`apps/desktop/src/store/zustand/tabs/schema.ts`, new
`apps/desktop/src/settings/goals/index.tsx`, new shared `goal-colors.ts`.

### 3.9 Streaks & consistency

- **Daily goal:** `current` = consecutive days (ending today/yesterday) whose cell = 100%
  ("done"); `best` = longest such run ever.
- **Weekly goal (target N):** a **week** holds if its count of done-days ≥ N; `current` =
  consecutive holding weeks; also show **this week `k/N`**. A skipped day never breaks it.
- Computed from `INDEXES.contributionsByGoal` (date → ratio); pure + memoized; no extra
  store.

**Files.** new `apps/desktop/src/session/components/goals/streak.ts` (used by the dashboard
+ inline heatmap).

### 3.10 Motion & micro-interactions (the small details)
- **Goal bind:** dot pop (`scale 0.8→1` spring) + section-rule wipe-down (~200ms).
- **Heading tint:** color eases in (~150ms), never a hard swap.
- **Completion moment:** ring-close pop on the dot + today's cell scales in.
- **Heatmap:** cells stagger-in L→R on mount; hover a cell → faint lift + date/ratio tooltip.
- **`/create goal` popover:** scale/opacity in; swatch pop on select; Enter to save.
- **Dashboard goal row:** press `scale 0.97`; streak number counts up on first paint.
- Honor `prefers-reduced-motion` (opacity-only fallback), per Phase 1's rule (1.11).

### Phase System — component / file inventory

| New | Reuses |
| --- | --- |
| `goals` + `goal_contributions` tables + persisters | `templates` persister, `createJsonFilePersister` |
| `GoalHeading` node + `GoalHeadingView` | `Heading.extend`, `ReactNodeViewRenderer`, `NodeViewContent` |
| `@`-goal command branch | existing `mention.tsx` command + `isNodeActive` |
| `Heatmap` node + `HeatmapNodeView` | `clip.ts` block-atom pattern |
| `HeatmapGrid` + `streak.ts` | `contributionsByGoal` index |
| `GoalCreatePopover` (+ `char:create-goal` event) | slash-command + window-CustomEvent precedent |
| `useContributionSync` | `raw.tsx` debounced persist |
| `useNewNoteFromGoal` | `useNewNote.ts` |
| Goals section in morning brief | `Section`/`Divider` helpers |
| `SettingsGoals` sub-tab + `GOAL_COLORS` | `SettingRow`, settings tab system |

### Phase System — build order
1. **3.1 Data layer** (tables + persisters + query/index) — nothing works without it.
2. **3.3 Goal binding** (`GoalHeading` + `@`-in-heading) + **3.4 contribution engine** —
   the core loop; verify rows appear as you check boxes.
3. **3.2 `/create goal`** + **3.8 manager/colors** — make goals creatable + editable.
4. **3.6 inline `/heatmap`** + **3.7 home dashboard** + **3.9 streaks** — the views.
5. **3.5 completion moment** + **3.10 motion** — the feel.

### Phase System — acceptance checklist
- [ ] `/create goal` names + colors a goal; it's saved and never shown in the note.
- [ ] `@` in a heading lists Goals; picking one tints the heading + draws the section rule.
- [ ] Checking tasks updates `goal_contributions`; editing a past note corrects that day.
- [ ] Completing a section closes the ring (dot pop + cell light).
- [ ] `/heatmap` drops an inline read-only grid for a chosen goal (5-level intensity).
- [ ] Morning brief shows all goals' heatmaps + streaks; tapping one seeds today's note.
- [ ] Daily vs weekly-target streaks compute correctly (a skipped day never breaks weekly).
- [ ] Goal colors come only from the curated palette; light colors keep heading text legible.
- [ ] `pnpm -r typecheck` clean; `pnpm exec dprint fmt` applied.

---

## 4. PHASE 2 — Functionality to match Char

Phase 1 gives every Char surface a *shell*. Phase 2 makes them real. Each maps to a
Char capability from char.com.

### 2.1 Delegation engine ⭐

**What Char does.** Clicking *delegate* on a task hands Charlie the task **plus its
carried context — the links, tags (#), people (@), and surrounding intent** — and
Charlie *does the work*: drafts the email, pulls the numbers, researches options,
producing sub-tasks and/or an artifact.

**Build.** Add a `delegate` task type to the existing AI-task framework
(`store/zustand/ai-task/`), alongside `enhance`/`title`:
- `task-configs/delegate-workflow.ts`: `transformArgs` gathers the task text + its
  inline links/tags/mentions + nearby note context (and any linked calendar event /
  session transcript); `executeWorkflow` streams a plan, emits sub-tasks, and may call
  tools (web/research, email draft, doc generation) returning an **artifact** (2.2).
- Reuse the streaming/abort/`onProgress` plumbing already in `task-configs/index.ts`.
- Swap the Phase-1 mock in `useDelegate` (1.5) for dispatch to this task.

**Files.** `store/zustand/ai-task/{tasks.ts,task-configs/delegate-workflow.ts}`;
hook into `ai/hooks/useAITaskTask.ts`.

### 2.2 Artifact generation & persistence ⭐

**What Char does.** Delegation/chat can yield a durable **artifact** (a draft,
handoff, plan) that lives in the note as a link and opens in the artifact modal,
itself chat-able and editable.

**Build.**
- New TinyBase table `artifacts` (id, sessionId, title, kind, content/blocks,
  createdAt, sourceTaskId) — see schema at `packages/store/src/tinybase.ts`.
- Persist artifacts produced by 2.1 / chat; render the editor `artifact` node from a
  real id; `ArtifactModal` (1.7) loads real content; the docked CharlieBar mutates the
  artifact (re-generate / edit). Lift the chat panel's "mostly READ ONLY" limitation
  for artifact edits.

**Files.** `packages/store/src/tinybase.ts`; `session/components/artifacts/*` (swap
mocks); chat write-path in `chat/`.

### 2.3 Context preservation (links · tags · intent)

**What Char does.** "Char carries the links, tags, and intent" across follow-ups —
delegated work and later questions keep the originating context.

**Build.** A context extractor over the note/task (inline links, `#tags`, `@people`,
linked event, session transcript) that feeds 2.1 and pre-populates CharlieBar context
chips (the chip infra already exists in `chat/components/context-bar.tsx`). Persist the
context set on the task/artifact so re-opening restores it.

**Files.** new `chat/context/extract.ts` (or `ai/context/`); integrate with
`chat/context/registry.ts`.

### 2.4 Memory layer

**What Char does.** A real memory that "replaces scattered MEMORY.md files" — Charlie
remembers facts/preferences/people across sessions and applies them.

**Build.** Extend the `memories` table beyond `vocab` to typed memories
(fact/person/preference/project), write memories from delegation & chat, and retrieve
relevant ones into prompts. Add a Memory management surface (extend
`settings/memory/`).

**Files.** `packages/store/src/tinybase.ts` (memory types); `settings/memory/*`;
retrieval in the AI-task/chat prompt assembly.

### 2.5 Morning-brief generation

**What Char does.** Auto-summarizes overnight asks and rolled-over tasks each morning.

**Build.** A scheduled/launch-time job that gathers yesterday's open tasks, new
mentions/asks, and today's calendar, then asks Charlie to compose the brief shown by
`shared/main/morning-brief/` (replace manual tasks with generated + carried-over ones).

**Files.** `shared/main/morning-brief/*`; new generation job in `store/zustand/ai-task/`.

### 2.6 Tomorrow-plan suggestions

**What Char does.** End-of-day, proposes tomorrow's plan from today's context (the
`ui-more examples-2` card).

**Build.** Generate the suggestion list backing `TomorrowPlanCard` (1.9) from open
items + unfinished delegations + recurring patterns (2.7). Wire **+ Add** to create
real tasks on tomorrow's note; **Ask to change…** to a CharlieBar refine loop.

**Files.** `shared/main/tomorrow-plan/*`; generation job.

### 2.7 Recurrence detection

**What Char does.** Notices repeated patterns and offers to create recurring tasks.

**Build.** A lightweight detector over historical tasks/sessions (by title/tag/cadence)
that surfaces "make this recurring?" suggestions, feeding 2.5/2.6.

**Files.** new `store/zustand/ai-task/recurrence.ts` (or a Rust crate if heavier);
surface suggestions in brief/tomorrow cards.

### Phase 2 — dependency order
1. **2.1 Delegation** + **2.2 Artifacts** + **2.3 Context** (the core loop — build together).
2. **2.4 Memory** (improves all generations).
3. **2.5 Morning brief** → **2.6 Tomorrow plan** → **2.7 Recurrence** (daily-rhythm layer).

---

## 5. Conventions (from `AGENTS.md`)
- Format: `pnpm exec dprint fmt` (TS via `oxfmt`). Typecheck: `pnpm -r typecheck`
  (TS) / `cargo check` (Rust).
- `useForm` (tanstack-form) + `useQuery`/`useMutation` (tanstack-query); avoid manual
  state. Use `motion/react`, not framer-motion. Use `cn` from `@hypr/utils` (pass
  arrays). Inline prop types; comments explain *why*, not *what*.
- Sessions are the core entity; TinyBase is the store (`packages/store/src/tinybase.ts`),
  Zustand for UI state, TipTap for the editor.

## 6. At a glance

| | Phase 1 (UI/UX) | Phase 2 (Functionality) |
| --- | --- | --- |
| Typography | add `font-mono`, apply mono to assistant/structured surfaces | — |
| Delegate | hover pill → thinking → reveal (mock) | real delegation engine (2.1) |
| Artifacts | artifact link + modal (mock content) | generate + persist artifacts (2.2) |
| Context | pre-filled context chips (static) | extract & carry links/tags/intent (2.3) |
| Charlie bar | dark composer, `@` chips | wired to delegation/chat writes |
| Tomorrow plan | dark carousel card (mock) | AI suggestions + add-to-note (2.6) |
| Morning brief | restyle | AI summary of asks/rollovers (2.5) |
| Mentions/tags | coral initials, violet mono tags | — |
| Memory | (vocab UI restyle) | typed cross-session memory (2.4) |
| Recurrence | — | pattern detection (2.7) |

### The Phase System at a glance

| Piece | What it is | Decision |
| --- | --- | --- |
| Goals | name + color + cadence; saved to `goals`, never shown in the note | curated 12-color palette |
| Binding | `@` inside a heading → tints heading + section rule | context-aware `@` |
| Contribution | `checked/total` of a goal section's tasks, per note-day | derived from `raw_md` → `goal_contributions` |
| Heatmap cell | intensity = completion ratio; 100% = "done" day | 5 levels |
| Streaks | per-goal **daily** *or* **weekly target N×/week** (rest-day-tolerant) | current + best |
| Inline `/heatmap` | read-only block node, pick a goal → grid | registered in `getExtensions()` |
| Home dashboard | all goals' heatmaps stacked in the morning brief; tap → seed a note | reuse `Section` + `useNewNoteFromGoal` |
| The payoff | last check closes the ring (dot pop + cell light) | the emotional moment |
