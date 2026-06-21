export interface SyncTable {
  tinybase: string;
  supabase: string;
  columns: string[];
}

// Portable core tables only. Transcripts, events, calendars, etc. are
// desktop-only and intentionally excluded from cross-device sync.
export const SYNC_TABLES: SyncTable[] = [
  {
    tinybase: "sessions",
    supabase: "sync_sessions",
    columns: ["user_id", "title", "created_at", "folder_id", "event_json", "raw_md"],
  },
  {
    tinybase: "enhanced_notes",
    supabase: "sync_enhanced_notes",
    columns: ["user_id", "session_id", "content", "template_id", "position", "title"],
  },
  {
    tinybase: "goals",
    supabase: "sync_goals",
    columns: ["user_id", "created_at", "name", "color", "cadence", "weekly_target", "archived"],
  },
  {
    tinybase: "goal_contributions",
    supabase: "sync_goal_contributions",
    columns: ["user_id", "goal_id", "date", "checked", "total"],
  },
];
