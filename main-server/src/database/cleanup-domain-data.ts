import { config, initializeConfig } from '../config/env';
import { createDatabaseClient } from './migration-runner';

const PRESERVED_MACHINE_CODE = 'BOY-125E';
const DEMO_LAB_USER_ID = '40000001-0000-0000-0000-000000000001';

const DOMAIN_TABLES_IN_DELETE_ORDER = [
  'generated_reports',
  'score_report_metrics',
  'score_reports',
  'run_metric_summaries',
  'sample_subjective_ratings',
  'environmental_test_results',
  'sample_observations',
  'sample_test_results',
  'material_drying_events',
  'production_run_material_lots',
  'production_run_notes',
  'production_run_process_values',
  'samples',
  'production_runs',
  'process_setup_revision_log_entries',
  'process_setup_revision_parameters',
  'process_setup_revisions',
  'setup_sheet_imports',
  'formulation_components',
  'formulations',
  'mold_zones',
  'molds',
] as const;

const AUDITED_DOMAIN_TABLES = [
  ...DOMAIN_TABLES_IN_DELETE_ORDER,
  'machines',
  'machine_parameter_capabilities',
] as const;

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function main(): Promise<void> {
  await initializeConfig();

  if (!['dev', 'development'].includes(config.appEnv) || config.nodeEnv === 'production') {
    throw new Error(`Cleanup is restricted to development; received APP_ENV=${config.appEnv}, NODE_ENV=${config.nodeEnv}`);
  }

  const client = createDatabaseClient();
  await client.connect();

  try {
    await client.query('BEGIN');

    const preservedMachine = await client.query<{ id: string }>(
      'SELECT id FROM machines WHERE machine_code = $1',
      [PRESERVED_MACHINE_CODE]
    );
    if (preservedMachine.rowCount !== 1) {
      throw new Error(`Expected exactly one ${PRESERVED_MACHINE_CODE} machine before cleanup`);
    }

    await client.query('UPDATE material_processing_profiles SET source_import_id = NULL WHERE source_import_id IS NOT NULL');

    const deletedCounts: Record<string, number> = {};
    for (const table of DOMAIN_TABLES_IN_DELETE_ORDER) {
      const result = await client.query(`DELETE FROM ${quoteIdentifier(table)}`);
      deletedCounts[table] = result.rowCount ?? 0;
    }

    const deletedMachines = await client.query(
      'DELETE FROM machines WHERE machine_code <> $1',
      [PRESERVED_MACHINE_CODE]
    );
    deletedCounts.machines = deletedMachines.rowCount ?? 0;

    const deletedDemoLabUser = await client.query(
      `DELETE FROM app_users
       WHERE id = $1
         AND email = 'lab.team@example.com'`,
      [DEMO_LAB_USER_ID]
    );
    deletedCounts.demoLabUsers = deletedDemoLabUser.rowCount ?? 0;

    await client.query(
      `DELETE FROM audit_log
       WHERE table_name = ANY($1::text[])
         AND NOT (table_name = 'machines' AND record_id = $2::uuid)`,
      [AUDITED_DOMAIN_TABLES, preservedMachine.rows[0].id]
    );

    await client.query(
      `DELETE FROM audit_logs
       WHERE entity_type = ANY($1::text[])
         AND NOT (entity_type = 'machines' AND entity_id = $2::uuid)`,
      [AUDITED_DOMAIN_TABLES, preservedMachine.rows[0].id]
    );

    for (const table of DOMAIN_TABLES_IN_DELETE_ORDER) {
      const remaining = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM ${quoteIdentifier(table)}`
      );
      if (remaining.rows[0].count !== '0') {
        throw new Error(`Cleanup verification failed for ${table}`);
      }
    }

    const remainingMachines = await client.query<{ machine_code: string }>(
      'SELECT machine_code FROM machines ORDER BY machine_code'
    );
    if (remainingMachines.rowCount !== 1 || remainingMachines.rows[0].machine_code !== PRESERVED_MACHINE_CODE) {
      throw new Error('Cleanup verification failed for machines');
    }

    await client.query('COMMIT');
    console.log(JSON.stringify({ deleted: deletedCounts, preservedMachine: PRESERVED_MACHINE_CODE }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
