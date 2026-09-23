-- IPPS 5.C.9: derive COR per rebound measurement before aggregating runs.
-- Keep a source link so edits and deletions cannot leave an outdated COR.
ALTER TABLE sample_test_results
  ADD COLUMN derived_from_result_id UUID UNIQUE REFERENCES sample_test_results(id) ON DELETE CASCADE;

CREATE FUNCTION cor_from_rebound_height(height NUMERIC, height_unit TEXT)
RETURNS NUMERIC AS $$
  WITH converted AS (
    SELECT CASE lower(trim(height_unit))
      WHEN 'in' THEN height
      WHEN 'inch' THEN height
      WHEN 'inches' THEN height
      WHEN 'mm' THEN height / 25.4
      WHEN 'cm' THEN height / 2.54
    END AS inches
  )
  SELECT CASE WHEN inches BETWEEN 0 AND 78 THEN sqrt(inches / 78) END
  FROM converted;
$$ LANGUAGE SQL IMMUTABLE STRICT;

CREATE FUNCTION sync_cor_result(source_result_id UUID)
RETURNS VOID AS $$
DECLARE
  source_result sample_test_results%ROWTYPE;
  cor_metric_id UUID;
  cor_value NUMERIC;
BEGIN
  SELECT r.* INTO source_result
  FROM sample_test_results r
  JOIN metric_definitions md ON md.id = r.metric_id
  WHERE r.id = source_result_id AND md.metric_key = 'drop_test';

  cor_value := cor_from_rebound_height(source_result.value_numeric, source_result.unit);
  IF cor_value IS NULL THEN
    DELETE FROM sample_test_results WHERE derived_from_result_id = source_result_id;
    RETURN;
  END IF;

  SELECT id INTO cor_metric_id FROM metric_definitions WHERE metric_key = 'cor_78in';
  INSERT INTO sample_test_results
    (sample_id, metric_id, value_numeric, unit, tested_by, tested_at, audit_reason, derived_from_result_id)
  VALUES
    (source_result.sample_id, cor_metric_id, cor_value, 'ratio', source_result.tested_by,
     source_result.tested_at, 'IPPS 5.C.9: COR = sqrt(rebound height in inches / 78)', source_result_id)
  ON CONFLICT (derived_from_result_id) DO UPDATE
  SET sample_id = EXCLUDED.sample_id, value_numeric = EXCLUDED.value_numeric,
      unit = EXCLUDED.unit, tested_by = EXCLUDED.tested_by,
      tested_at = EXCLUDED.tested_at, audit_reason = EXCLUDED.audit_reason, updated_at = now();
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION update_cor_from_drop_result()
RETURNS TRIGGER AS $$
BEGIN
  -- Derived rows must not recursively generate further results.
  IF NEW.derived_from_result_id IS NULL THEN
    PERFORM sync_cor_result(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sample_result_cor
AFTER INSERT OR UPDATE OF sample_id, metric_id, value_numeric, unit, tested_by, tested_at
ON sample_test_results
FOR EACH ROW EXECUTE FUNCTION update_cor_from_drop_result();

SELECT sync_cor_result(r.id)
FROM sample_test_results r
JOIN metric_definitions md ON md.id = r.metric_id
WHERE md.metric_key = 'drop_test';

INSERT INTO scoring_profile_weights (scoring_profile_id, metric_id, weight)
SELECT sp.id, md.id, 0
FROM scoring_profiles sp
CROSS JOIN metric_definitions md
WHERE md.metric_key = 'cor_78in'
ON CONFLICT (scoring_profile_id, metric_id) DO NOTHING;

-- Preserve supplied laboratory COR targets and existing scoring weights.
INSERT INTO benchmark_metric_targets
  (benchmark_id, benchmark_profile_id, metric_name, metric_category, metric_id,
   target_value, target_mean, weight, criticality, unit, notes, required_for_pass, comparison_mode)
SELECT bp.id, bp.id, cor.metric_key, cor.category::text, cor.id,
       cor_from_rebound_height(COALESCE(drop_target.target_mean, drop_target.target_value), drop_target.unit),
       cor_from_rebound_height(COALESCE(drop_target.target_mean, drop_target.target_value), drop_target.unit),
       0, 'medium', 'ratio', 'IPPS 5.C.9: COR = sqrt(rebound height in inches / 78)', false, 'target_range'
FROM benchmark_profiles bp
CROSS JOIN metric_definitions cor
LEFT JOIN metric_definitions drop_metric ON drop_metric.metric_key = 'drop_test'
LEFT JOIN benchmark_metric_targets drop_target
  ON drop_target.benchmark_profile_id = bp.id AND drop_target.metric_id = drop_metric.id
WHERE cor.metric_key = 'cor_78in'
ON CONFLICT (benchmark_id, metric_name) DO NOTHING;
