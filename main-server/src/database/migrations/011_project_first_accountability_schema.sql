-- Migration 011: Project-first accountability schema

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenant_status') THEN
    CREATE TYPE tenant_status AS ENUM ('active', 'inactive', 'archived');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
    CREATE TYPE project_status AS ENUM ('draft', 'active', 'paused', 'blocked', 'at_risk', 'completed', 'cancelled', 'archived');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_definition_status') THEN
    CREATE TYPE project_definition_status AS ENUM ('incomplete', 'complete', 'needs_review', 'approved', 'archived');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_member_role') THEN
    CREATE TYPE project_member_role AS ENUM (
      'creator',
      'owner',
      'sponsor',
      'contributor',
      'reviewer',
      'observer',
      'external_counterparty',
      'ai_suggested'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_source') THEN
    CREATE TYPE assignment_source AS ENUM ('manual', 'ai_inferred', 'source_participant', 'system');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_member_status') THEN
    CREATE TYPE project_member_status AS ENUM ('active', 'pending_review', 'removed', 'excluded', 'inactive');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status') THEN
    CREATE TYPE review_status AS ENUM ('pending_review', 'approved', 'rejected', 'needs_changes', 'not_required');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exclusion_scope') THEN
    CREATE TYPE exclusion_scope AS ENUM ('tenant', 'project', 'source_account', 'person');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exclusion_rule_type') THEN
    CREATE TYPE exclusion_rule_type AS ENUM (
      'person',
      'email_address',
      'domain',
      'subject_contains',
      'meeting_title_contains',
      'project',
      'keyword',
      'source_account'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exclusion_action') THEN
    CREATE TYPE exclusion_action AS ENUM ('exclude_from_ingestion', 'exclude_from_project_linking', 'exclude_from_ai_extraction');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'source_type') THEN
    CREATE TYPE source_type AS ENUM ('email', 'transcript', 'calendar_event', 'manual_note');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'source_account_provider') THEN
    CREATE TYPE source_account_provider AS ENUM ('outlook', 'read_ai', 'calendar', 'manual', 'other');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'source_account_status') THEN
    CREATE TYPE source_account_status AS ENUM ('connected', 'paused', 'error', 'disconnected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ingestion_processing_status') THEN
    CREATE TYPE ingestion_processing_status AS ENUM (
      'pending_project_linking',
      'linked',
      'pending_extraction',
      'extracted',
      'excluded',
      'failed'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'source_project_link_source') THEN
    CREATE TYPE source_project_link_source AS ENUM ('manual', 'subject_tag', 'ai_inference', 'meeting_context', 'thread_history');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'extraction_run_status') THEN
    CREATE TYPE extraction_run_status AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'extracted_signal_type') THEN
    CREATE TYPE extracted_signal_type AS ENUM (
      'status_update',
      'commitment',
      'decision',
      'risk',
      'blocker',
      'due_date_change',
      'owner_change',
      'idea',
      'closure',
      'question'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_item_type') THEN
    CREATE TYPE project_item_type AS ENUM (
      'commitment',
      'task',
      'decision',
      'risk',
      'blocker',
      'idea',
      'milestone',
      'status_update',
      'closure'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_item_status') THEN
    CREATE TYPE project_item_status AS ENUM ('active', 'completed', 'cancelled', 'blocked', 'deferred', 'archived');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_item_priority') THEN
    CREATE TYPE project_item_priority AS ENUM ('low', 'normal', 'high', 'urgent');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status_update_type') THEN
    CREATE TYPE project_status_update_type AS ENUM ('manual_update', 'ai_summary', 'weekly_summary', 'milestone_update');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_health_status') THEN
    CREATE TYPE project_health_status AS ENUM ('on_track', 'at_risk', 'blocked', 'unknown', 'completed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'generated_by') THEN
    CREATE TYPE generated_by AS ENUM ('ai', 'user', 'system');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_event_type') THEN
    CREATE TYPE project_event_type AS ENUM (
      'created',
      'definition_changed',
      'member_added',
      'member_removed',
      'source_linked',
      'signal_extracted',
      'item_created',
      'item_updated',
      'status_updated',
      'exclusion_changed'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'actor_type') THEN
    CREATE TYPE actor_type AS ENUM ('user', 'ai', 'system');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_queue_status') THEN
    CREATE TYPE review_queue_status AS ENUM ('pending', 'approved', 'rejected', 'dismissed');
  END IF;
END $$;

ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS tenant_id UUID;

CREATE INDEX IF NOT EXISTS idx_app_users_tenant ON app_users(tenant_id);
