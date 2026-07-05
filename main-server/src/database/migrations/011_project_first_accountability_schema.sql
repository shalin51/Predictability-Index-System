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

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(120) UNIQUE NOT NULL,
  status tenant_status NOT NULL DEFAULT 'active',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  organization VARCHAR(255),
  title VARCHAR(255),
  is_internal BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  normalized_name VARCHAR(255) NOT NULL,
  description TEXT,
  status project_status NOT NULL DEFAULT 'draft',
  creator_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  owner_person_id UUID REFERENCES people(id) ON DELETE SET NULL,
  sponsor_person_id UUID REFERENCES people(id) ON DELETE SET NULL,
  start_date DATE,
  target_end_date DATE,
  actual_end_date DATE,
  current_definition_version_id UUID,
  definition_completeness_score INT NOT NULL DEFAULT 0 CHECK (definition_completeness_score BETWEEN 0 AND 100),
  is_definition_complete BOOLEAN NOT NULL DEFAULT false,
  owner_controlled_visibility BOOLEAN NOT NULL DEFAULT true,
  restricted_visibility BOOLEAN NOT NULL DEFAULT false,
  creation_method VARCHAR(50) NOT NULL DEFAULT 'manual',
  first_source_item_id UUID,
  allow_ai_updates BOOLEAN NOT NULL DEFAULT true,
  allow_ai_member_suggestions BOOLEAN NOT NULL DEFAULT true,
  require_review_before_status_update BOOLEAN NOT NULL DEFAULT true,
  active_item_count INT NOT NULL DEFAULT 0,
  overdue_item_count INT NOT NULL DEFAULT 0,
  risk_count INT NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, normalized_name)
);

CREATE TABLE IF NOT EXISTS project_definition_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INT NOT NULL,
  definition_status project_definition_status NOT NULL DEFAULT 'incomplete',
  summary TEXT,
  objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
  goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  acceptance_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  scope JSONB NOT NULL DEFAULT '{"included":[],"excluded":[]}'::jsonb,
  constraints_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  assumptions JSONB NOT NULL DEFAULT '[]'::jsonb,
  success_metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, version)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_projects_current_definition_version'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT fk_projects_current_definition_version
      FOREIGN KEY (current_definition_version_id)
      REFERENCES project_definition_versions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  role project_member_role NOT NULL,
  assignment_source assignment_source NOT NULL DEFAULT 'manual',
  status project_member_status NOT NULL DEFAULT 'active',
  confidence NUMERIC(4,3) NOT NULL DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  responsibilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  added_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  added_from_ingestion_item_id UUID,
  review_status review_status NOT NULL DEFAULT 'approved',
  reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, person_id, role)
);

CREATE TABLE IF NOT EXISTS source_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  owner_person_id UUID REFERENCES people(id) ON DELETE SET NULL,
  provider source_account_provider NOT NULL,
  source_type source_type NOT NULL,
  external_account_id VARCHAR(255),
  display_name VARCHAR(255) NOT NULL,
  status source_account_status NOT NULL DEFAULT 'connected',
  sync_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider, external_account_id)
);

