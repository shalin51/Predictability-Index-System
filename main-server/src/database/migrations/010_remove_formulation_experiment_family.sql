-- Remove retired formulation experiment and family metadata.

ALTER TABLE formulations
  DROP COLUMN IF EXISTS experiment_id,
  DROP COLUMN IF EXISTS family_id;

DROP TABLE IF EXISTS experiments;
DROP TABLE IF EXISTS formulation_families;
