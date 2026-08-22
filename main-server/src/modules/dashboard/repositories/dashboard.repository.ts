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
      `SELECT sort_order AS "sortOrder", stage, count
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
                COUNT(DISTINCT s.id)::int AS sample_count,
                COUNT(str.id) FILTER (
                  WHERE md.required_for_scoring = true AND md.status = 'active'
                )::int AS completed_results
         FROM samples s
         LEFT JOIN sample_test_results str ON str.sample_id = s.id
         LEFT JOIN metric_definitions md ON md.id = str.metric_id
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

  async dataInventory(): Promise<DashboardRecord[]> {
    // Use live COUNT(*) per table instead of pg_stat_user_tables.n_live_tup, which is a
    // stale autovacuum estimate and does not reflect rows inserted in the current session.
    const result = await getPool().query(
      `SELECT "tableName", "rowCount"::int, domain FROM (
        SELECT 'materials'                         AS "tableName", COUNT(*) AS "rowCount", 'Materials'      AS domain FROM materials
        UNION ALL SELECT 'suppliers',                                COUNT(*), 'Materials'      FROM suppliers
        UNION ALL SELECT 'supplier_materials',                       COUNT(*), 'Materials'      FROM supplier_materials
        UNION ALL SELECT 'material_lots',                            COUNT(*), 'Materials'      FROM material_lots
        UNION ALL SELECT 'material_catalog_imports',                 COUNT(*), 'Materials'      FROM material_catalog_imports
        UNION ALL SELECT 'material_external_identifiers',            COUNT(*), 'Materials'      FROM material_external_identifiers
        UNION ALL SELECT 'material_source_documents',                COUNT(*), 'Materials'      FROM material_source_documents
        UNION ALL SELECT 'material_property_definitions',            COUNT(*), 'Materials'      FROM material_property_definitions
        UNION ALL SELECT 'material_property_facts',                  COUNT(*), 'Materials'      FROM material_property_facts
        UNION ALL SELECT 'material_processing_profiles',             COUNT(*), 'Materials'      FROM material_processing_profiles
        UNION ALL SELECT 'material_processing_ranges',               COUNT(*), 'Materials'      FROM material_processing_ranges
        UNION ALL SELECT 'machines',                                 COUNT(*), 'Manufacturing'  FROM machines
        UNION ALL SELECT 'molds',                                    COUNT(*), 'Manufacturing'  FROM molds
        UNION ALL SELECT 'mold_zones',                               COUNT(*), 'Manufacturing'  FROM mold_zones
        UNION ALL SELECT 'machine_parameter_capabilities',           COUNT(*), 'Manufacturing'  FROM machine_parameter_capabilities
        UNION ALL SELECT 'process_parameter_definitions',            COUNT(*), 'Manufacturing'  FROM process_parameter_definitions
        UNION ALL SELECT 'setup_sheet_imports',                      COUNT(*), 'Manufacturing'  FROM setup_sheet_imports
        UNION ALL SELECT 'process_setup_revisions',                  COUNT(*), 'Manufacturing'  FROM process_setup_revisions
        UNION ALL SELECT 'process_setup_revision_parameters',        COUNT(*), 'Manufacturing'  FROM process_setup_revision_parameters
        UNION ALL SELECT 'production_run_process_values',            COUNT(*), 'Manufacturing'  FROM production_run_process_values
        UNION ALL SELECT 'production_run_notes',                     COUNT(*), 'Manufacturing'  FROM production_run_notes
        UNION ALL SELECT 'production_run_material_lots',             COUNT(*), 'Manufacturing'  FROM production_run_material_lots
        UNION ALL SELECT 'material_drying_events',                   COUNT(*), 'Manufacturing'  FROM material_drying_events
        UNION ALL SELECT 'process_setup_revision_log_entries',       COUNT(*), 'Manufacturing'  FROM process_setup_revision_log_entries
        UNION ALL SELECT 'formulations',                             COUNT(*), 'Workflow'       FROM formulations
        UNION ALL SELECT 'formulation_components',                   COUNT(*), 'Workflow'       FROM formulation_components
        UNION ALL SELECT 'production_runs',                          COUNT(*), 'Workflow'       FROM production_runs
        UNION ALL SELECT 'samples',                                  COUNT(*), 'Workflow'       FROM samples
        UNION ALL SELECT 'metric_definitions',                       COUNT(*), 'Testing'        FROM metric_definitions
        UNION ALL SELECT 'test_method_definitions',                  COUNT(*), 'Testing'        FROM test_method_definitions
        UNION ALL SELECT 'test_condition_definitions',               COUNT(*), 'Testing'        FROM test_condition_definitions
        UNION ALL SELECT 'sample_test_results',                      COUNT(*), 'Testing'        FROM sample_test_results
        UNION ALL SELECT 'environmental_test_results',               COUNT(*), 'Testing'        FROM environmental_test_results
        UNION ALL SELECT 'sample_observations',                      COUNT(*), 'Testing'        FROM sample_observations
        UNION ALL SELECT 'sample_subjective_ratings',                COUNT(*), 'Testing'        FROM sample_subjective_ratings
        UNION ALL SELECT 'run_metric_summaries',                     COUNT(*), 'Testing'        FROM run_metric_summaries
        UNION ALL SELECT 'benchmark_profiles',                       COUNT(*), 'Analysis'       FROM benchmark_profiles
        UNION ALL SELECT 'benchmark_metric_targets',                 COUNT(*), 'Analysis'       FROM benchmark_metric_targets
        UNION ALL SELECT 'algorithm_versions',                       COUNT(*), 'Analysis'       FROM algorithm_versions
        UNION ALL SELECT 'score_reports',                            COUNT(*), 'Analysis'       FROM score_reports
        UNION ALL SELECT 'score_report_metrics',                     COUNT(*), 'Analysis'       FROM score_report_metrics
        UNION ALL SELECT 'generated_reports',                        COUNT(*), 'Analysis'       FROM generated_reports
        UNION ALL SELECT 'comparison_analyses',                      COUNT(*), 'Analysis'       FROM comparison_analyses
        UNION ALL SELECT 'comparison_analysis_candidates',           COUNT(*), 'Analysis'       FROM comparison_analysis_candidates
        UNION ALL SELECT 'comparison_analysis_metrics',              COUNT(*), 'Analysis'       FROM comparison_analysis_metrics
      ) counts
      ORDER BY domain, "tableName"`
    );
    return result.rows as DashboardRecord[];
  }

  async similarityAnalysis(): Promise<DashboardRecord | null> {
    const analysis = await getPool().query(
      `SELECT id, analysis_code AS "analysisCode", analysis_name AS "analysisName", target_name AS "targetName",
              candidate_count AS "candidateCount", methodology, notes
       FROM comparison_analyses
       ORDER BY updated_at DESC
       LIMIT 1`
    );
    const row = analysis.rows[0] as DashboardRecord | undefined;
    if (!row) return null;

    const [candidates, metrics] = await Promise.all([
      getPool().query(
        `SELECT candidate_name AS "candidateName", rank, weighted_deviation_percent::float AS "weightedDeviationPercent", confidence_note AS "confidenceNote"
         FROM comparison_analysis_candidates
         WHERE analysis_id = $1
         ORDER BY rank NULLS LAST, weighted_deviation_percent
         LIMIT 10`,
        [row['id']]
      ),
      getPool().query(
        `SELECT md.display_name AS "metricName", cam.target_mean::float AS "targetMean", cam.candidate_mean::float AS "candidateMean",
                cam.signed_deviation_percent::float AS "signedDeviationPercent", cam.weight::float AS weight,
                cam.weighted_deviation_points::float AS "weightedDeviationPoints", cam.source_detail_level AS "sourceDetailLevel"
         FROM comparison_analysis_metrics cam
         JOIN comparison_analysis_candidates cac ON cac.id = cam.candidate_id
         JOIN metric_definitions md ON md.id = cam.metric_id
         WHERE cac.analysis_id = $1 AND cac.rank = 1
         ORDER BY cam.weighted_deviation_points DESC`,
        [row['id']]
      ),
    ]);

    return { ...row, candidates: candidates.rows, metrics: metrics.rows };
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
