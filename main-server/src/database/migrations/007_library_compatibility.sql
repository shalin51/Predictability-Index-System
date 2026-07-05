-- ============================================================
-- Migration 007: Library compatibility fixes for existing local schemas
-- ============================================================

ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS notes TEXT;
