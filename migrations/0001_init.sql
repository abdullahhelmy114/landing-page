-- The control panel's data on Cloudflare D1 (image bytes live in R2).
-- Apply with: wrangler d1 migrations apply landing-page --remote   (or --local)

-- Languages, brand and taglines, once edited in the panel (one row).
CREATE TABLE IF NOT EXISTS site (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  config TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- One row per page: course name, slug, archived flag, dates.
CREATE TABLE IF NOT EXISTS pages (
  slug TEXT PRIMARY KEY,
  meta TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Draft and published settings of each page.
CREATE TABLE IF NOT EXISTS page_settings (
  slug TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('draft', 'published')),
  settings TEXT NOT NULL,
  PRIMARY KEY (slug, stage)
);

-- Draft and published content of each page, one row per language.
CREATE TABLE IF NOT EXISTS page_content (
  slug TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('draft', 'published')),
  lang TEXT NOT NULL,
  content TEXT NOT NULL,
  PRIMARY KEY (slug, stage, lang)
);

-- Every publish; the store keeps the newest 30 per page.
CREATE TABLE IF NOT EXISTS versions (
  slug TEXT NOT NULL,
  id TEXT NOT NULL,
  published_at TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  settings TEXT NOT NULL,
  content TEXT NOT NULL,
  PRIMARY KEY (slug, id)
);

-- Deleted sections; the store drops entries older than 30 days.
CREATE TABLE IF NOT EXISTS trash (
  slug TEXT NOT NULL,
  id TEXT NOT NULL,
  deleted_at TEXT NOT NULL,
  entry TEXT NOT NULL,
  PRIMARY KEY (slug, id, deleted_at)
);

-- Uploaded and share images held in R2 (an index of the objects).
CREATE TABLE IF NOT EXISTS media (
  key TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

-- Preview links handed out (a hash of each token, never the token).
CREATE TABLE IF NOT EXISTS preview_links (
  hash TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- Failed logins, for the limit of 5 per 15 minutes per IP.
CREATE TABLE IF NOT EXISTS login_failures (
  ip TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS login_failures_by_ip ON login_failures (ip, at);

-- Sessions ended with «تسجيل الخروج» before their 12 hours were up.
CREATE TABLE IF NOT EXISTS revoked_sessions (
  nonce TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