CREATE TABLE IF NOT EXISTS exclusion_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  scope exclusion_scope NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  source_account_id UUID REFERENCES source_accounts(id) ON DELETE CASCADE,
  rule_type exclusion_rule_type NOT NULL,
  value_text TEXT,
  value_uuid UUID,
  action exclusion_action NOT NULL,
  reason TEXT,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  owner_person_id UUID REFERENCES people(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (value_text IS NOT NULL OR value_uuid IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS ingestion_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_type source_type NOT NULL,
  source_account_id UUID REFERENCES source_accounts(id) ON DELETE SET NULL,
  external_id VARCHAR(500) NOT NULL,
  thread_id VARCHAR(500),
  title TEXT NOT NULL,
  from_person_id UUID REFERENCES people(id) ON DELETE SET NULL,
  to_person_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  cc_person_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  occurred_at TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  body_text_ref TEXT,
  redacted_preview TEXT,
  exclusion_checked BOOLEAN NOT NULL DEFAULT false,
  exclusion_excluded BOOLEAN NOT NULL DEFAULT false,
  matched_rule_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  processing_status ingestion_processing_status NOT NULL DEFAULT 'pending_project_linking',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, source_account_id, external_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_projects_first_source_item'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT fk_projects_first_source_item
      FOREIGN KEY (first_source_item_id)
      REFERENCES ingestion_items(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_project_members_added_from_ingestion_item'
  ) THEN
    ALTER TABLE project_members
      ADD CONSTRAINT fk_project_members_added_from_ingestion_item
      FOREIGN KEY (added_from_ingestion_item_id)
      REFERENCES ingestion_items(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS source_project_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ingestion_item_id UUID NOT NULL REFERENCES ingestion_items(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  link_source source_project_link_source NOT NULL,
  confidence NUMERIC(4,3) NOT NULL DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  matched_text TEXT,
  review_status review_status NOT NULL DEFAULT 'approved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ingestion_item_id, project_id)
);

CREATE TABLE IF NOT EXISTS extraction_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  ingestion_item_id UUID REFERENCES ingestion_items(id) ON DELETE CASCADE,
  status extraction_run_status NOT NULL DEFAULT 'queued',
  model_name VARCHAR(150),
  prompt_version VARCHAR(100),
  input_ref TEXT,
  output_ref TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS extracted_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  ingestion_item_id UUID NOT NULL REFERENCES ingestion_items(id) ON DELETE CASCADE,
  extraction_run_id UUID REFERENCES extraction_runs(id) ON DELETE SET NULL,
  signal_type extracted_signal_type NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  detected_people JSONB NOT NULL DEFAULT '[]'::jsonb,
  due_date DATE,
  confidence NUMERIC(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  evidence_excerpt TEXT,
  evidence_source_location TEXT,
  review_status review_status NOT NULL DEFAULT 'pending_review',
  converted_to_project_item_id UUID,
  converted_to_status_update_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item_type project_item_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  owner_person_id UUID REFERENCES people(id) ON DELETE SET NULL,
  assigned_by_person_id UUID REFERENCES people(id) ON DELETE SET NULL,
  status project_item_status NOT NULL DEFAULT 'active',
  priority project_item_priority NOT NULL DEFAULT 'normal',
  due_date DATE,
  creation_method VARCHAR(50) NOT NULL DEFAULT 'manual',
  ingestion_item_id UUID REFERENCES ingestion_items(id) ON DELETE SET NULL,
  extracted_signal_id UUID REFERENCES extracted_signals(id) ON DELETE SET NULL,
  source_confidence NUMERIC(4,3) CHECK (source_confidence IS NULL OR (source_confidence >= 0 AND source_confidence <= 1)),
  review_status review_status NOT NULL DEFAULT 'approved',
  reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  show_on_project_dashboard BOOLEAN NOT NULL DEFAULT true,
  show_on_person_ledger BOOLEAN NOT NULL DEFAULT true,
  is_overdue BOOLEAN NOT NULL DEFAULT false,
  is_blocker BOOLEAN NOT NULL DEFAULT false,
  is_recent_movement BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_status_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status_type project_status_update_type NOT NULL,
  health_status project_health_status NOT NULL DEFAULT 'unknown',
  summary TEXT NOT NULL,
  percent_complete NUMERIC(5,2) CHECK (percent_complete IS NULL OR (percent_complete >= 0 AND percent_complete <= 100)),
  progress_confidence NUMERIC(4,3) CHECK (progress_confidence IS NULL OR (progress_confidence >= 0 AND progress_confidence <= 1)),
  highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  risks JSONB NOT NULL DEFAULT '[]'::jsonb,
  blockers JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_signal_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  source_ingestion_item_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  generated_by generated_by NOT NULL DEFAULT 'ai',
  review_status review_status NOT NULL DEFAULT 'pending_review',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_extracted_signals_project_item'
  ) THEN
    ALTER TABLE extracted_signals
      ADD CONSTRAINT fk_extracted_signals_project_item
      FOREIGN KEY (converted_to_project_item_id)
      REFERENCES project_items(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_extracted_signals_status_update'
  ) THEN
    ALTER TABLE extracted_signals
      ADD CONSTRAINT fk_extracted_signals_status_update
      FOREIGN KEY (converted_to_status_update_id)
      REFERENCES project_status_updates(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS project_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  event_type project_event_type NOT NULL,
  actor_type actor_type NOT NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  old_value JSONB,
  new_value JSONB,
  ingestion_item_id UUID REFERENCES ingestion_items(id) ON DELETE SET NULL,
  extracted_signal_id UUID REFERENCES extracted_signals(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  reason TEXT,
  confidence NUMERIC(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  status review_queue_status NOT NULL DEFAULT 'pending',
  assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  decision_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_type actor_type NOT NULL DEFAULT 'system',
  event_name VARCHAR(150) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_app_users_tenant ON app_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_people_tenant ON people(tenant_id);
CREATE INDEX IF NOT EXISTS idx_people_email ON people(email);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_status ON projects(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_person_id);
CREATE INDEX IF NOT EXISTS idx_project_definition_versions_project ON project_definition_versions(project_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_person ON project_members(person_id);
CREATE INDEX IF NOT EXISTS idx_exclusion_rules_project ON exclusion_rules(project_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_source_accounts_tenant_provider ON source_accounts(tenant_id, provider);
CREATE INDEX IF NOT EXISTS idx_ingestion_items_tenant_status ON ingestion_items(tenant_id, processing_status);
CREATE INDEX IF NOT EXISTS idx_ingestion_items_thread ON ingestion_items(thread_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_items_occurred ON ingestion_items(occurred_at);
CREATE INDEX IF NOT EXISTS idx_source_project_links_project ON source_project_links(project_id);
CREATE INDEX IF NOT EXISTS idx_extraction_runs_project ON extraction_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_extracted_signals_project_review ON extracted_signals(project_id, review_status);
CREATE INDEX IF NOT EXISTS idx_project_items_project_status ON project_items(project_id, status);
CREATE INDEX IF NOT EXISTS idx_project_items_owner_status ON project_items(owner_person_id, status);
CREATE INDEX IF NOT EXISTS idx_project_items_due_date ON project_items(due_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_project_status_updates_project_created ON project_status_updates(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_events_project_created ON project_events(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_queue_status ON review_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at);

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'tenants',
    'people',
    'projects',
    'project_members',
    'source_accounts',
    'exclusion_rules',
    'ingestion_items',
    'source_project_links',
    'extraction_runs',
    'extracted_signals',
    'project_items',
    'project_status_updates',
    'review_queue'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = format('trg_%s_updated_at', tbl)
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER trg_%I_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        tbl,
        tbl
      );
    END IF;
  END LOOP;
END;
$$;
