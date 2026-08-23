-- Migration 033: Supplier is optional for formulation components.

ALTER TABLE formulation_components
  ALTER COLUMN supplier_id DROP NOT NULL;
