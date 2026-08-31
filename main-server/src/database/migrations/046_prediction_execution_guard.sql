-- Prevent two concurrent prediction executions from running for the same production run.
CREATE UNIQUE INDEX IF NOT EXISTS uq_prediction_results_running_per_run
  ON prediction_results (production_run_id)
  WHERE status = 'running';
