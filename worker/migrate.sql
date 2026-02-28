-- Migration: add new tables to existing commune-db
-- Run: wrangler d1 execute commune-db --remote --file=migrate.sql

CREATE TABLE IF NOT EXISTS archive (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_name TEXT NOT NULL,
  media_type TEXT NOT NULL,
  media_key TEXT NOT NULL,
  media_title TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS saves (
  id TEXT PRIMARY KEY,
  user_name TEXT NOT NULL,
  post_id TEXT NOT NULL,
  media_type TEXT NOT NULL,
  media_data TEXT NOT NULL,
  saved_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS club_picks (
  id TEXT PRIMARY KEY,
  media_key TEXT NOT NULL,
  media_type TEXT NOT NULL,
  media_data TEXT NOT NULL,
  week_start TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_name, created_at);
CREATE INDEX IF NOT EXISTS idx_archive_user ON archive(user_name);
CREATE INDEX IF NOT EXISTS idx_archive_media ON archive(media_key);
CREATE INDEX IF NOT EXISTS idx_saves_user ON saves(user_name);
CREATE INDEX IF NOT EXISTS idx_club_week ON club_picks(week_start);
