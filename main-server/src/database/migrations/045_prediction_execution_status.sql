ALTER TABLE prediction_results
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'completed'
    CHECK (status IN ('running', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failure_message TEXT;

UPDATE prediction_results
SET completed_at = COALESCE(completed_at, generated_at)
WHERE status = 'completed';
