-- Formulations are evaluated against every active benchmark at scoring time.

ALTER TABLE formulations DROP COLUMN IF EXISTS target_benchmark_id;
