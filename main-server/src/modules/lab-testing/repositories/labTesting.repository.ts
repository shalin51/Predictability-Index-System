import { getPool } from '../../../infrastructure/database/pg-pool';
import type { LabTestingQueueQuery, LabTestingRecord } from '../labTesting.types';

export class LabTestingRepository {
  async queue(query: LabTestingQueueQuery): Promise<LabTestingRecord[]> {
    const params: unknown[] = [];
    const clauses = [`pr.status IN ('ready_for_testing', 'testing')`];

    if (query.search) {
      params.push(`%${query.search.toLowerCase()}%`);
      clauses.push(`(
        LOWER(pr.run_code) LIKE $${params.length}
        OR LOWER(f.formulation_code) LIKE $${params.length}
        OR LOWER(COALESCE(bp.benchmark_name, '')) LIKE $${params.length}
      )`);
    }
    if (query.status && query.status !== 'all') {
      params.push(query.status);
      clauses.push(`pr.status::text = $${params.length}`);
    }
    if (query.targetBenchmarkId) {
      params.push(query.targetBenchmarkId);
      clauses.push(`f.target_benchmark_id = $${params.length}`);
    }
    if (query.dateProduced) {
      params.push(query.dateProduced);
      clauses.push(`pr.date_produced = $${params.length}::date`);
    }
    if (query.machineId) {
      params.push(query.machineId);
      clauses.push(`pr.machine_id = $${params.length}`);
    }
    if (query.moldId) {
      params.push(query.moldId);
      clauses.push(`pr.mold_id = $${params.length}`);
    }
    if (query.missingResults === 'true') clauses.push(`COALESCE(missing.required_missing, 0) > 0`);
    if (query.missingResults === 'false') clauses.push(`COALESCE(missing.required_missing, 0) = 0`);

    const result = await getPool().query(
      `${this.baseRunSelect()}
       WHERE ${clauses.join(' AND ')}
       ORDER BY pr.updated_at DESC`,
      params
    );
    return result.rows as LabTestingRecord[];
  }

  async run(runId: string): Promise<LabTestingRecord | null> {
    const result = await getPool().query(
      `${this.baseRunSelect()}
       WHERE pr.id = $1`,
      [runId]
    );
    return (result.rows[0] as LabTestingRecord | undefined) ?? null;
  }

  async samples(runId: string): Promise<LabTestingRecord[]> {
    const result = await getPool().query(
      `SELECT id, production_run_id AS "productionRunId", sample_code AS "sampleCode",
              cavity_number AS "cavityNumber", status::text AS status
       FROM samples
       WHERE production_run_id = $1 AND status <> 'archived'
       ORDER BY sample_code`,
      [runId]
    );
    return result.rows as LabTestingRecord[];
  }

  async metrics(): Promise<LabTestingRecord[]> {
    const result = await getPool().query(
      `SELECT md.id, md.metric_key AS "metricKey", md.display_name AS "displayName",
              md.category::text AS category, md.default_unit AS "defaultUnit",
              md.data_type::text AS "dataType", md.required_for_scoring AS "requiredForScoring",
              tm.id AS "testMethodId", tm.method_code AS "methodCode", tm.method_name AS "methodName"
       FROM metric_definitions md
       LEFT JOIN LATERAL (
         SELECT id, method_code, method_name
         FROM test_method_definitions
         WHERE metric_id = md.id AND status = 'active'
         ORDER BY method_code
         LIMIT 1
       ) tm ON true
       WHERE md.status = 'active'
       ORDER BY md.sort_order, md.metric_key`
    );
    return result.rows as LabTestingRecord[];
  }

  async testConditions(): Promise<LabTestingRecord[]> {
    const result = await getPool().query(
      `SELECT id, condition_code AS "conditionCode", condition_name AS "conditionName"
       FROM test_condition_definitions
       WHERE status = 'active'
       ORDER BY condition_code`
    );
    return result.rows as LabTestingRecord[];
  }

  async results(runId: string): Promise<LabTestingRecord> {
    const [run, samples, metrics, testConditions, numericResults, observations, environmentalResults, subjectiveRatings] = await Promise.all([
      this.run(runId),
      this.samples(runId),
      this.metrics(),
      this.testConditions(),
      getPool().query(this.resultsSql('sample_test_results'), [runId]),
      getPool().query(
        `SELECT so.id, so.sample_id AS "sampleId", so.observation_type AS "observationType",
                so.observation_text AS "observationText", so.observed_by AS "observedBy",
                so.observed_at AS "observedAt", so.created_at AS "createdAt", so.updated_at AS "updatedAt"
         FROM sample_observations so
         JOIN samples s ON s.id = so.sample_id
         WHERE s.production_run_id = $1
         ORDER BY so.observed_at DESC`,
        [runId]
      ),
      getPool().query(
        `SELECT er.id, er.sample_id AS "sampleId", er.metric_id AS "metricId",
                er.test_condition_id AS "testConditionId", er.test_method_id AS "testMethodId",
                er.value_numeric::float AS "valueNumeric", er.unit, er.tested_by AS "testedBy",
                er.tested_at AS "testedAt", er.created_at AS "createdAt", er.updated_at AS "updatedAt"
         FROM environmental_test_results er
         JOIN samples s ON s.id = er.sample_id
         WHERE s.production_run_id = $1
         ORDER BY er.tested_at DESC`,
        [runId]
      ),
      getPool().query(
        `SELECT sr.id, sr.sample_id AS "sampleId", sr.metric_id AS "metricId",
                sr.rating_value::float AS "ratingValue", sr.feedback_text AS "feedbackText",
                sr.rated_by AS "ratedBy", sr.rated_at AS "ratedAt",
                sr.created_at AS "createdAt", sr.updated_at AS "updatedAt"
         FROM sample_subjective_ratings sr
         JOIN samples s ON s.id = sr.sample_id
         WHERE s.production_run_id = $1
         ORDER BY sr.rated_at DESC`,
        [runId]
      ),
    ]);

    return {
      id: runId,
      run,
      samples,
      metrics,
      testConditions,
      numericResults: numericResults.rows,
      observations: observations.rows,
      environmentalResults: environmentalResults.rows,
      subjectiveRatings: subjectiveRatings.rows,
    };
  }

