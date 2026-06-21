-- Phase 3: sync tables for sessions, notes, goals, goal contributions.
-- These mirror the TinyBase schema on the portable core tables only.
-- Transcripts, events, calendars, etc. are desktop-only and not synced.

CREATE TABLE public.sync_sessions (
  id            UUID        PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  folder_id     TEXT        NOT NULL DEFAULT '',
  event_json    TEXT        NOT NULL DEFAULT '',
  raw_md        TEXT        NOT NULL DEFAULT '',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE public.sync_enhanced_notes (
  id            UUID        PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id    UUID        NOT NULL,
  content       TEXT        NOT NULL DEFAULT '',
  template_id   TEXT        NOT NULL DEFAULT '',
  position      INTEGER     NOT NULL DEFAULT 0,
  title         TEXT        NOT NULL DEFAULT '',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE public.sync_goals (
  id            UUID        PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name          TEXT        NOT NULL DEFAULT '',
  color         TEXT        NOT NULL DEFAULT '#6366f1',
  cadence       TEXT        NOT NULL DEFAULT 'weekly',
  weekly_target INTEGER     NOT NULL DEFAULT 3,
  archived      BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE public.sync_goal_contributions (
  id            UUID        PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id       UUID        NOT NULL,
  date          DATE        NOT NULL,
  checked       INTEGER     NOT NULL DEFAULT 0,
  total         INTEGER     NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

-- Indexes for efficient per-user queries
CREATE INDEX sync_sessions_user_updated     ON public.sync_sessions     (user_id, updated_at DESC);
CREATE INDEX sync_enhanced_notes_user       ON public.sync_enhanced_notes (user_id, session_id);
CREATE INDEX sync_goals_user               ON public.sync_goals         (user_id, archived);
CREATE INDEX sync_goal_contributions_user   ON public.sync_goal_contributions (user_id, goal_id, date);

-- Row-Level Security
ALTER TABLE public.sync_sessions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_enhanced_notes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_goals               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_goal_contributions  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_sessions_own"
  ON public.sync_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sync_enhanced_notes_own"
  ON public.sync_enhanced_notes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sync_goals_own"
  ON public.sync_goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sync_goal_contributions_own"
  ON public.sync_goal_contributions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_sessions_updated_at
  BEFORE UPDATE ON public.sync_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER sync_enhanced_notes_updated_at
  BEFORE UPDATE ON public.sync_enhanced_notes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER sync_goals_updated_at
  BEFORE UPDATE ON public.sync_goals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER sync_goal_contributions_updated_at
  BEFORE UPDATE ON public.sync_goal_contributions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Enable Supabase Realtime on all sync tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_enhanced_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_goal_contributions;
