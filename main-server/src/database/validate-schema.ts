import { config } from '../config/env';
import { createDatabaseClient } from './migration-runner';

const REQUIRED_TABLES = [
  'formulations',
  'materials',
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
  'audit_log',
] as const;

const REQUIRED_INDEXES = [
  'idx_formulations_produced_date',
  'idx_formulation_materials_formulation',
  'idx_test_results_formulation',
  'idx_durability_results_formulation',
  'idx_environmental_results_formulation',
  'idx_subjective_ratings_formulation',
  'idx_benchmark_targets_benchmark',
  'idx_ball_testing_sheets_batch',
  'idx_ball_testing_samples_sheet',
] as const;

const REQUIRED_FOREIGN_KEYS = [
  { table: 'formulation_materials', column: 'formulation_id', references: 'formulations' },
  { table: 'formulation_materials', column: 'material_id', references: 'materials' },
  { table: 'processing_runs', column: 'formulation_id', references: 'formulations' },
  { table: 'test_results', column: 'formulation_id', references: 'formulations' },
  { table: 'durability_results', column: 'formulation_id', references: 'formulations' },
  { table: 'environmental_results', column: 'formulation_id', references: 'formulations' },
  { table: 'subjective_ratings', column: 'formulation_id', references: 'formulations' },
  { table: 'benchmark_metric_targets', column: 'benchmark_id', references: 'benchmark_profiles' },
  { table: 'ball_testing_import_sheets', column: 'batch_id', references: 'ball_testing_import_batches' },
  { table: 'ball_testing_import_samples', column: 'import_sheet_id', references: 'ball_testing_import_sheets' },
] as const;

function assertCheck(condition: boolean, label: string): void {
  if (!condition) {
    throw new Error(label);
  }
  console.log(`  ✓ ${label}`);
}

async function run(): Promise<void> {
  const client = createDatabaseClient();

  await client.connect();
  console.log(`[validate-schema] Connected to ${config.db.name}`);

  try {
    console.log('[validate-schema] Checking required tables');
    for (const table of REQUIRED_TABLES) {
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
      assertCheck(result.rows[0]?.exists === true, `table ${table} exists`);
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

    console.log('[validate-schema] Checking foreign keys');
    for (const fk of REQUIRED_FOREIGN_KEYS) {
      const result = await client.query<{ exists: boolean }>(
        `
          SELECT EXISTS (
            SELECT 1
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu
              ON ccu.constraint_name = tc.constraint_name
             AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema = 'public'
              AND tc.table_name = $1
              AND kcu.column_name = $2
              AND ccu.table_name = $3
          ) AS exists
        `,
        [fk.table, fk.column, fk.references]
      );
      assertCheck(
        result.rows[0]?.exists === true,
        `foreign key ${fk.table}.${fk.column} -> ${fk.references}.id exists`
      );
    }

    console.log('[validate-schema] Checking seeded data');
    const formulations = await client.query<{ count: string }>('SELECT COUNT(*) AS count FROM formulations');
    const benchmarks = await client.query<{ count: string }>('SELECT COUNT(*) AS count FROM benchmark_profiles');
    const metrics = await client.query<{ count: string }>('SELECT COUNT(*) AS count FROM benchmark_metric_targets');

    assertCheck(Number(formulations.rows[0]?.count ?? '0') >= 2, 'seeded formulations available');
    assertCheck(Number(benchmarks.rows[0]?.count ?? '0') >= 2, 'seeded benchmark profiles available');
    assertCheck(Number(metrics.rows[0]?.count ?? '0') >= 40, 'seeded benchmark metrics available');

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
