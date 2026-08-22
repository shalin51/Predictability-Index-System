-- Migration: Historic Data Table for Rollback Capability
-- Purpose: Store JSON dumps of overwritten/deleted records for audit and rollback
-- Created: 2026-08-21

-- Create historic_data table
CREATE TABLE IF NOT EXISTS historic_data (
    id SERIAL PRIMARY KEY,
    resource_type VARCHAR(100) NOT NULL,
    record_id VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('overwrite', 'delete')),
    data_json JSONB NOT NULL,
    actor VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Create indexes for efficient querying
CREATE INDEX idx_historic_data_resource_type ON historic_data(resource_type);
CREATE INDEX idx_historic_data_record_id ON historic_data(record_id);
CREATE INDEX idx_historic_data_action ON historic_data(action);
CREATE INDEX idx_historic_data_created_at ON historic_data(created_at);
CREATE INDEX idx_historic_data_composite ON historic_data(resource_type, record_id, created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE historic_data IS 'Stores historical snapshots of records before overwrite or delete operations for audit trail and rollback capability';
COMMENT ON COLUMN historic_data.id IS 'Auto-incrementing primary key';
COMMENT ON COLUMN historic_data.resource_type IS 'Type of resource (machines, materials, formulations, etc.)';
COMMENT ON COLUMN historic_data.record_id IS 'Original ID of the record in its source table';
COMMENT ON COLUMN historic_data.action IS 'Type of action performed: overwrite or delete';
COMMENT ON COLUMN historic_data.data_json IS 'Complete JSON dump of the record before the action';
COMMENT ON COLUMN historic_data.actor IS 'User or system that performed the action';
COMMENT ON COLUMN historic_data.created_at IS 'Timestamp when the record was archived';
COMMENT ON COLUMN historic_data.notes IS 'Optional notes about the action';
