import { ConflictError, ValidationError } from '../../errors/app-error';
import { getPool } from '../../infrastructure/database/pg-pool';
import type { PredictionInputSnapshot, PredictionRecord } from './prediction.types';

const RUNNING_PER_RUN_GUARD_INDEX = 'uq_prediction_results_running_per_run';

interface RunRow {
  formulationId: string;
  formulationCode: string;
  versionNo: number;
  machineId: string;
  machineCode: string;
  moldId: string;
  moldCode: string;
}

export class PredictionRepository {
  async inputForRun(runId: string): Promise<PredictionInputSnapshot | null> {
    const runResult = await getPool().query<RunRow>(
      `SELECT f.id AS "formulationId", f.formulation_code AS "formulationCode", f.version_no AS "versionNo",
              machine.id AS "machineId", machine.machine_code AS "machineCode",
              mold.id AS "moldId", mold.mold_code AS "moldCode"
       FROM production_runs pr
       JOIN formulations f ON f.id = pr.formulation_id
       JOIN machines machine ON machine.id = pr.machine_id
       JOIN molds mold ON mold.id = pr.mold_id
       WHERE pr.id = $1 AND pr.status <> 'archived'`,
      [runId]
    );
    const run = runResult.rows[0];
    if (!run) return null;

    const [components, parameters] = await Promise.all([
      getPool().query(
        `SELECT fc.material_id AS "material_id", material.material_code AS "material_code",
                fc.supplier_id AS "supplier_id", COALESCE(prml.material_lot_id, fc.material_lot_id) AS "material_lot_id",
                fc.percent_composition::float AS "percent_composition", fc.basis
         FROM formulation_components fc
         JOIN materials material ON material.id = fc.material_id
         LEFT JOIN production_run_material_lots prml
           ON prml.production_run_id = $1 AND prml.formulation_component_id = fc.id
         WHERE fc.formulation_id = $2
         ORDER BY fc.sort_order, fc.id`,
        [runId, run.formulationId]
      ),
      getPool().query(
        `SELECT value.parameter_definition_id AS "parameter_definition_id", definition.parameter_key AS "parameter_key",
                value.position_type AS "position_type", value.position_index AS "position_index",
                value.position_label AS "position_label",
                COALESCE(value.actual_numeric, value.setpoint_numeric)::float AS "value_numeric",
                COALESCE(value.actual_text, value.setpoint_text) AS "value_text", value.unit
         FROM production_run_process_values value
         JOIN process_parameter_definitions definition ON definition.id = value.parameter_definition_id
         WHERE value.production_run_id = $1
           AND (COALESCE(value.actual_numeric, value.setpoint_numeric) IS NOT NULL
             OR COALESCE(value.actual_text, value.setpoint_text) IS NOT NULL)
         ORDER BY definition.sort_order, value.position_index`,
        [runId]
      ),
    ]);

    return {
      formula: {
        formulation_id: run.formulationId,
        formulation_code: run.formulationCode,
        version_no: run.versionNo,
        components: components.rows,
      },
      machine_id: run.machineId,
      machine_code: run.machineCode,
      mold_id: run.moldId,
      mold_code: run.moldCode,
      process_parameters: parameters.rows,
      environment_observations: [],
      process: {},
    };
  }

  async getModelStatus(modelId: string): Promise<string | null> {
    const result = await getPool().query<{ status: string }>(
      `SELECT status FROM prediction_models WHERE model_id = $1`,
      [modelId]
    );
    return result.rows[0]?.status ?? null;
  }

