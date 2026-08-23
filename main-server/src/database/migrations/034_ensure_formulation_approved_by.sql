-- Migration 034: Ensure formulation approver is available for existing databases.

ALTER TABLE formulations
  ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255);
