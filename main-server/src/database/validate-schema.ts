import { config, initializeConfig } from '../config/env';
import { createDatabaseClient } from './migration-runner';

const REQUIRED_TABLES = [
  'suppliers',
  'materials',
  'audit_log',
  'api_versions',
  'users',
  'request_logs',
  'roles',
  'app_users',
  'user_roles',
  'audit_logs',
  'supplier_materials',
  'material_lots',
  'machines',
  'molds',
] as const;

const REMOVED_TABLES = [
  'formulations',
  'formulation_materials',
  'processing_runs',
  'test_results',
  'durability_results',
  'environmental_results',
  'subjective_ratings',
  'benchmark_profiles',
  'benchmark_metric_targets',
  'ball_testing_import_batches',
  'ball_testing_import_sheets',
  'ball_testing_import_samples',
  'formulation_families',
  'formulation_versions',
  'formulation_components',
  'production_runs',
  'samples',
  'metric_definitions',
  'score_reports',
] as const;

const REQUIRED_INDEXES = [
  'idx_audit_log_table_record',
  'idx_audit_log_created_at',
  'idx_request_logs_created_at',
  'idx_request_logs_status',
  'idx_audit_logs_entity',
] as const;

function assertCheck(condition: boolean, label: string): void {
  if (!condition) {
    throw new Error(label);
  }
  console.log(`  ✓ ${label}`);
}

async function tableExists(client: ReturnType<typeof createDatabaseClient>, table: string): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      ) AS exists
    `,
    [table]
  );
  return result.rows[0]?.exists === true;
}

async function run(): Promise<void> {
  await initializeConfig();
  const client = createDatabaseClient();

  await client.connect();
  console.log(`[validate-schema] Connected to ${config.db.name}`);

  try {
    console.log('[validate-schema] Checking required tables');
    for (const table of REQUIRED_TABLES) {
      assertCheck(await tableExists(client, table), `table ${table} exists`);
    }

    console.log('[validate-schema] Checking removed tables');
    for (const table of REMOVED_TABLES) {
      assertCheck(!(await tableExists(client, table)), `table ${table} removed`);
    }

    console.log('[validate-schema] Checking required indexes');
    for (const indexName of REQUIRED_INDEXES) {
      const result = await client.query<{ exists: boolean }>(
        `
          SELECT EXISTS (
            SELECT 1
            FROM pg_indexes
            WHERE schemaname = 'public' AND indexname = $1
          ) AS exists
        `,
        [indexName]
      );
      assertCheck(result.rows[0]?.exists === true, `index ${indexName} exists`);
    }

    console.log('[validate-schema] Schema validation passed');
  } finally {
    await client.end();
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[validate-schema] Failed: ${message}`);
  process.exit(1);
});
