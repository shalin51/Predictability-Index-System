import { config, initializeConfig } from '../config/env';
import { createDatabaseClient } from './migration-runner';

const TABLES_IN_DELETE_ORDER = [
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
] as const;

const AUDIT_TABLES = [...TABLES_IN_DELETE_ORDER] as const;

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function main(): Promise<void> {
  await initializeConfig();
  if (!['dev', 'development'].includes(config.appEnv) || config.nodeEnv === 'production') {
    throw new Error(`Purge is restricted to development; received APP_ENV=${config.appEnv}, NODE_ENV=${config.nodeEnv}`);
  }

  const client = createDatabaseClient();
  await client.connect();
  try {
    await client.query('BEGIN');
    const deleted: Record<string, number> = {};
    for (const table of TABLES_IN_DELETE_ORDER) {
      const result = await client.query(`DELETE FROM ${quoteIdentifier(table)}`);
      deleted[table] = result.rowCount ?? 0;
    }

    const auditLog = await client.query('DELETE FROM audit_log WHERE table_name = ANY($1::text[])', [AUDIT_TABLES]);
    const auditLogs = await client.query('DELETE FROM audit_logs WHERE entity_type = ANY($1::text[])', [AUDIT_TABLES]);
    deleted.audit_log = auditLog.rowCount ?? 0;
    deleted.audit_logs = auditLogs.rowCount ?? 0;

    for (const table of TABLES_IN_DELETE_ORDER) {
      const result = await client.query<{ count: string }>(`SELECT count(*)::text AS count FROM ${quoteIdentifier(table)}`);
      if (result.rows[0]?.count !== '0') throw new Error(`Verification failed for ${table}`);
    }

    await client.query('COMMIT');
    console.log(JSON.stringify({ deleted }, null, 2));
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
