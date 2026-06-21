import {
  CalendarDays,
  Clock,
  Contact2,
  FileText,
  Plus,
  Search,
  Settings,
  Sparkles,
  Target,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Checkbox } from "@hypr/ui/components/ui/checkbox";
import { cn, format } from "@hypr/utils";

import { GoalCreatePopover } from "~/shared/goal/GoalCreatePopover";
import { GoalsDashboard } from "~/shared/goal/GoalsDashboard";
import * as main from "~/store/tinybase/store/main";

import { type Task, useTasks } from "./useTasks";

const sameDay = (value: string, key: string) => {
  if (!value) {
    return false;
  }
  const d = new Date(value);
  return !isNaN(d.getTime()) && format(d, "yyyy-MM-dd") === key;
};

const greeting = (hour: number) =>
  hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

export function MorningBrief({
  actions,
  openSession,
}: {
  actions: {
    newNote: () => void;
    openCalendar: () => void;
    openContacts: () => void;
    openSettings: () => void;
    openAiSettings: () => void;
    openAdvancedSearch: () => void;
  };
  openSession: (id: string) => void;
}) {
  const now = useMemo(() => new Date(), []);
  const todayKey = format(now, "yyyy-MM-dd");

  const [showGoalsDashboard, setShowGoalsDashboard] = useState(false);

  const events = main.UI.useResultTable(
    main.QUERIES.timelineEvents,
    main.STORE_ID,
  );
  const sessions = main.UI.useResultTable(
    main.QUERIES.timelineSessions,
    main.STORE_ID,
  );

  const meetings = useMemo(
    () =>
      Object.entries(events)
        .filter(([, e]) => sameDay(e.started_at, todayKey))
        .sort((a, b) => a[1].started_at.localeCompare(b[1].started_at)),
    [events, todayKey],
  );

  const notes = useMemo(
    () =>
      Object.entries(sessions)
        .filter(([, s]) => sameDay(s.created_at, todayKey))
        .sort((a, b) => b[1].created_at.localeCompare(a[1].created_at))
        .slice(0, 5),
    [sessions, todayKey],
  );

  const { tasks, addTask, toggleTask, removeTask } = useTasks();

  const goals = main.UI.useResultTable(main.QUERIES.activeGoals, main.STORE_ID);
  const store = main.UI.useStore(main.STORE_ID);

  const activeGoalsList = useMemo(
    () => Object.entries(goals).map(([id, g]) => ({ id, ...g })),
    [goals],
  );

  return (
    <div className="bg-char-card h-full w-full overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-8 py-10">
        <div className="border-char-line-soft mb-8 flex flex-col gap-2 border-b pb-7">
          <span className="text-char-coral-strong text-[13px] font-medium tracking-wide">
            {format(now, "EEEE, MMMM d")}
          </span>
          <h1 className="text-char-ink font-serif text-5xl leading-tight">
            {greeting(now.getHours())}.
          </h1>
          <p className="text-char-muted max-w-md text-[15px]">
            Here&apos;s what matters today — before you open your tabs.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <div className="text-char-ink font-serif text-2xl">Today</div>
              <div className="text-char-muted-soft text-sm">
                {format(now, "MMMM yyyy")}
              </div>
            </div>
            <div className="to-char-coral flex size-11 items-center justify-center rounded-2xl bg-gradient-to-b from-[#ff6b63] text-white shadow-sm">
              <span className="text-xl leading-none font-bold tabular-nums">
                {format(now, "d")}
              </span>
            </div>
          </div>

          <Section label="Today's meetings">
            {meetings.length === 0 ? (
              <Empty>No meetings on the calendar today.</Empty>
            ) : (
              meetings.map(([id, e]) => (
                <Row key={id} onClick={actions.openCalendar}>
                  <CalendarDays className="text-char-muted size-4 shrink-0" />
                  <span className="text-char-ink truncate">
                    {e.title || "Untitled event"}
                  </span>
                  {!e.is_all_day && e.started_at && (
                    <span className="text-char-muted ml-auto flex shrink-0 items-center gap-1 text-xs">
                      <Clock className="size-3" />
                      {format(new Date(e.started_at), "h:mm a")}
                    </span>
                  )}
                </Row>
              ))
            )}
          </Section>

          <Divider />

          <Section label="Notes">
            {notes.length === 0 ? (
              <Empty>No notes captured today yet.</Empty>
            ) : (
              notes.map(([id, s]) => (
                <Row key={id} onClick={() => openSession(id)}>
                  <FileText className="text-char-muted size-4 shrink-0" />
                  <span className="text-char-ink truncate">
                    {s.title || "Untitled note"}
                  </span>
                  {s.created_at && (
                    <span className="text-char-muted ml-auto shrink-0 text-xs">
                      {format(new Date(s.created_at), "h:mm a")}
                    </span>
                  )}
                </Row>
              ))
            )}
          </Section>

          <Divider />

          <Section label="Tasks">
            {tasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                onToggle={() => toggleTask(t.id)}
                onRemove={() => removeTask(t.id)}
              />
            ))}
            <AddTask onAdd={addTask} />
          </Section>

          {activeGoalsList.length > 0 && (
            <>
              <Divider />
              <Section label="Goals">
                {activeGoalsList.map((goal) => {
                  const rowId = `${goal.id}:${todayKey}`;
                  const todayRow = store
                    ? store.getRow("goal_contributions", rowId)
                    : null;
                  const checked = (todayRow?.checked as number | undefined) ?? 0;
                  const total = (todayRow?.total as number | undefined) ?? 0;
                  const progress = total > 0 ? checked / total : 0;
                  const isDone = total > 0 && checked === total;

                  return (
                    <button
                      key={goal.id}
                      onClick={() => setShowGoalsDashboard(true)}
                      className={cn([
                        "border-char-line-faint hover:bg-char-selected/50 flex w-full items-center gap-3 rounded-md border-b px-2 py-2 last:border-b-0 text-left transition-colors",
                      ])}
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: goal.color as string }}
                      />
                      <span className="text-char-ink flex-1 truncate text-sm">
                        {goal.name as string}
                      </span>
                      {total > 0 && (
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-16 h-1 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.round(progress * 100)}%`,
                                background: goal.color as string,
                                opacity: isDone ? 1 : 0.7,
                              }}
                            />
                          </div>
                          <span className="text-char-muted text-[10px] tabular-nums">
                            {checked}/{total}
                          </span>
                        </div>
                      )}
                      {total === 0 && (
                        <span className="text-char-faint text-[10px]">
                          No tasks today
                        </span>
                      )}
                    </button>
                  );
                })}
              </Section>
            </>
          )}
        </div>

        <div className="border-char-line-soft mt-8 flex flex-wrap gap-2 border-t pt-5">
          <QuickAction
            icon={<Plus className="size-3.5" />}
            label="New note"
            onClick={actions.newNote}
          />
          <QuickAction
            icon={<CalendarDays className="size-3.5" />}
            label="Calendar"
            onClick={actions.openCalendar}
          />
          <QuickAction
            icon={<Contact2 className="size-3.5" />}
            label="Contacts"
            onClick={actions.openContacts}
          />
          <QuickAction
            icon={<Search className="size-3.5" />}
            label="Search"
            onClick={actions.openAdvancedSearch}
          />
          <QuickAction
            icon={<Sparkles className="size-3.5" />}
            label="AI"
            onClick={actions.openAiSettings}
          />
          <QuickAction
            icon={<Settings className="size-3.5" />}
            label="Settings"
            onClick={actions.openSettings}
          />
          <QuickAction
            icon={<Target className="size-3.5" />}
            label="Goals"
            onClick={() => setShowGoalsDashboard(true)}
          />
        </div>
      </div>

      <GoalsDashboard
        open={showGoalsDashboard}
        onClose={() => setShowGoalsDashboard(false)}
      />
      <GoalCreatePopover />
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-char-faint mb-1 font-mono text-[10px] font-semibold tracking-[0.16em] uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

function Row({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn([
        "flex items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm",
        "border-char-line-faint border-b last:border-b-0",
        "hover:bg-char-selected/50 transition-colors",
      ])}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="bg-char-line-soft h-px" />;
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-char-muted-soft px-2 py-2 text-sm">{children}</span>
  );
}

function TaskRow({
  task,
  onToggle,
  onRemove,
}: {
  task: Task;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="group border-char-line-faint hover:bg-char-selected/50 flex items-center gap-2.5 rounded-md border-b px-2 py-2 last:border-b-0">
      <Checkbox
        checked={task.done}
        onCheckedChange={onToggle}
        className="border-char-faint data-[state=checked]:border-char-coral-strong data-[state=checked]:bg-char-coral-strong size-4 rounded-[5px]"
      />
      <span
        className={cn([
          "flex-1 text-sm",
          task.done ? "text-char-muted-soft line-through" : "text-char-ink",
        ])}
      >
        {task.text}
      </span>
      <button
        onClick={onRemove}
        className="text-char-muted-soft hover:text-char-ink opacity-0 transition-opacity group-hover:opacity-100"
      >
        <span className="text-xs">Remove</span>
      </button>
    </div>
  );
}

function AddTask({ onAdd }: { onAdd: (text: string) => void }) {
  const [value, setValue] = useState("");

  const submit = () => {
    onAdd(value);
    setValue("");
  };

  return (
    <div className="flex items-center gap-2.5 px-2 py-2">
      <Plus className="text-char-faint size-4 shrink-0" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            submit();
          }
        }}
        placeholder="Add a task…"
        className="text-char-ink placeholder:text-char-faint flex-1 bg-transparent text-sm outline-none"
      />
    </div>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn([
        "border-char-line bg-char-card text-char-muted flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm",
        "hover:border-char-coral-strong/30 hover:text-char-ink transition-colors",
      ])}
    >
      {icon}
      {label}
    </button>
  );
}
