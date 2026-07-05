import type { PoolClient } from 'pg';
import { getPool } from '../../../infrastructure/database/pg-pool';
import type { ReportListQuery, ReportRecord, ReportSnapshot } from '../report.types';

export class ReportRepository {
  async list(query: ReportListQuery = {}): Promise<ReportRecord[]> {
    const params: unknown[] = [];
    const clauses: string[] = [];

    if (query.runId) {
      params.push(query.runId);
      clauses.push(`gr.production_run_id = $${params.length}`);
    }

    if (query.status && query.status !== 'all') {
      params.push(query.status);
      clauses.push(`gr.status = $${params.length}`);
    }

    if (query.search) {
      params.push(`%${query.search.toLowerCase()}%`);
      clauses.push(`(
        LOWER(gr.report_name) LIKE $${params.length}
        OR LOWER(pr.run_code) LIKE $${params.length}
        OR LOWER(f.formulation_code) LIKE $${params.length}
      )`);
    }

    const result = await getPool().query(
      `${this.listSql()}
       ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
       ORDER BY gr.generated_at DESC`,
      params
    );
    return result.rows as ReportRecord[];
  }

  async findById(id: string): Promise<ReportRecord | null> {
    const result = await getPool().query(`${this.listSql()} WHERE gr.id = $1`, [id]);
    return (result.rows[0] as ReportRecord | undefined) ?? null;
  }

  async latestForRun(runId: string): Promise<ReportRecord | null> {
    const result = await getPool().query(
      `${this.listSql()} WHERE gr.production_run_id = $1 ORDER BY gr.generated_at DESC LIMIT 1`,
      [runId]
    );
    return (result.rows[0] as ReportRecord | undefined) ?? null;
  }

  async runContext(runId: string): Promise<ReportRecord | null> {
    const result = await getPool().query(
      `SELECT pr.id, pr.run_code AS "runCode", pr.status::text AS status,
              pr.date_produced AS "dateProduced",
              CONCAT(f.formulation_code, ' V', f.version_no) AS formulation,
              f.id AS "formulationId", f.formulation_code AS "formulationCode", f.version_no AS "formulationVersion",
              bp.benchmark_name AS "targetBenchmark",
              m.machine_code AS machine, mo.mold_code AS mold,
              pr.injection_pressure::float AS "injectionPressure", pr.injection_pressure_unit AS "injectionPressureUnit",
              pr.melt_temperature::float AS "meltTemperature", pr.melt_temperature_unit AS "meltTemperatureUnit",
              pr.cooling_time::float AS "coolingTime", pr.cooling_time_unit AS "coolingTimeUnit",
              pr.cycle_time::float AS "cycleTime", pr.cycle_time_unit AS "cycleTimeUnit",
              pr.cure_hours_before_test::float AS "cureHoursBeforeTest"
       FROM production_runs pr
       JOIN formulations f ON f.id = pr.formulation_id
       LEFT JOIN benchmark_profiles bp ON bp.id = f.target_benchmark_id
       JOIN machines m ON m.id = pr.machine_id
       JOIN molds mo ON mo.id = pr.mold_id
       WHERE pr.id = $1`,
      [runId]
    );
    return (result.rows[0] as ReportRecord | undefined) ?? null;
  }

  async scoreReports(runId: string): Promise<ReportRecord[]> {
    const result = await getPool().query(
      `SELECT sr.id, sr.production_run_id AS "productionRunId",
              bp.benchmark_code AS "benchmarkCode", bp.benchmark_name AS "benchmarkName",
              av.algorithm_code AS "algorithmCode", av.version AS "algorithmVersion",
              sr.overall_similarity_score::float AS "overallSimilarityScore",
              sr.predictability_index::float AS "predictabilityIndex",
              sr.production_readiness_score::float AS "productionReadinessScore",
              sr.required_metric_completion_score::float AS "requiredMetricCompletionScore",
              sr.traffic_light::text AS "trafficLight",
              sr.key_risks AS "keyRisks", sr.recommendations,
              sr.is_best_match AS "isBestMatch", sr.generated_at AS "generatedAt"
       FROM score_reports sr
       JOIN benchmark_profiles bp ON bp.id = sr.benchmark_profile_id
       JOIN algorithm_versions av ON av.id = sr.algorithm_version_id
       WHERE sr.production_run_id = $1
       ORDER BY sr.is_best_match DESC, sr.predictability_index DESC`,
      [runId]
    );

    const reports = result.rows as ReportRecord[];
    for (const report of reports) {
      report['metrics'] = await this.scoreReportMetrics(String(report.id));
    }
    return reports;
  }

  async runSummaries(runId: string): Promise<ReportRecord[]> {
    const result = await getPool().query(
      `SELECT rms.id, md.display_name AS "metricName", md.metric_key AS "metricKey",
              md.category::text AS category,
              tcd.condition_name AS "conditionName",
              rms.n_samples AS "nSamples",
              rms.mean_value::float AS "meanValue",
              rms.std_dev::float AS "stdDev",
              rms.min_value::float AS "minValue",
              rms.max_value::float AS "maxValue",
              rms.unit,
              rms.source_table AS "sourceTable",
              rms.generated_at AS "generatedAt"
       FROM run_metric_summaries rms
       JOIN metric_definitions md ON md.id = rms.metric_id
       LEFT JOIN test_condition_definitions tcd ON tcd.id = rms.condition_id
       WHERE rms.production_run_id = $1
       ORDER BY md.category::text, md.sort_order, md.metric_key`,
      [runId]
    );
    return result.rows as ReportRecord[];
  }

