UPDATE production_runs
SET status = 'scored', updated_at = now()
WHERE status = 'completed';
