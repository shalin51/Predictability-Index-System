UPDATE machines
SET manufacturer = 'BOY Machines',
    machine_type = 'Injection molding',
    model_number = '125 E',
    specifications = specifications || '{"template":"BOY 125E Production Run v1"}'::jsonb
WHERE machine_code = 'BOY-125E';

WITH capability(parameter_key, display_name, section_key, position_type, position_index, position_label, unit, sort_order) AS (
  VALUES
    ('barrel.temperature', 'Barrel Temperature', 'barrel_temperature', 'zone', 1, 'Feed Zone', '°F', 10),
    ('barrel.temperature', 'Barrel Temperature', 'barrel_temperature', 'zone', 2, 'Compression Zone', '°F', 11),
    ('barrel.temperature', 'Barrel Temperature', 'barrel_temperature', 'zone', 3, 'Metering Zone', '°F', 12),
    ('barrel.temperature', 'Barrel Temperature', 'barrel_temperature', 'zone', 4, 'Front Zone', '°F', 13),
    ('barrel.temperature', 'Barrel Temperature', 'barrel_temperature', 'zone', 5, 'Nozzle', '°F', 14),
    ('mold.temperature', 'Mold Temperature', 'mold_temperature', 'circuit', 1, 'Cavity Side', '°F', 20),
    ('mold.temperature', 'Mold Temperature', 'mold_temperature', 'circuit', 2, 'Core Side', '°F', 21),
    ('mold.temperature', 'Mold Temperature', 'mold_temperature', 'circuit', 3, 'Slide 1', '°F', 22),
    ('mold.temperature', 'Mold Temperature', 'mold_temperature', 'circuit', 4, 'Slide 2', '°F', 23),
    ('mold.flow', 'Mold Circuit Flow', 'mold_temperature', 'circuit', 1, 'Cavity Side', 'GPM', 24),
    ('mold.flow', 'Mold Circuit Flow', 'mold_temperature', 'circuit', 2, 'Core Side', 'GPM', 25),
    ('mold.flow', 'Mold Circuit Flow', 'mold_temperature', 'circuit', 3, 'Slide 1', 'GPM', 26),
    ('mold.flow', 'Mold Circuit Flow', 'mold_temperature', 'circuit', 4, 'Slide 2', 'GPM', 27),
    ('mold.inlet_temperature', 'Mold Inlet Temperature', 'mold_temperature', 'circuit', 1, 'Cavity Side', '°F', 28),
    ('mold.inlet_temperature', 'Mold Inlet Temperature', 'mold_temperature', 'circuit', 2, 'Core Side', '°F', 29),
    ('mold.inlet_temperature', 'Mold Inlet Temperature', 'mold_temperature', 'circuit', 3, 'Slide 1', '°F', 30),
    ('mold.inlet_temperature', 'Mold Inlet Temperature', 'mold_temperature', 'circuit', 4, 'Slide 2', '°F', 31),
    ('mold.outlet_temperature', 'Mold Outlet Temperature', 'mold_temperature', 'circuit', 1, 'Cavity Side', '°F', 32),
    ('mold.outlet_temperature', 'Mold Outlet Temperature', 'mold_temperature', 'circuit', 2, 'Core Side', '°F', 33),
    ('mold.outlet_temperature', 'Mold Outlet Temperature', 'mold_temperature', 'circuit', 3, 'Slide 1', '°F', 34),
    ('mold.outlet_temperature', 'Mold Outlet Temperature', 'mold_temperature', 'circuit', 4, 'Slide 2', '°F', 35),
    ('injection.speed', 'Injection Speed', 'injection', 'stage', 1, 'Stage 1', 'mm/s', 40),
    ('injection.speed', 'Injection Speed', 'injection', 'stage', 2, 'Stage 2', 'mm/s', 41),
    ('injection.speed', 'Injection Speed', 'injection', 'stage', 3, 'Stage 3', 'mm/s', 42),
    ('injection.pressure', 'Injection Pressure', 'injection', 'stage', 1, 'Stage 1', 'bar', 43),
    ('injection.pressure', 'Injection Pressure', 'injection', 'stage', 2, 'Stage 2', 'bar', 44),
    ('injection.pressure', 'Injection Pressure', 'injection', 'stage', 3, 'Stage 3', 'bar', 45),
    ('injection.vp_transfer_position', 'V/P Transfer Position', 'injection', 'single', 0, 'Single', 'mm', 46),
    ('injection.shot_size', 'Shot Size (Stroke)', 'injection', 'single', 0, 'Single', 'mm', 47),
    ('injection.cushion', 'Cushion', 'injection', 'single', 0, 'Single', 'mm', 48),
    ('injection.fill_time', 'Fill Time', 'injection', 'single', 0, 'Single', 'sec', 49),
    ('hold.pressure', 'Hold Pressure', 'hold_pack', 'stage', 1, 'Hold Stage 1', 'bar', 50),
    ('hold.pressure', 'Hold Pressure', 'hold_pack', 'stage', 2, 'Hold Stage 2', 'bar', 51),
    ('hold.pressure', 'Hold Pressure', 'hold_pack', 'stage', 3, 'Hold Stage 3', 'bar', 52),
    ('hold.time', 'Hold Time', 'hold_pack', 'stage', 1, 'Hold Stage 1', 'sec', 53),
    ('hold.time', 'Hold Time', 'hold_pack', 'stage', 2, 'Hold Stage 2', 'sec', 54),
    ('hold.time', 'Hold Time', 'hold_pack', 'stage', 3, 'Hold Stage 3', 'sec', 55),
    ('screw.speed', 'Screw Speed', 'screw_recovery', 'single', 0, 'Single', 'RPM', 60),
    ('screw.back_pressure', 'Back Pressure', 'screw_recovery', 'single', 0, 'Single', 'bar', 61),
    ('screw.decompression', 'Decompression (Suck-back)', 'screw_recovery', 'single', 0, 'Single', 'mm', 62),
    ('screw.recovery_time', 'Recovery Time', 'screw_recovery', 'single', 0, 'Single', 'sec', 63),
    ('screw.diameter', 'Screw Diameter', 'screw_recovery', 'single', 0, 'Single', 'mm', 64),
    ('screw.ld_ratio', 'L/D Ratio', 'screw_recovery', 'single', 0, 'Single', NULL, 65),
    ('cycle.cooling_time', 'Cooling Time', 'cycle', 'single', 0, 'Single', 'sec', 70),
    ('cycle.total_time', 'Total Cycle Time', 'cycle', 'single', 0, 'Single', 'sec', 71),
    ('cycle.mold_open_time', 'Mold Open Time', 'cycle', 'single', 0, 'Single', 'sec', 72),
    ('cycle.mold_close_time', 'Mold Close Time', 'cycle', 'single', 0, 'Single', 'sec', 73),
    ('cycle.ejector_forward_time', 'Ejector Forward Time', 'cycle', 'single', 0, 'Single', 'sec', 74),
    ('cycle.ejector_return_time', 'Ejector Return Time', 'cycle', 'single', 0, 'Single', 'sec', 75),
    ('cycle.ejector_strokes', 'Ejector Strokes', 'cycle', 'single', 0, 'Single', 'count', 76),
    ('clamp.force', 'Clamp Force', 'clamp', 'single', 0, 'Single', 'kN', 80),
    ('clamp.close_speed_fast', 'Mold Close Speed — Fast', 'clamp', 'single', 0, 'Single', 'mm/s', 81),
    ('clamp.close_speed_slow', 'Mold Close Speed — Slow', 'clamp', 'single', 0, 'Single', 'mm/s', 82),
    ('clamp.close_pressure', 'Mold Close Pressure', 'clamp', 'single', 0, 'Single', 'bar', 83),
    ('clamp.open_speed_fast', 'Mold Open Speed — Fast', 'clamp', 'single', 0, 'Single', 'mm/s', 84),
    ('clamp.open_speed_slow', 'Mold Open Speed — Slow', 'clamp', 'single', 0, 'Single', 'mm/s', 85),
    ('clamp.low_pressure_protection', 'Low Pressure Protection', 'clamp', 'single', 0, 'Single', 'bar', 86),
    ('clamp.ejector_forward_position', 'Ejector Forward Position', 'clamp', 'single', 0, 'Single', 'mm', 87),
    ('clamp.ejector_forward_speed', 'Ejector Forward Speed', 'clamp', 'single', 0, 'Single', 'mm/s', 88),
    ('clamp.ejector_retract_speed', 'Ejector Retract Speed', 'clamp', 'single', 0, 'Single', 'mm/s', 89)
)
INSERT INTO machine_parameter_capabilities
  (machine_id, parameter_key, display_name, section_key, position_type, position_index, position_label, unit, sort_order)
SELECT m.id, c.parameter_key, c.display_name, c.section_key, c.position_type, c.position_index, c.position_label, c.unit, c.sort_order
FROM machines m CROSS JOIN capability c
WHERE m.machine_code = 'BOY-125E'
ON CONFLICT (machine_id, parameter_key, position_type, position_index, position_label)
DO UPDATE SET display_name = EXCLUDED.display_name, section_key = EXCLUDED.section_key,
              unit = EXCLUDED.unit, sort_order = EXCLUDED.sort_order, status = 'active', updated_at = now();
