// WAL + busy timeout let the foreground app and the background task (separate connections) write concurrently; seq is the monotonic value AND the PK.

export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 3000;
PRAGMA foreign_keys = ON;

-- Per-stream monotonic seq counter (atomic via UPDATE ... RETURNING in seq-repo).
CREATE TABLE IF NOT EXISTS seq_counter (
  stream   TEXT PRIMARY KEY,
  last_seq INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO seq_counter (stream, last_seq) VALUES ('location', 0), ('ring', 0), ('summaries', 0);

-- Location buffer. seq == the device-assigned monotonic seq (also the local PK).
CREATE TABLE IF NOT EXISTS pending_fixes (
  seq             INTEGER PRIMARY KEY,
  ts              TEXT    NOT NULL,
  lat             REAL    NOT NULL,
  lon             REAL    NOT NULL,
  accuracy_m      REAL,
  altitude_m      REAL,
  vertical_acc_m  REAL,
  heading_deg     REAL,
  heading_acc_deg REAL,
  speed_mps       REAL,
  speed_acc_mps   REAL,
  provider        TEXT,
  activity        TEXT,
  activity_conf   INTEGER,
  battery_pct     INTEGER,
  is_moving       INTEGER,
  is_mock         INTEGER NOT NULL DEFAULT 0,
  status          INTEGER NOT NULL DEFAULT 0,   -- 0=pending 1=in_flight 2=rejected_permanent
  reject_reason   TEXT,
  created_at      INTEGER NOT NULL              -- ms epoch at capture (diagnostics)
);
CREATE INDEX IF NOT EXISTS ix_pending_fixes_status_seq ON pending_fixes (status, seq);

-- Ring buffer (phase 2). kind is a wire string: hr|hrv|spo2|skin_temp|steps|activity.
CREATE TABLE IF NOT EXISTS pending_ring (
  seq           INTEGER PRIMARY KEY,
  kind          TEXT    NOT NULL,
  ts            TEXT    NOT NULL,
  value         REAL    NOT NULL,
  status        INTEGER NOT NULL DEFAULT 0,
  reject_reason TEXT,
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_pending_ring_status_seq ON pending_ring (status, seq);

-- Summaries buffer (phase 2). kind is an INTEGER (smallint); periods are camelCase on the wire.
CREATE TABLE IF NOT EXISTS pending_summaries (
  seq           INTEGER PRIMARY KEY,
  kind          INTEGER NOT NULL,
  period_start  TEXT    NOT NULL,
  period_end    TEXT    NOT NULL,
  payload_json  TEXT    NOT NULL,
  status        INTEGER NOT NULL DEFAULT 0,
  reject_reason TEXT,
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_pending_summaries_status_seq ON pending_summaries (status, seq);

-- One row per (device, stream): upload high-water, server cursor mirror, pause mirror, last receipt.
CREATE TABLE IF NOT EXISTS sync_state (
  device_id         TEXT NOT NULL,
  stream            TEXT NOT NULL,
  last_uploaded_seq INTEGER NOT NULL DEFAULT 0,
  last_cursor_seq   INTEGER,
  high_water_seq    INTEGER,
  last_receipt_json TEXT,
  last_upload_at    TEXT,
  paused            INTEGER NOT NULL DEFAULT 0,
  paused_reason     TEXT,
  last_error        TEXT,
  PRIMARY KEY (device_id, stream)
);

-- Cross-context key/value the collector reads cheaply each capture (paused flag, last fix, etc.).
CREATE TABLE IF NOT EXISTS collector_meta (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);

-- Read-only Inbox cache: the whole last assistant-api feed stored as one JSON blob so the screen renders offline.
CREATE TABLE IF NOT EXISTS inbox_cache (
  key        TEXT PRIMARY KEY,
  json       TEXT    NOT NULL,
  fetched_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS schema_meta (key TEXT PRIMARY KEY, value TEXT);
INSERT OR IGNORE INTO schema_meta (key, value) VALUES ('version', '1');
`;
