-- Migration 021: Defaults required by the simplified Materials editor.

ALTER TABLE materials
  ALTER COLUMN material_type SET DEFAULT 'polymer';

