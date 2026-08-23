-- Development data migration: normalize existing codes to the name-based convention.

DO $$
BEGIN
  IF EXISTS (
    WITH normalized AS (
      SELECT version_no,
             CONCAT(
               REGEXP_REPLACE(
                 REGEXP_REPLACE(
                   LOWER(REGEXP_REPLACE(COALESCE(NULLIF(formulation_name, ''), formulation_code), '[^a-zA-Z0-9]+', '-', 'g')),
                   '(^-|-$)', '', 'g'
                 ),
                 '-f$', ''
               ),
               '-f'
             ) AS code
      FROM formulations
    )
    SELECT 1 FROM normalized GROUP BY code, version_no HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot normalize formulation codes: duplicate formulation names share a version';
  END IF;

  IF EXISTS (
    WITH normalized AS (
      SELECT CONCAT(REGEXP_REPLACE(f.formulation_code, '-f$', ''), '-pr') AS code
      FROM production_runs pr
      JOIN formulations f ON f.id = pr.formulation_id
    )
    SELECT 1 FROM normalized GROUP BY code HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot normalize production-run codes: multiple runs use the same formulation';
  END IF;
END;
$$;

WITH normalized AS (
  SELECT id,
         REGEXP_REPLACE(
           REGEXP_REPLACE(
             LOWER(REGEXP_REPLACE(COALESCE(NULLIF(formulation_name, ''), formulation_code), '[^a-zA-Z0-9]+', '-', 'g')),
             '(^-|-$)', '', 'g'
           ),
           '-f$', ''
         ) AS base_code
  FROM formulations
)
UPDATE formulations f
SET formulation_code = CONCAT(normalized.base_code, '-f'),
    updated_at = now()
FROM normalized
WHERE normalized.id = f.id;

UPDATE production_runs pr
SET run_code = CONCAT(REGEXP_REPLACE(f.formulation_code, '-f$', ''), '-pr'),
    updated_at = now()
FROM formulations f
WHERE f.id = pr.formulation_id;
