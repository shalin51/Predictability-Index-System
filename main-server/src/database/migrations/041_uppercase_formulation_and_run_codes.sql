UPDATE formulations
SET formulation_code = UPPER(formulation_code), updated_at = now();

UPDATE production_runs
SET run_code = UPPER(run_code), updated_at = now();
