import { getPool } from '../../../infrastructure/database/pg-pool';
import type { DashboardRecord, DashboardSummary } from '../dashboard.types';

export class DashboardRepository {
  async summary(): Promise<DashboardSummary> {
    const result = await getPool().query<DashboardSummary>(
      `WITH best_scores AS (${this.bestScoresSql()}),
       summary_counts AS (
         SELECT
           (SELECT COUNT(*)::int FROM formulations WHERE status <> 'archived') AS "activeFormulations",
           (SELECT COUNT(*)::int FROM production_runs WHERE status = 'ready_for_testing') AS "runsReadyForTesting",
           (SELECT COUNT(*)::int
            FROM production_runs pr
            WHERE pr.status = 'completed'
              AND NOT EXISTS (SELECT 1 FROM run_metric_summaries rms WHERE rms.production_run_id = pr.id)) AS "runsAwaitingSummary",
           (SELECT COUNT(*)::int
            FROM production_runs pr
            WHERE pr.status IN ('completed', 'scored')
              AND EXISTS (SELECT 1 FROM run_metric_summaries rms WHERE rms.production_run_id = pr.id)
              AND NOT EXISTS (SELECT 1 FROM score_reports sr WHERE sr.production_run_id = pr.id)) AS "runsAwaitingScoring",
           (SELECT COUNT(DISTINCT production_run_id)::int FROM score_reports) AS "scoredRuns",
           (SELECT COUNT(*)::int FROM best_scores WHERE traffic_light = 'green') AS "greenCandidates",
           (SELECT COUNT(*)::int FROM best_scores WHERE traffic_light = 'yellow') AS "yellowCandidates",
           (SELECT COUNT(*)::int FROM best_scores WHERE traffic_light = 'red') AS "redCandidates"
       )
       SELECT * FROM summary_counts`
    );
    return result.rows[0];
  }

  async workflowStatus(): Promise<DashboardRecord[]> {
    const result = await getPool().query(
      `SELECT *
       FROM (
         SELECT 1 AS sort_order, 'Draft Formulation' AS stage, COUNT(*)::int AS count
         FROM formulations WHERE status = 'draft'
         UNION ALL
         SELECT 2, 'Approved Formulation', COUNT(*)::int
         FROM formulations WHERE status = 'approved'
         UNION ALL
         SELECT 3, 'Production Run Created', COUNT(*)::int
         FROM production_runs WHERE status IN ('planned', 'molded', 'curing')
         UNION ALL
         SELECT 4, 'Ready for Testing', COUNT(*)::int
         FROM production_runs WHERE status = 'ready_for_testing'
         UNION ALL
         SELECT 5, 'Testing', COUNT(*)::int
         FROM production_runs WHERE status = 'testing'
         UNION ALL
         SELECT 6, 'Completed', COUNT(*)::int
         FROM production_runs WHERE status = 'completed'
         UNION ALL
         SELECT 7, 'Summary Generated', COUNT(DISTINCT production_run_id)::int
         FROM run_metric_summaries
         UNION ALL
         SELECT 8, 'Scored', COUNT(DISTINCT production_run_id)::int
         FROM score_reports
         UNION ALL
         SELECT 9, 'Report Generated', COUNT(DISTINCT production_run_id)::int
         FROM generated_reports
       ) stages
       ORDER BY sort_order`
    );
    return result.rows as DashboardRecord[];
  }

