import type { PoolClient } from 'pg';
import { getPool } from '../../../infrastructure/database/pg-pool';
import type { MissingRequiredMetricRecord, RunSummaryRecord } from '../runSummary.types';

export class RunSummaryRepository {
  async run(runId: string): Promise<RunSummaryRecord | null> {
    const result = await getPool().query(
      `SELECT pr.id, pr.run_code AS "runCode", pr.status::text AS "labTestingStatus",
              CONCAT(f.formulation_code, ' V', f.version_no) AS formulation,
              bp.benchmark_name AS "targetBenchmark",
              COALESCE(summary.summary_count, 0)::int AS "summaryCount",
              summary.last_generated_at AS "lastGeneratedAt",
              lab.latest_lab_update_at AS "latestLabUpdateAt"
       FROM production_runs pr
       JOIN formulations f ON f.id = pr.formulation_id
       LEFT JOIN benchmark_profiles bp ON bp.id = f.target_benchmark_id
       LEFT JOIN (
         SELECT production_run_id, COUNT(*) AS summary_count, MAX(generated_at) AS last_generated_at
         FROM run_metric_summaries
         GROUP BY production_run_id
       ) summary ON summary.production_run_id = pr.id
       LEFT JOIN LATERAL (${this.latestLabUpdateSql()}) lab ON true
       WHERE pr.id = $1`,
      [runId]
    );
    return (result.rows[0] as RunSummaryRecord | undefined) ?? null;
  }

  async summaries(runId: string): Promise<RunSummaryRecord[]> {
    const result = await getPool().query(
      `SELECT rms.id, rms.production_run_id AS "productionRunId",
              rms.metric_id AS "metricId", md.metric_key AS "metricKey",
              md.display_name AS "metricName", md.category::text AS category,
              rms.condition_id AS "conditionId", tc.condition_name AS "conditionName",
              rms.n_samples AS "nSamples", rms.mean_value::float AS "meanValue",
              rms.std_dev::float AS "stdDev", rms.min_value::float AS "minValue",
              rms.max_value::float AS "maxValue", rms.unit, rms.source_table AS "sourceTable",
              rms.generated_at AS "generatedAt", 'Ready' AS status
       FROM run_metric_summaries rms
       JOIN metric_definitions md ON md.id = rms.metric_id
       LEFT JOIN test_condition_definitions tc ON tc.id = rms.condition_id
       WHERE rms.production_run_id = $1
       ORDER BY md.category::text, md.sort_order, md.metric_key, tc.condition_code`,
      [runId]
    );
    return result.rows as RunSummaryRecord[];
  }

  async missingRequiredMetrics(runId: string): Promise<MissingRequiredMetricRecord[]> {
    const result = await getPool().query(
      `WITH samples_in_run AS (
         SELECT id
         FROM samples
         WHERE production_run_id = $1 AND status <> 'archived'
       ),
       required AS (
         SELECT id, metric_key, display_name, category::text AS category
         FROM metric_definitions
         WHERE required_for_scoring = true AND status = 'active'
       ),
       result_counts AS (
         SELECT md.id AS metric_id, COUNT(DISTINCT src.sample_id)::int AS existing_results
         FROM required md
         LEFT JOIN (
           SELECT str.sample_id, str.metric_id
           FROM sample_test_results str
           JOIN samples s ON s.id = str.sample_id
           WHERE s.production_run_id = $1
           UNION ALL
           SELECT er.sample_id, er.metric_id
           FROM environmental_test_results er
           JOIN samples s ON s.id = er.sample_id
           WHERE s.production_run_id = $1
           UNION ALL
           SELECT sr.sample_id, sr.metric_id
           FROM sample_subjective_ratings sr
           JOIN samples s ON s.id = sr.sample_id
           WHERE s.production_run_id = $1 AND sr.metric_id IS NOT NULL AND sr.rating_value IS NOT NULL
         ) src ON src.metric_id = md.id
         GROUP BY md.id
       )
       SELECT required.id, required.metric_key AS "metricKey",
              required.display_name AS "metricName", required.category,
              (SELECT COUNT(*)::int FROM samples_in_run) AS "requiredSamples",
              COALESCE(result_counts.existing_results, 0)::int AS "existingResults"
       FROM required
       LEFT JOIN result_counts ON result_counts.metric_id = required.id
       WHERE COALESCE(result_counts.existing_results, 0) < (SELECT COUNT(*) FROM samples_in_run)
       ORDER BY required.category, required.metric_key`,
      [runId]
    );
    return result.rows as MissingRequiredMetricRecord[];
  }

