-- Align the BOY 125E definitions and active capabilities with the revised setup workbook.

INSERT INTO process_parameter_definitions
  (parameter_key, section_key, display_name, data_type, default_unit, sort_order)
VALUES
  ('injection.pressure', 'injection', 'Injection Pressure', 'number', 'psi', 31),
  ('hold.pressure', 'hold_pack', 'Hold Pressure', 'number', 'psi', 40),
  ('screw.back_pressure', 'screw_recovery', 'Back Pressure', 'number', 'psi', 51),
  ('clamp.mold_close_speed', 'clamp_ejector', 'Mold Close Speed', 'number', 'mm/s', 71),
  ('clamp.mold_close_pressure', 'clamp_ejector', 'Mold Close Pressure', 'number', 'psi', 73),
  ('clamp.mold_open_speed', 'clamp_ejector', 'Mold Open Speed', 'number', 'mm/s', 74)
ON CONFLICT (parameter_key) DO UPDATE SET
  section_key = EXCLUDED.section_key,
  display_name = EXCLUDED.display_name,
  data_type = EXCLUDED.data_type,
  default_unit = EXCLUDED.default_unit,
  sort_order = EXCLUDED.sort_order,
  status = 'active',
  updated_at = now();

UPDATE machine_parameter_capabilities AS capability
SET status = 'inactive', updated_at = now()
FROM machines AS machine
WHERE capability.machine_id = machine.id
  AND machine.machine_code = 'BOY-125E'
  AND (
    (capability.parameter_key IN ('hold.pressure', 'hold.time') AND capability.position_index = 3)
    OR capability.parameter_key IN (
      'clamp.close_speed_fast',
      'clamp.close_speed_slow',
      'clamp.close_pressure',
      'clamp.open_speed_fast',
      'clamp.open_speed_slow',
      'clamp.mold_close_speed_fast',
      'clamp.mold_close_speed_slow',
      'clamp.mold_open_speed_fast',
      'clamp.mold_open_speed_slow'
    )
  );

WITH capability(parameter_key, display_name, section_key, position_type, position_index, position_label, unit, sort_order) AS (
  SELECT 'injection.speed', 'Injection Speed', 'injection', 'stage', stage, 'Stage ' || stage, 'mm/s', 40 + stage
  FROM generate_series(0, 8) AS stage
  UNION ALL
  SELECT 'injection.pressure', 'Injection Pressure', 'injection', 'stage', stage, 'Stage ' || stage, 'psi', 50 + stage
  FROM generate_series(0, 8) AS stage
  UNION ALL
  SELECT * FROM (VALUES
    ('injection.vp_transfer_position', 'V/P Transfer Position', 'injection', 'single', 0, 'Single', 'mm', 60),
    ('injection.shot_size', 'Shot Size (Stroke)', 'injection', 'single', 0, 'Single', 'mm', 61),
    ('injection.cushion', 'Cushion', 'injection', 'single', 0, 'Single', 'mm', 62),
    ('injection.fill_time', 'Fill Time', 'injection', 'single', 0, 'Single', 'sec', 63),
    ('hold.pressure', 'Hold Pressure', 'hold_pack', 'stage', 1, 'Hold Stage 1', 'psi', 70),
    ('hold.pressure', 'Hold Pressure', 'hold_pack', 'stage', 2, 'Hold Stage 2', 'psi', 71),
    ('hold.time', 'Hold Time', 'hold_pack', 'stage', 1, 'Hold Stage 1', 'sec', 72),
    ('hold.time', 'Hold Time', 'hold_pack', 'stage', 2, 'Hold Stage 2', 'sec', 73),
    ('screw.speed', 'Screw Speed', 'screw_recovery', 'single', 0, 'Single', 'RPM', 80),
    ('screw.back_pressure', 'Back Pressure', 'screw_recovery', 'single', 0, 'Single', 'psi', 81),
    ('screw.decompression', 'Decompression (Suck-back)', 'screw_recovery', 'single', 0, 'Single', 'mm', 82),
    ('screw.recovery_time', 'Recovery Time', 'screw_recovery', 'single', 0, 'Single', 'sec', 83),
    ('screw.diameter', 'Screw Diameter', 'screw_recovery', 'single', 0, 'Single', 'mm', 84),
    ('screw.ld_ratio', 'L/D Ratio', 'screw_recovery', 'single', 0, 'Single', NULL, 85),
    ('cycle.cooling_time', 'Cooling Time', 'cooling_cycle', 'single', 0, 'Single', 'sec', 90),
    ('cycle.total_time', 'Total Cycle Time', 'cooling_cycle', 'single', 0, 'Single', 'sec', 91),
    ('cycle.mold_open_time', 'Mold Open Time', 'cooling_cycle', 'single', 0, 'Single', 'sec', 92),
    ('cycle.mold_close_time', 'Mold Close Time', 'cooling_cycle', 'single', 0, 'Single', 'sec', 93),
    ('cycle.ejector_forward_time', 'Ejector Forward Time', 'cooling_cycle', 'single', 0, 'Single', 'sec', 94),
    ('cycle.ejector_return_time', 'Ejector Return Time', 'cooling_cycle', 'single', 0, 'Single', 'sec', 95),
    ('cycle.ejector_strokes', 'Ejector Strokes', 'cooling_cycle', 'single', 0, 'Single', 'count', 96),
    ('clamp.force', 'Clamp Force', 'clamp_ejector', 'single', 0, 'Single', 'kN', 100),
    ('clamp.mold_close_speed', 'Mold Close Speed', 'clamp_ejector', 'single', 0, 'Single', 'mm/s', 101),
    ('clamp.mold_close_pressure', 'Mold Close Pressure', 'clamp_ejector', 'single', 0, 'Single', 'psi', 102),
    ('clamp.mold_open_speed', 'Mold Open Speed', 'clamp_ejector', 'single', 0, 'Single', 'mm/s', 103),
    ('clamp.low_pressure_protection', 'Low Pressure Protection', 'clamp_ejector', 'single', 0, 'Single', 'bar', 104),
    ('clamp.ejector_forward_position', 'Ejector Forward Position', 'clamp_ejector', 'single', 0, 'Single', 'mm', 105),
    ('clamp.ejector_forward_speed', 'Ejector Forward Speed', 'clamp_ejector', 'single', 0, 'Single', 'mm/s', 106),
    ('clamp.ejector_retract_speed', 'Ejector Retract Speed', 'clamp_ejector', 'single', 0, 'Single', 'mm/s', 107)
  ) AS revised(parameter_key, display_name, section_key, position_type, position_index, position_label, unit, sort_order)
)
INSERT INTO machine_parameter_capabilities
  (machine_id, parameter_key, display_name, section_key, position_type, position_index, position_label, unit, sort_order)
SELECT machine.id, capability.parameter_key, capability.display_name, capability.section_key, capability.position_type,
       capability.position_index, capability.position_label, capability.unit, capability.sort_order
FROM machines AS machine
CROSS JOIN capability
WHERE machine.machine_code = 'BOY-125E'
ON CONFLICT (machine_id, parameter_key, position_type, position_index, position_label)
DO UPDATE SET display_name = EXCLUDED.display_name,
              section_key = EXCLUDED.section_key,
              unit = EXCLUDED.unit,
              sort_order = EXCLUDED.sort_order,
              status = 'active',
              updated_at = now();