  async labQueue(limit = 8): Promise<DashboardRecord[]> {
    const result = await getPool().query(
      `WITH required AS (
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
       SELECT pr.id, pr.run_code AS "runCode",
              CONCAT(f.formulation_code, ' V', f.version_no) AS formulation,
              COALESCE(progress.sample_count, 0) AS "sampleCount",
              COALESCE(progress.completed_results, 0) AS "completedResults",
              COALESCE(progress.sample_count, 0) * (SELECT required_metric_count FROM required) AS "requiredResultCount",
              COALESCE(missing.required_missing, 0) AS "missingRequiredMetrics",
              pr.status::text AS status,
              pr.updated_at AS "updatedAt"
       FROM production_runs pr
       JOIN formulations f ON f.id = pr.formulation_id
       LEFT JOIN progress ON progress.production_run_id = pr.id
       LEFT JOIN missing ON missing.production_run_id = pr.id
       WHERE pr.status IN ('ready_for_testing', 'testing')
       ORDER BY COALESCE(missing.required_missing, 0) DESC, pr.updated_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows as DashboardRecord[];
  }

  async latestScores(limit = 8): Promise<DashboardRecord[]> {
    const result = await getPool().query(
      `WITH best_scores AS (${this.bestScoresSql()}),
       x40 AS (
         SELECT production_run_id, overall_similarity_score::float AS score
         FROM score_reports sr
         JOIN benchmark_profiles bp ON bp.id = sr.benchmark_profile_id
         WHERE bp.benchmark_code = 'X40'
       ),
       lifetime AS (
         SELECT production_run_id, overall_similarity_score::float AS score
         FROM score_reports sr
         JOIN benchmark_profiles bp ON bp.id = sr.benchmark_profile_id
         WHERE bp.benchmark_code = 'LIFETIME'
       ),
       latest_reports AS (
         SELECT DISTINCT ON (production_run_id) production_run_id, id AS report_id
         FROM generated_reports
         ORDER BY production_run_id, generated_at DESC
       )
       SELECT pr.id AS "runId", pr.run_code AS "runCode",
              best_scores.id AS "scoreReportId",
              best_scores.benchmark_name AS "bestMatch",
              best_scores.predictability_index::float AS "predictabilityIndex",
              x40.score AS "x40Similarity",
              lifetime.score AS "lifetimeSimilarity",
              best_scores.traffic_light::text AS status,
              latest_reports.report_id AS "reportId",
              best_scores.generated_at AS "generatedAt"
       FROM best_scores
       JOIN production_runs pr ON pr.id = best_scores.production_run_id
       LEFT JOIN x40 ON x40.production_run_id = pr.id
       LEFT JOIN lifetime ON lifetime.production_run_id = pr.id
       LEFT JOIN latest_reports ON latest_reports.production_run_id = pr.id
       ORDER BY best_scores.generated_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows as DashboardRecord[];
  }

  async riskAlerts(limit = 12): Promise<DashboardRecord[]> {
    const result = await getPool().query(
      `SELECT pr.id AS "runId", pr.run_code AS "runCode",
              sr.id AS "scoreReportId",
              bp.benchmark_name AS "benchmarkName",
              md.display_name AS "metricName",
              COALESCE(srm.risk_note, srm.risk_level, srm.traffic_light::text) AS risk,
              srm.risk_level AS severity,
              srm.traffic_light::text AS "trafficLight",
              srm.metric_score::float AS "metricScore",
              sr.generated_at AS "generatedAt"
       FROM score_report_metrics srm
       JOIN score_reports sr ON sr.id = srm.score_report_id
       JOIN production_runs pr ON pr.id = sr.production_run_id
       JOIN benchmark_profiles bp ON bp.id = sr.benchmark_profile_id
       JOIN metric_definitions md ON md.id = srm.metric_id
       WHERE sr.is_best_match = true
         AND (
           srm.traffic_light IN ('red', 'yellow')
           OR COALESCE(srm.risk_level, '') NOT IN ('', 'none', 'low')
         )
       ORDER BY
         CASE srm.traffic_light WHEN 'red' THEN 1 WHEN 'yellow' THEN 2 ELSE 3 END,
         sr.generated_at DESC,
         srm.metric_score ASC
       LIMIT $1`,
      [limit]
    );
    return result.rows as DashboardRecord[];
  }

  async recentReports(limit = 8): Promise<DashboardRecord[]> {
    const result = await getPool().query(
      `SELECT gr.id AS "reportId", gr.report_name AS "reportName",
              gr.production_run_id AS "runId",
              pr.run_code AS "runCode",
              NULLIF(gr.report_snapshot #>> '{executiveSummary,predictabilityIndex}', '')::float AS "predictabilityIndex",
              gr.generated_at AS "generatedAt",
              gr.status
       FROM generated_reports gr
       JOIN production_runs pr ON pr.id = gr.production_run_id
       ORDER BY gr.generated_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows as DashboardRecord[];
  }

  async benchmarkOverview(): Promise<DashboardRecord> {
    const [traffic, bestMatches, latestSimilarity, topCandidates] = await Promise.all([
      getPool().query(
        `WITH best_scores AS (${this.bestScoresSql()})
         SELECT traffic_light::text AS status, COUNT(*)::int AS count
         FROM best_scores
         GROUP BY traffic_light
         ORDER BY CASE traffic_light WHEN 'green' THEN 1 WHEN 'yellow' THEN 2 WHEN 'red' THEN 3 ELSE 4 END`
      ),
      getPool().query(
        `WITH best_scores AS (${this.bestScoresSql()})
         SELECT benchmark_code AS "benchmarkCode", benchmark_name AS "benchmarkName", COUNT(*)::int AS count
         FROM best_scores
         GROUP BY benchmark_code, benchmark_name
         ORDER BY count DESC, benchmark_name`
      ),
      getPool().query(
        `SELECT pr.id AS "runId", pr.run_code AS "runCode",
                bp.benchmark_code AS "benchmarkCode",
                bp.benchmark_name AS "benchmarkName",
                sr.overall_similarity_score::float AS "similarityScore",
                sr.generated_at AS "generatedAt"
         FROM score_reports sr
         JOIN production_runs pr ON pr.id = sr.production_run_id
         JOIN benchmark_profiles bp ON bp.id = sr.benchmark_profile_id
         WHERE bp.benchmark_code IN ('X40', 'LIFETIME')
         ORDER BY sr.generated_at DESC
         LIMIT 10`
      ),
      getPool().query(
        `WITH best_scores AS (${this.bestScoresSql()})
         SELECT pr.id AS "runId", pr.run_code AS "runCode",
                best_scores.benchmark_name AS "bestMatch",
                best_scores.predictability_index::float AS "predictabilityIndex",
                best_scores.traffic_light::text AS status
         FROM best_scores
         JOIN production_runs pr ON pr.id = best_scores.production_run_id
         ORDER BY best_scores.predictability_index DESC
         LIMIT 8`
      ),
    ]);

    return {
      bestMatchCounts: bestMatches.rows,
      latestSimilarity: latestSimilarity.rows,
      topCandidates: topCandidates.rows,
      trafficCounts: traffic.rows,
    };
  }

  private bestScoresSql(): string {
    return `SELECT DISTINCT ON (sr.production_run_id)
              sr.id, sr.production_run_id, sr.benchmark_profile_id,
              bp.benchmark_code, bp.benchmark_name,
              sr.overall_similarity_score, sr.predictability_index,
              sr.production_readiness_score, sr.traffic_light,
              sr.generated_at
            FROM score_reports sr
            JOIN benchmark_profiles bp ON bp.id = sr.benchmark_profile_id
            ORDER BY sr.production_run_id, sr.is_best_match DESC, sr.predictability_index DESC, sr.generated_at DESC`;
  }
}
