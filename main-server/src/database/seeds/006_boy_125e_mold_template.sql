-- BOY 125E mold template from BOY_125E_Setup_Sheet.xlsx / Hot Runner Zones.
-- Temperatures and notes intentionally remain NULL until a production run supplies them.

INSERT INTO molds (
  mold_code,
  mold_name,
  mold_type,
  manufacturer,
  cavity_count,
  hot_runner_controller,
  zone_count,
  description,
  status
)
VALUES (
  'BOY-125E-MOLD',
  'BOY 125E - Mold Name',
  'Hot Runner',
  NULL,
  NULL,
  NULL,
  18,
  NULL,
  'active'
)
ON CONFLICT (mold_code) DO NOTHING;

WITH zone_template(zone_number, zone_name, zone_type) AS (
  VALUES
    (1, 'Gate 1', 'gate'),
    (2, 'Gate 2', 'gate'),
    (3, 'Gate 3', 'gate'),
    (4, 'Gate 4', 'gate'),
    (5, 'Gate 5', 'gate'),
    (6, 'Gate 6', 'gate'),
    (7, 'Gate 7', 'gate'),
    (8, 'Gate 8', 'gate'),
    (9, 'Gate 9', 'gate'),
    (10, 'Gate 10', 'gate'),
    (11, 'Gate 11', 'gate'),
    (12, 'Gate 12', 'gate'),
    (13, 'Manifold 1', 'manifold'),
    (14, 'Manifold 2', 'manifold'),
    (15, 'Manifold 3', 'manifold'),
    (16, 'Manifold 4', 'manifold'),
    (17, 'Sprue Bar', 'sprue'),
    (18, 'Hot Sprue / Nozzle Extension', 'sprue')
)
INSERT INTO mold_zones (
  mold_id,
  zone_number,
  zone_name,
  zone_type,
  minimum_temperature,
  maximum_temperature,
  temperature_unit,
  notes,
  status
)
SELECT
  mold.id,
  zone_template.zone_number,
  zone_template.zone_name,
  zone_template.zone_type,
  NULL,
  NULL,
  '°F',
  NULL,
  'active'
FROM molds AS mold
CROSS JOIN zone_template
WHERE mold.mold_code = 'BOY-125E-MOLD'
ON CONFLICT (mold_id, zone_number) DO NOTHING;
