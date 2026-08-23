-- Migration 002: request logging

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
