-- Persist versioned ML predictions separately from observed benchmark scores.

CREATE TABLE IF NOT EXISTS prediction_models (
  model_id UUID PRIMARY KEY,
  dataset_version VARCHAR(100),
  status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  first_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prediction_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  production_run_id UUID NOT NULL REFERENCES production_runs(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES prediction_models(model_id),
  input_snapshot JSONB NOT NULL,
  requested_by VARCHAR(255) NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prediction_result_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prediction_result_id UUID NOT NULL REFERENCES prediction_results(id) ON DELETE CASCADE,
  metric_id UUID REFERENCES metric_definitions(id) ON DELETE SET NULL,
  condition_id UUID REFERENCES test_condition_definitions(id) ON DELETE SET NULL,
  metric_key VARCHAR(255) NOT NULL,
  predicted_value NUMERIC(16,6) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (prediction_result_id, metric_key)
);

CREATE INDEX IF NOT EXISTS idx_prediction_results_run ON prediction_results(production_run_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_prediction_result_metrics_result ON prediction_result_metrics(prediction_result_id);
