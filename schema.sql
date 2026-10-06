-- Optional: the API creates this schema automatically on first use.
CREATE TABLE IF NOT EXISTS results (
  id TEXT PRIMARY KEY,
  organization TEXT NOT NULL,
  first_name TEXT NOT NULL,
  second_name TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('official','practice')),
  score INTEGER NOT NULL,
  bill REAL NOT NULL,
  budget REAL NOT NULL,
  saving_percent REAL NOT NULL,
  rules_version INTEGER NOT NULL,
  completed_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_official_org ON results(organization) WHERE mode = 'official';
CREATE INDEX IF NOT EXISTS ix_results_rank ON results(mode, score DESC);