  async start(
    runId: string,
    modelId: string,
    requestedBy: string,
    input: PredictionInputSnapshot,
    staleTimeoutMillis: number
  ): Promise<PredictionRecord> {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      // Release any execution left stuck in "running" (e.g. by a server crash) so it
      // doesn't block new runs forever, and so it doesn't trip the one-active-run guard.
      await client.query(
        `UPDATE prediction_results
         SET status = 'failed', completed_at = now(), failure_message = 'Execution timed out and was released'
         WHERE production_run_id = $1 AND status = 'running'
           AND started_at < now() - make_interval(secs => $2::float / 1000)`,
        [runId, staleTimeoutMillis]
      );
      await client.query(
        `INSERT INTO prediction_models (model_id) VALUES ($1)
         ON CONFLICT (model_id) DO UPDATE SET last_used_at = now()`,
        [modelId]
      );
      let predictionId: string | undefined;
      try {
        const result = await client.query<{ id: string }>(
          `INSERT INTO prediction_results (production_run_id, model_id, input_snapshot, requested_by, status)
           VALUES ($1, $2, $3::jsonb, $4, 'running') RETURNING id`,
          [runId, modelId, JSON.stringify(input), requestedBy]
        );
        predictionId = result.rows[0]?.id;
      } catch (error) {
        if (isUniqueViolation(error, RUNNING_PER_RUN_GUARD_INDEX)) {
          throw new ConflictError('A prediction is already running for this production run');
        }
        throw error;
      }
      if (!predictionId) throw new Error('Prediction result was not created');
      await client.query('COMMIT');
      const started = await this.findById(predictionId);
      if (!started) throw new Error('Prediction run could not be loaded');
      return started;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async complete(predictionId: string, predictions: Record<string, number>): Promise<PredictionRecord> {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const parsed = Object.entries(predictions).map(([metricKey, value]) => {
        const [baseKey, conditionCode] = metricKey.split('::');
        return { baseKey, conditionCode: conditionCode ?? null, metricKey, value };
      });
      const knownMetrics = await client.query<{ metric_key: string }>(
        `SELECT metric_key FROM metric_definitions WHERE metric_key = ANY($1::text[])`,
        [parsed.map((entry) => entry.baseKey)]
      );
      const knownMetricKeys = new Set(knownMetrics.rows.map((row) => row.metric_key));
      const unknown = parsed.filter((entry) => !knownMetricKeys.has(entry.baseKey));
      if (unknown.length) {
        throw new ValidationError(
          `Prediction processor returned unknown metrics: ${unknown.map((entry) => entry.metricKey).join(', ')}`
        );
      }
      for (const { baseKey, conditionCode, metricKey, value } of parsed) {
        await client.query(
          `INSERT INTO prediction_result_metrics
             (prediction_result_id, metric_id, condition_id, metric_key, predicted_value)
           SELECT $1, metric.id, condition.id, $2, $3
           FROM (SELECT 1) source
           LEFT JOIN metric_definitions metric ON metric.metric_key = $4
           LEFT JOIN test_condition_definitions condition ON condition.condition_code = $5`,
          [predictionId, metricKey, value, baseKey, conditionCode]
        );
      }
      await client.query(
        `UPDATE prediction_results
         SET status = 'completed', completed_at = now(), failure_message = NULL
         WHERE id = $1`,
        [predictionId]
      );
      await client.query('COMMIT');
      const saved = await this.findById(predictionId);
      if (!saved) throw new Error('Prediction result could not be loaded');
      return saved;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async fail(predictionId: string, message: string): Promise<void> {
    await getPool().query(
      `UPDATE prediction_results
       SET status = 'failed', completed_at = now(), failure_message = $2
       WHERE id = $1`,
      [predictionId, message.slice(0, 2000)]
    );
  }

  async listForRun(runId: string): Promise<PredictionRecord[]> {
    const results = await getPool().query(
      `SELECT id, production_run_id AS "productionRunId", model_id AS "modelId",
              requested_by AS "requestedBy", generated_at AS "generatedAt", status,
              started_at AS "startedAt", completed_at AS "completedAt", failure_message AS "failureMessage"
       FROM prediction_results WHERE production_run_id = $1 ORDER BY generated_at DESC`,
      [runId]
    );
    return this.withMetricsBatch(results.rows as PredictionRecord[]);
  }

  private async findById(id: string): Promise<PredictionRecord | null> {
    const result = await getPool().query(
      `SELECT id, production_run_id AS "productionRunId", model_id AS "modelId",
              requested_by AS "requestedBy", generated_at AS "generatedAt", status,
              started_at AS "startedAt", completed_at AS "completedAt", failure_message AS "failureMessage"
       FROM prediction_results WHERE id = $1`,
      [id]
    );
    if (!result.rows[0]) return null;
    const [record] = await this.withMetricsBatch([result.rows[0] as PredictionRecord]);
    return record ?? null;
  }

  private async withMetricsBatch(records: PredictionRecord[]): Promise<PredictionRecord[]> {
    if (!records.length) return records;
    const metrics = await getPool().query(
      `SELECT prm.prediction_result_id AS "predictionResultId", prm.metric_id AS "metricId",
              prm.metric_key AS "metricKey", COALESCE(metric.display_name, prm.metric_key) AS "metricName",
              condition.condition_code AS "conditionCode", prm.predicted_value::float AS "predictedValue",
              metric.default_unit AS unit
       FROM prediction_result_metrics prm
       LEFT JOIN metric_definitions metric ON metric.id = prm.metric_id
       LEFT JOIN test_condition_definitions condition ON condition.id = prm.condition_id
       WHERE prm.prediction_result_id = ANY($1::uuid[]) ORDER BY prm.prediction_result_id, prm.metric_key`,
      [records.map((record) => record.id)]
    );
    const byResultId = new Map<string, PredictionRecord['metrics']>();
    for (const { predictionResultId, ...metric } of metrics.rows) {
      const list = byResultId.get(predictionResultId) ?? [];
      list.push(metric);
      byResultId.set(predictionResultId, list);
    }
    return records.map((record) => ({ ...record, metrics: byResultId.get(record.id) ?? [] }));
  }
}

function isUniqueViolation(error: unknown, constraintName: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === '23505' &&
    (error as { constraint?: string }).constraint === constraintName
  );
}
