-- Current lab data does not include complete coverage for these scoring metrics.
-- Keep them available for benchmark scoring without blocking lab completion.
UPDATE metric_definitions
SET required_for_scoring = false,
    updated_at = now()
WHERE metric_key IN (
  'weight',
  'diameter',
  'roundness',
  'balance_deviation',
  'bounce_height',
  'hardness',
  'compression',
  'air_cannon_cycles_to_failure',
  'crack_initiation_cycles',
  'deformation_measurement'
);