  async requiredSummaryCount(runId: string): Promise<number> {
    const result = await getPool().query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM metric_definitions md
       WHERE md.required_for_scoring = true
         AND md.status = 'active'
         AND EXISTS (
           SELECT 1
           FROM run_metric_summaries rms
           WHERE rms.production_run_id = $1 AND rms.metric_id = md.id
         )`,
      [runId]
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async totalRequiredMetricCount(): Promise<number> {
    const result = await getPool().query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM metric_definitions
       WHERE required_for_scoring = true AND status = 'active'`
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async isStale(runId: string): Promise<boolean> {
    const result = await getPool().query<{ stale: boolean }>(
      `SELECT COALESCE(lab.latest_lab_update_at > summary.last_generated_at, false) AS stale
       FROM production_runs pr
       LEFT JOIN (
         SELECT production_run_id, MAX(generated_at) AS last_generated_at
         FROM run_metric_summaries
         GROUP BY production_run_id
       ) summary ON summary.production_run_id = pr.id
       LEFT JOIN LATERAL (${this.latestLabUpdateSql()}) lab ON true
       WHERE pr.id = $1`,
      [runId]
    );
    return result.rows[0]?.stale === true;
  }

  async generate(runId: string): Promise<RunSummaryRecord[]> {
    await this.withTransaction(async (client) => {
      await client.query('DELETE FROM run_metric_summaries WHERE production_run_id = $1', [runId]);
      await client.query(this.insertSampleResultSummariesSql(), [runId]);
      await client.query(this.insertEnvironmentalSummariesSql(), [runId]);
      await client.query(this.insertSubjectiveSummariesSql(), [runId]);
    });
    return this.summaries(runId);
  }

  private insertSampleResultSummariesSql(): string {
    return `INSERT INTO run_metric_summaries
        (production_run_id, metric_id, condition_id, n_samples, mean_value, std_dev, min_value, max_value, unit, source_table)
      SELECT s.production_run_id, str.metric_id, NULL, COUNT(*)::int,
             AVG(str.value_numeric), COALESCE(STDDEV_SAMP(str.value_numeric), 0),
             MIN(str.value_numeric), MAX(str.value_numeric),
             COALESCE(NULLIF(str.unit, ''), md.default_unit), 'sample_test_results'
      FROM sample_test_results str
      JOIN samples s ON s.id = str.sample_id
      JOIN metric_definitions md ON md.id = str.metric_id
      WHERE s.production_run_id = $1
      GROUP BY s.production_run_id, str.metric_id, COALESCE(NULLIF(str.unit, ''), md.default_unit)`;
  }

  private insertEnvironmentalSummariesSql(): string {
    return `INSERT INTO run_metric_summaries
        (production_run_id, metric_id, condition_id, n_samples, mean_value, std_dev, min_value, max_value, unit, source_table)
      SELECT s.production_run_id, er.metric_id, er.test_condition_id, COUNT(*)::int,
             AVG(er.value_numeric), COALESCE(STDDEV_SAMP(er.value_numeric), 0),
             MIN(er.value_numeric), MAX(er.value_numeric),
             COALESCE(NULLIF(er.unit, ''), md.default_unit), 'environmental_test_results'
      FROM environmental_test_results er
      JOIN samples s ON s.id = er.sample_id
      JOIN metric_definitions md ON md.id = er.metric_id
      WHERE s.production_run_id = $1
      GROUP BY s.production_run_id, er.metric_id, er.test_condition_id, COALESCE(NULLIF(er.unit, ''), md.default_unit)`;
  }

  private insertSubjectiveSummariesSql(): string {
    return `INSERT INTO run_metric_summaries
        (production_run_id, metric_id, condition_id, n_samples, mean_value, std_dev, min_value, max_value, unit, source_table)
      SELECT s.production_run_id, sr.metric_id, NULL, COUNT(*)::int,
             AVG(sr.rating_value), COALESCE(STDDEV_SAMP(sr.rating_value), 0),
             MIN(sr.rating_value), MAX(sr.rating_value),
             COALESCE(md.default_unit, 'rating'), 'sample_subjective_ratings'
      FROM sample_subjective_ratings sr
      JOIN samples s ON s.id = sr.sample_id
      JOIN metric_definitions md ON md.id = sr.metric_id
      WHERE s.production_run_id = $1
        AND sr.metric_id IS NOT NULL
        AND sr.rating_value IS NOT NULL
      GROUP BY s.production_run_id, sr.metric_id, COALESCE(md.default_unit, 'rating')`;
  }

  private latestLabUpdateSql(): string {
    return `SELECT GREATEST(
              COALESCE((SELECT MAX(str.updated_at) FROM sample_test_results str JOIN samples s ON s.id = str.sample_id WHERE s.production_run_id = pr.id), 'epoch'::timestamptz),
              COALESCE((SELECT MAX(er.updated_at) FROM environmental_test_results er JOIN samples s ON s.id = er.sample_id WHERE s.production_run_id = pr.id), 'epoch'::timestamptz),
              COALESCE((SELECT MAX(sr.updated_at) FROM sample_subjective_ratings sr JOIN samples s ON s.id = sr.sample_id WHERE s.production_run_id = pr.id), 'epoch'::timestamptz),
              COALESCE((SELECT MAX(so.updated_at) FROM sample_observations so JOIN samples s ON s.id = so.sample_id WHERE s.production_run_id = pr.id), 'epoch'::timestamptz)
            ) AS latest_lab_update_at`;
  }

  private async withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
