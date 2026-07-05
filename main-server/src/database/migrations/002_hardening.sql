-- Migration 002: API versioning, users, request logging

CREATE TABLE api_versions (
  version     TEXT PRIMARY KEY,
  status      TEXT NOT NULL DEFAULT 'active',
  released_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sunset_at   TIMESTAMPTZ,
  notes       TEXT
);

INSERT INTO api_versions (version, status, notes) VALUES
  ('v1', 'active', 'Initial release');

CREATE TABLE users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT        NOT NULL UNIQUE,
  email         TEXT        NOT NULL UNIQUE,
  role          TEXT        NOT NULL DEFAULT 'viewer',
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO users (username, email, role) VALUES
  ('system', 'system@amfpi.internal', 'admin');

CREATE TABLE request_logs (
  id            BIGSERIAL   PRIMARY KEY,
  method        TEXT        NOT NULL,
  path          TEXT        NOT NULL,
  status_code   INTEGER     NOT NULL,
  duration_ms   INTEGER,
  user_id       TEXT,
  ip_address    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_request_logs_created_at ON request_logs(created_at);
CREATE INDEX idx_request_logs_status     ON request_logs(status_code);
CREATE INDEX idx_audit_log_changed_by    ON audit_log(changed_by);