  async formulationRecipe(formulationId: string): Promise<ReportRecord[]> {
    const result = await getPool().query(
      `SELECT m.material_code AS "materialCode",
              m.material_name AS material,
              s.supplier_name AS supplier,
              ml.lot_number AS lot,
              fc.percent_composition::float AS percent,
              fc.basis
       FROM formulation_components fc
       JOIN materials m ON m.id = fc.material_id
       JOIN suppliers s ON s.id = fc.supplier_id
       LEFT JOIN material_lots ml ON ml.id = fc.material_lot_id
       WHERE fc.formulation_id = $1
       ORDER BY fc.sort_order, fc.created_at`,
      [formulationId]
    );
    return result.rows as ReportRecord[];
  }

  async labResults(runId: string): Promise<ReportRecord[]> {
    const result = await getPool().query(
      `SELECT 'sample_result' AS "resultType", s.sample_code AS "sampleCode",
              md.display_name AS "metricName", md.category::text AS category,
              str.value_numeric::float AS value, str.unit,
              NULL::text AS "conditionName", str.tested_at AS "recordedAt"
       FROM sample_test_results str
       JOIN samples s ON s.id = str.sample_id
       JOIN metric_definitions md ON md.id = str.metric_id
       WHERE s.production_run_id = $1
       UNION ALL
       SELECT 'environmental_result' AS "resultType", s.sample_code AS "sampleCode",
              md.display_name AS "metricName", md.category::text AS category,
              etr.value_numeric::float AS value, etr.unit,
              tcd.condition_name AS "conditionName", etr.tested_at AS "recordedAt"
       FROM environmental_test_results etr
       JOIN samples s ON s.id = etr.sample_id
       JOIN metric_definitions md ON md.id = etr.metric_id
       LEFT JOIN test_condition_definitions tcd ON tcd.id = etr.test_condition_id
       WHERE s.production_run_id = $1
       ORDER BY "recordedAt" DESC NULLS LAST, "sampleCode", "metricName"`,
      [runId]
    );
    return result.rows as ReportRecord[];
  }

  async saveSnapshot(input: {
    generatedBy: string | null;
    primaryScoreReportId: string | null;
    productionRunId: string;
    reportName: string;
    snapshot: ReportSnapshot;
  }): Promise<ReportRecord> {
    const result = await getPool().query<{ id: string }>(
      `INSERT INTO generated_reports
        (production_run_id, primary_score_report_id, report_name, report_snapshot, generated_by)
       VALUES ($1, $2, $3, $4::jsonb, $5)
       RETURNING id`,
      [
        input.productionRunId,
        input.primaryScoreReportId,
        input.reportName,
        JSON.stringify(input.snapshot),
        input.generatedBy,
      ]
    );
    return (await this.findById(result.rows[0]?.id ?? '')) as ReportRecord;
  }

  private async scoreReportMetrics(scoreReportId: string): Promise<ReportRecord[]> {
    const result = await getPool().query(
      `SELECT srm.id, md.display_name AS "metricName", md.metric_key AS "metricKey",
              md.category::text AS category,
              srm.run_mean_value::float AS "runMeanValue",
              srm.benchmark_target_mean::float AS "benchmarkTargetMean",
              srm.min_acceptable::float AS "minAcceptable",
              srm.max_acceptable::float AS "maxAcceptable",
              srm.weight::float AS weight,
              srm.metric_score::float AS "metricScore",
              srm.traffic_light::text AS "trafficLight",
              srm.risk_level AS "riskLevel",
              srm.risk_note AS "riskNote"
       FROM score_report_metrics srm
       JOIN metric_definitions md ON md.id = srm.metric_id
       WHERE srm.score_report_id = $1
       ORDER BY md.category::text, md.sort_order, md.metric_key`,
      [scoreReportId]
    );
    return result.rows as ReportRecord[];
  }

  private listSql(): string {
    return `SELECT gr.id, gr.production_run_id AS "productionRunId",
                   gr.primary_score_report_id AS "primaryScoreReportId",
                   gr.report_name AS "reportName",
                   gr.report_type AS "reportType",
                   gr.status,
                   gr.report_snapshot AS "reportSnapshot",
                   gr.generated_by AS "generatedBy",
                   gr.generated_at AS "generatedAt",
                   gr.updated_at AS "updatedAt",
                   pr.run_code AS "runCode",
                   CONCAT(f.formulation_code, ' V', f.version_no) AS formulation,
                   gr.report_snapshot #>> '{executiveSummary,bestMatch}' AS "bestMatch",
                   NULLIF(gr.report_snapshot #>> '{executiveSummary,predictabilityIndex}', '')::float AS "predictabilityIndex",
                   gr.report_snapshot #>> '{executiveSummary,trafficLight}' AS "trafficLight"
            FROM generated_reports gr
            JOIN production_runs pr ON pr.id = gr.production_run_id
            JOIN formulations f ON f.id = pr.formulation_id`;
  }

  async withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
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
