WITH target_machine AS (
  SELECT id
  FROM machines
  WHERE machine_code = 'BOY-125E'
),
profile_parameters AS (
  SELECT
    mpc.machine_id,
    jsonb_agg(
      jsonb_build_object(
        'key', mpc.parameter_key,
        'displayName', mpc.display_name,
        'positionLabel', mpc.position_label,
        'unit', mpc.unit,
        'value', NULL
      )
      ORDER BY mpc.sort_order, mpc.position_index NULLS FIRST, mpc.position_label
    ) AS parameters
  FROM machine_parameter_capabilities mpc
  JOIN target_machine tm ON tm.id = mpc.machine_id
  WHERE mpc.status = 'active'
    AND (
      (mpc.parameter_key = 'barrel.temperature' AND mpc.position_label IN ('Feed Zone', 'Compression Zone', 'Metering Zone', 'Front Zone', 'Nozzle'))
      OR (mpc.parameter_key = 'mold.temperature' AND mpc.position_label IN ('Cavity Side', 'Core Side'))
      OR (mpc.parameter_key = 'injection.pressure' AND mpc.position_label = 'Stage 1')
      OR (mpc.parameter_key = 'injection.speed' AND mpc.position_label = 'Stage 1')
      OR (mpc.parameter_key = 'hold.pressure' AND mpc.position_label = 'Hold Stage 1')
      OR (mpc.parameter_key = 'hold.time' AND mpc.position_label = 'Hold Stage 1')
      OR (mpc.parameter_key = 'screw.back_pressure' AND mpc.position_label = 'Single')
      OR (mpc.parameter_key = 'screw.speed' AND mpc.position_label = 'Single')
      OR (mpc.parameter_key = 'cycle.cooling_time' AND mpc.position_label = 'Single')
      OR (mpc.parameter_key = 'cycle.total_time' AND mpc.position_label = 'Single')
    )
  GROUP BY mpc.machine_id
)
INSERT INTO machine_setup_profiles (machine_id, profile_code, profile_name, parameters, status, notes)
SELECT
  tm.id,
  'BOY-125E-STD',
  'BOY-125E Standard Setup',
  COALESCE(pp.parameters, '[]'::jsonb),
  'active',
  'Standard production setup for BOY-125E injection molding machine'
FROM target_machine tm
LEFT JOIN profile_parameters pp ON pp.machine_id = tm.id
ON CONFLICT (profile_code) DO NOTHING;
