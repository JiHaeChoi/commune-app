-- commune D1 Schema v2
-- Posts visible for 7 days, archived permanently for grouping

-- Active posts (visible in feed, searched, queried)
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  author_name TEXT NOT NULL,
  author_emoji TEXT NOT NULL,
  author_color TEXT NOT NULL,
  text TEXT NOT NULL,
  media_type TEXT NOT NULL,
  media_data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Reactions (persist with posts)
CREATE TABLE IF NOT EXISTS reactions (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Archive: user→content links for grouping (permanent, never deleted)
CREATE TABLE IF NOT EXISTS archive (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_name TEXT NOT NULL,
  media_type TEXT NOT NULL,
  media_key TEXT NOT NULL,
  media_title TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Saved items: user bookmarks other people's content
CREATE TABLE IF NOT EXISTS saves (
  id TEXT PRIMARY KEY,
  user_name TEXT NOT NULL,
  post_id TEXT NOT NULL,
  media_type TEXT NOT NULL,
  media_data TEXT NOT NULL,
  saved_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Club recommendations: weekly picks
CREATE TABLE IF NOT EXISTS club_picks (
  id TEXT PRIMARY KEY,
  media_key TEXT NOT NULL,
  media_type TEXT NOT NULL,
  media_data TEXT NOT NULL,
  week_start TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_name, created_at);
CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_post ON reactions(post_id, user_name);
CREATE INDEX IF NOT EXISTS idx_archive_user ON archive(user_name);
CREATE INDEX IF NOT EXISTS idx_archive_media ON archive(media_key);
CREATE INDEX IF NOT EXISTS idx_saves_user ON saves(user_name);
CREATE INDEX IF NOT EXISTS idx_club_week ON club_picks(week_start);