  async updateRunStatus(runId: string, status: 'testing' | 'completed'): Promise<LabTestingRecord | null> {
    await getPool().query(
      `UPDATE production_runs
       SET status = $2::production_run_status, updated_at = now()
       WHERE id = $1`,
      [runId, status]
    );
    if (status === 'completed') {
      await getPool().query(
        `UPDATE samples SET status = 'tested', updated_at = now()
         WHERE production_run_id = $1 AND status <> 'archived'`,
        [runId]
      );
    }
    return this.run(runId);
  }

  async missingRequiredMetricCount(runId: string): Promise<number> {
    const result = await getPool().query<{ count: string }>(
      `SELECT COALESCE(SUM(CASE WHEN str.id IS NULL THEN 1 ELSE 0 END), 0)::text AS count
       FROM samples s
       CROSS JOIN metric_definitions md
       LEFT JOIN sample_test_results str ON str.sample_id = s.id AND str.metric_id = md.id
       WHERE s.production_run_id = $1
         AND s.status <> 'archived'
         AND md.required_for_scoring = true
         AND md.status = 'active'`,
      [runId]
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async runStatusForSample(sampleId: string): Promise<string | null> {
    const result = await getPool().query<{ status: string }>(
      `SELECT pr.status::text AS status
       FROM samples s
       JOIN production_runs pr ON pr.id = s.production_run_id
       WHERE s.id = $1`,
      [sampleId]
    );
    return result.rows[0]?.status ?? null;
  }

  private resultsSql(tableName: 'sample_test_results'): string {
    return `SELECT r.id, r.sample_id AS "sampleId", r.metric_id AS "metricId",
                   r.test_method_id AS "testMethodId", r.value_numeric::float AS "valueNumeric",
                   r.unit, r.tested_by AS "testedBy", r.tested_at AS "testedAt",
                   r.created_at AS "createdAt", r.updated_at AS "updatedAt"
            FROM ${tableName} r
            JOIN samples s ON s.id = r.sample_id
            WHERE s.production_run_id = $1
            ORDER BY r.tested_at DESC`;
  }

  private baseRunSelect(): string {
    return `WITH required AS (
              SELECT COUNT(*)::int AS required_metric_count
              FROM metric_definitions
              WHERE required_for_scoring = true AND status = 'active'
            ),
            progress AS (
              SELECT s.production_run_id,
                     COUNT(s.id)::int AS sample_count,
                     COUNT(str.id)::int AS completed_results
              FROM samples s
              LEFT JOIN sample_test_results str ON str.sample_id = s.id
              WHERE s.status <> 'archived'
              GROUP BY s.production_run_id
            ),
            missing AS (
              SELECT s.production_run_id,
                     SUM(CASE WHEN str.id IS NULL THEN 1 ELSE 0 END)::int AS required_missing
              FROM samples s
              CROSS JOIN metric_definitions md
              LEFT JOIN sample_test_results str ON str.sample_id = s.id AND str.metric_id = md.id
              WHERE s.status <> 'archived'
                AND md.required_for_scoring = true
                AND md.status = 'active'
              GROUP BY s.production_run_id
            )
            SELECT pr.id, pr.run_code AS "runCode", pr.formulation_id AS "formulationId",
                   CONCAT(f.formulation_code, ' V', f.version_no) AS formulation,
                   f.target_benchmark_id AS "targetBenchmarkId",
                   bp.benchmark_name AS "targetBenchmark",
                   pr.status::text AS status,
                   COALESCE(progress.sample_count, 0) AS "sampleCount",
                   COALESCE(progress.completed_results, 0) AS "completedResults",
                   (COALESCE(progress.sample_count, 0) * (SELECT required_metric_count FROM required)) AS "requiredResultCount",
                   COALESCE(missing.required_missing, 0) AS "missingRequiredMetrics",
                   pr.cure_hours_before_test::float AS "cureHoursBeforeTest",
                   pr.date_produced AS "dateProduced", pr.machine_id AS "machineId", m.machine_code AS machine,
                   pr.mold_id AS "moldId", mo.mold_code AS mold,
                   pr.updated_at AS "updatedAt"
            FROM production_runs pr
            JOIN formulations f ON f.id = pr.formulation_id
            LEFT JOIN benchmark_profiles bp ON bp.id = f.target_benchmark_id
            JOIN machines m ON m.id = pr.machine_id
            JOIN molds mo ON mo.id = pr.mold_id
            LEFT JOIN progress ON progress.production_run_id = pr.id
            LEFT JOIN missing ON missing.production_run_id = pr.id`;
  }
}
