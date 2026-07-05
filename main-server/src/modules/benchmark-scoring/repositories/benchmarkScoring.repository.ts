import type { PoolClient } from 'pg';
import { getPool } from '../../../infrastructure/database/pg-pool';
import type { BenchmarkScoreResult, BenchmarkScoringRecord, ScoringMetricInput } from '../benchmarkScoring.types';

export class BenchmarkScoringRepository {
  async run(runId: string): Promise<BenchmarkScoringRecord | null> {
    const result = await getPool().query(
      `SELECT pr.id, pr.run_code AS "runCode", pr.status::text AS status,
              CONCAT(f.formulation_code, ' V', f.version_no) AS formulation,
              bp.benchmark_name AS "targetBenchmark",
              COALESCE(summary.summary_count, 0)::int AS "summaryCount",
              summary.last_generated_at AS "lastSummaryGeneratedAt",
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
    return (result.rows[0] as BenchmarkScoringRecord | undefined) ?? null;
  }

  async algorithmVersion(): Promise<BenchmarkScoringRecord> {
    const result = await getPool().query(
      `SELECT id, algorithm_code AS "algorithmCode", algorithm_name AS "algorithmName",
              version, config
       FROM algorithm_versions
       WHERE algorithm_code = 'PERFORMANCE_DISTANCE' AND version = '1.0'
       ORDER BY created_at DESC
       LIMIT 1`
    );
    return result.rows[0] as BenchmarkScoringRecord;
  }

  async benchmarks(): Promise<BenchmarkScoringRecord[]> {
    const result = await getPool().query(
      `SELECT id, benchmark_code AS "benchmarkCode", benchmark_name AS "benchmarkName"
       FROM benchmark_profiles
       WHERE status = 'active' AND benchmark_code IN ('LIFETIME', 'X40')
       ORDER BY CASE benchmark_code WHEN 'X40' THEN 1 WHEN 'LIFETIME' THEN 2 ELSE 3 END`
    );
    return result.rows as BenchmarkScoringRecord[];
  }

  async scoringInputs(runId: string, benchmarkId: string): Promise<ScoringMetricInput[]> {
    const result = await getPool().query(
      `SELECT bmt.metric_id AS "metricId", md.display_name AS "metricName",
              bp.benchmark_name AS "benchmarkName",
              rms.id AS "runSummaryId", rms.mean_value::float AS "runMeanValue",
              COALESCE(bmt.target_mean, bmt.target_value)::float AS "targetMean",
              bmt.min_acceptable::float AS "minAcceptable",
              bmt.max_acceptable::float AS "maxAcceptable",
              COALESCE(bmt.weight, 0)::float AS weight,
              bmt.criticality,
              bmt.required_for_pass AS "requiredForPass"
       FROM benchmark_metric_targets bmt
       JOIN benchmark_profiles bp ON bp.id = bmt.benchmark_profile_id
       JOIN metric_definitions md ON md.id = bmt.metric_id
       LEFT JOIN run_metric_summaries rms
         ON rms.production_run_id = $1
        AND rms.metric_id = bmt.metric_id
       WHERE bmt.benchmark_profile_id = $2
       ORDER BY md.sort_order, md.metric_key`,
      [runId, benchmarkId]
    );
    return result.rows as ScoringMetricInput[];
  }

  async missingRequiredSummaries(runId: string): Promise<BenchmarkScoringRecord[]> {
    const result = await getPool().query(
      `SELECT md.id, md.metric_key AS "metricKey", md.display_name AS "metricName"
       FROM metric_definitions md
       WHERE md.required_for_scoring = true
         AND md.status = 'active'
         AND NOT EXISTS (
           SELECT 1
           FROM run_metric_summaries rms
           WHERE rms.production_run_id = $1 AND rms.metric_id = md.id
         )
       ORDER BY md.sort_order, md.metric_key`,
      [runId]
    );
    return result.rows as BenchmarkScoringRecord[];
  }

  async summaryIsStale(runId: string): Promise<boolean> {
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

  async reportsForRun(runId: string): Promise<BenchmarkScoringRecord[]> {
    const result = await getPool().query(this.reportsSql('sr.production_run_id = $1'), [runId]);
    return result.rows as BenchmarkScoringRecord[];
  }

  async reportDetail(scoreReportId: string): Promise<BenchmarkScoringRecord | null> {
    const report = await getPool().query(this.reportsSql('sr.id = $1'), [scoreReportId]);
    if (!report.rows[0]) return null;
    const metrics = await this.reportMetrics(scoreReportId);
    return { ...(report.rows[0] as BenchmarkScoringRecord), metrics };
  }

  async reportMetrics(scoreReportId: string): Promise<BenchmarkScoringRecord[]> {
    const result = await getPool().query(
      `SELECT srm.id, srm.score_report_id AS "scoreReportId",
              srm.metric_id AS "metricId", md.display_name AS "metricName", md.metric_key AS "metricKey",
              md.category::text AS category,
              srm.run_mean_value::float AS "runMeanValue",
              srm.benchmark_target_mean::float AS "benchmarkTargetMean",
              srm.min_acceptable::float AS "minAcceptable",
              srm.max_acceptable::float AS "maxAcceptable",
              srm.weight::float AS weight,
              srm.distance::float AS distance,
              srm.normalized_distance::float AS "normalizedDistance",
              srm.metric_score::float AS "metricScore",
              srm.weighted_contribution::float AS "weightedContribution",
              srm.traffic_light::text AS "trafficLight",
              srm.risk_level AS "riskLevel",
              srm.risk_note AS "riskNote"
       FROM score_report_metrics srm
       JOIN metric_definitions md ON md.id = srm.metric_id
       WHERE srm.score_report_id = $1
       ORDER BY md.category::text, md.sort_order, md.metric_key`,
      [scoreReportId]
    );
    return result.rows as BenchmarkScoringRecord[];
  }

  async saveReports(runId: string, algorithmVersionId: string, scores: BenchmarkScoreResult[]): Promise<BenchmarkScoringRecord[]> {
    await this.withTransaction(async (client) => {
      await client.query('DELETE FROM score_reports WHERE production_run_id = $1', [runId]);
      const bestBenchmarkId = scores.reduce((best, item) => (
        item.predictabilityIndex > best.predictabilityIndex ? item : best
      ), scores[0]).benchmarkId;

      for (const score of scores) {
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO score_reports
            (production_run_id, benchmark_profile_id, algorithm_version_id,
             overall_similarity_score, predictability_index, production_readiness_score,
             required_metric_completion_score, traffic_light, key_risks, recommendations, is_best_match)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::traffic_light_status, $9, $10, $11)
           RETURNING id`,
          [
            runId,
            score.benchmarkId,
            algorithmVersionId,
            score.overallSimilarityScore,
            score.predictabilityIndex,
            score.productionReadinessScore,
            score.requiredMetricCompletionScore,
            score.trafficLight,
            JSON.stringify(score.keyRisks),
            JSON.stringify(score.recommendations),
            score.benchmarkId === bestBenchmarkId,
          ]
        );
        const reportId = inserted.rows[0]?.id ?? '';
        for (const metric of score.metrics) {
          await client.query(
            `INSERT INTO score_report_metrics
              (score_report_id, metric_id, run_metric_summary_id, run_mean_value,
               benchmark_target_mean, min_acceptable, max_acceptable, weight,
               distance, normalized_distance, metric_score, weighted_contribution,
               traffic_light, risk_level, risk_note)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::traffic_light_status, $14, $15)`,
            [
              reportId,
              metric.metricId,
              metric.runSummaryId ?? null,
              metric.runMeanValue,
              metric.targetMean,
              metric.minAcceptable,
              metric.maxAcceptable,
              metric.weight,
              metric.distance,
              metric.normalizedDistance,
              metric.metricScore,
              metric.weightedContribution,
              metric.trafficLight,
              metric.riskLevel,
              metric.riskNote,
            ]
          );
        }
      }
    });
    return this.reportsForRun(runId);
  }

  private reportsSql(whereClause: string): string {
    return `SELECT sr.id, sr.production_run_id AS "productionRunId",
                   sr.benchmark_profile_id AS "benchmarkProfileId",
                   bp.benchmark_code AS "benchmarkCode", bp.benchmark_name AS "benchmarkName",
                   av.algorithm_code AS "algorithmCode", av.version AS "algorithmVersion",
                   sr.overall_similarity_score::float AS "overallSimilarityScore",
                   sr.predictability_index::float AS "predictabilityIndex",
                   sr.production_readiness_score::float AS "productionReadinessScore",
                   sr.required_metric_completion_score::float AS "requiredMetricCompletionScore",
                   sr.traffic_light::text AS "trafficLight",
                   sr.key_risks AS "keyRisks", sr.recommendations,
                   sr.is_best_match AS "isBestMatch",
                   sr.generated_at AS "generatedAt"
            FROM score_reports sr
            JOIN benchmark_profiles bp ON bp.id = sr.benchmark_profile_id
            JOIN algorithm_versions av ON av.id = sr.algorithm_version_id
            WHERE ${whereClause}
            ORDER BY sr.is_best_match DESC, sr.predictability_index DESC`;
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
