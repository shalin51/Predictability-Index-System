import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config/env';
import { createPgClientConfig } from '../infrastructure/database/pg-config';

const MIGRATIONS_DIR = path.resolve(__dirname, 'migrations');
const SEEDS_DIR = path.resolve(__dirname, 'seeds');

function getSqlFiles(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort();
}

export function createDatabaseClient(): Client {
  return new Client(
    createPgClientConfig({
      database: config.db.name,
      connectionTimeoutMillis: 10_000,
    })
  );
}

export async function resetDatabase(client: Client): Promise<void> {
  await client.query('DROP VIEW IF EXISTS ml_training_export CASCADE');
  await client.query('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE');
  await client.query(`
    DROP TABLE IF EXISTS
      score_report_metrics,
      score_reports,
      algorithm_versions,
      run_metric_summaries,
      sample_subjective_ratings,
      test_panelists,
      environmental_test_results,
      sample_observations,
      sample_test_results,
      test_condition_definitions,
      test_method_definitions,
      metric_definitions,
      samples,
      production_run_settings,
      production_runs,
      audit_events,
      review_queue,
      project_events,
      project_status_updates,
      project_items,
      extracted_signals,
      extraction_runs,
      source_project_links,
      ingestion_items,
      exclusion_rules,
      source_accounts,
      project_members,
      project_definition_versions,
      projects,
      people,
      tenants,
      formulation_components,
      formulation_versions,
      formulation_families,
      experiments,
      material_lots,
      supplier_materials,
      molds,
      machines,
      audit_logs,
      user_roles,
      app_users,
      roles,
      request_logs,
      ball_testing_import_samples,
      ball_testing_import_sheets,
      ball_testing_import_batches,
      users,
      api_versions,
      audit_log,
      subjective_ratings,
      environmental_results,
      durability_results,
      test_results,
      processing_runs,
      formulation_materials,
      benchmark_metric_targets,
      benchmark_profiles,
      formulations,
      materials,
      suppliers,
      _migrations
    CASCADE
  `);
  await client.query(`
    DROP TYPE IF EXISTS
      criticality_level,
      traffic_light,
      review_queue_status,
      actor_type,
      project_event_type,
      generated_by,
      project_health_status,
      project_status_update_type,
      project_item_priority,
      project_item_status,
      project_item_type,
      extracted_signal_type,
      extraction_run_status,
      source_project_link_source,
      ingestion_processing_status,
      source_account_status,
      source_account_provider,
      source_type,
      exclusion_action,
      exclusion_rule_type,
      exclusion_scope,
      review_status,
      project_member_status,
      assignment_source,
      project_member_role,
      project_definition_status,
      project_status,
      tenant_status,
      metric_data_type,
      metric_category,
      sample_status,
      run_status,
      formulation_status,
      record_status
    CASCADE
  `);
}

export async function ensureMigrationTable(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         SERIAL PRIMARY KEY,
      filename   TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function applyMigrations(client: Client): Promise<void> {
  await ensureMigrationTable(client);

  for (const file of getSqlFiles(MIGRATIONS_DIR)) {
    const applied = await client.query(
      'SELECT 1 FROM _migrations WHERE filename = $1',
      [file]
    );

    if ((applied.rowCount ?? 0) > 0) {
      console.log(`[migrate]   skip ${file} (already applied)`);
      continue;
    }

    console.log(`[migrate]   apply ${file}`);
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    await client.query(sql);
    await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
    console.log(`[migrate]   ✓ ${file}`);
  }
}

export async function applySeeds(client: Client): Promise<void> {
  for (const file of getSqlFiles(SEEDS_DIR)) {
    console.log(`[migrate]   seed ${file}`);
    const sql = fs.readFileSync(path.join(SEEDS_DIR, file), 'utf8');
    await client.query(sql);
    console.log(`[migrate]   ✓ ${file}`);
  }
}
