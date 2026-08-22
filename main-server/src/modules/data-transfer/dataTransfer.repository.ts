import { createHash, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { ValidationError } from '../../errors/app-error';
import { getPool } from '../../infrastructure/database/pg-pool';
import type { TransferImportResult, TransferRows } from './dataTransfer.types';

type Row = Record<string, unknown>;

const value = (row: Row, key: string) => row[key] === '' ? null : row[key] ?? null;

export class DataTransferRepository {
  async saveToHistoric(resourceType: string, recordId: string, action: 'overwrite' | 'delete', data: Record<string, unknown>, actor: string): Promise<void> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO historic_data (resource_type, record_id, action, data_json, actor) VALUES ($1, $2, $3, $4::jsonb, $5)`,
      [resourceType, recordId, action, JSON.stringify(data), actor]
    );
  }

  async exportRows(resource: string): Promise<TransferRows> {
    switch (resource) {
      case 'material-properties': return { Properties: await this.rows(`
        SELECT m.material_code AS "materialCode", mpd.property_key AS "propertyId", mpd.canonical_name AS "propertyName",
               mpd.category, mpf.source_label AS "sourceLabel", mpd.value_type AS "valueType",
               mpf.value_numeric::float AS "valueNumeric", mpf.value_text AS "valueText", mpf.qualifier, mpf.unit,
               mpf.test_method AS "testMethod", mpf.test_condition AS "testCondition", mpf.temperature_c::float AS "temperatureC",
               mpf.load, msd.source_filename AS "sourceFile", mpf.source_revision_date AS "sourceRevisionDate", mpf.notes
        FROM material_property_facts mpf
        JOIN materials m ON m.id = mpf.material_id
        JOIN material_property_definitions mpd ON mpd.id = mpf.property_definition_id
        LEFT JOIN material_source_documents msd ON msd.id = mpf.source_document_id
        ORDER BY m.material_code, mpd.property_key, mpf.created_at
      `) };
      case 'formulations': return this.exportFormulations();
      case 'production-runs': return this.exportProductionRuns();
      case 'lab-results': return this.exportLabResults();
      default: return {};
    }
  }

  async importMaterialProperties(rows: Row[], actor: string, workbookBytes: Buffer): Promise<TransferImportResult> {
    return this.withTransaction(async (client) => {
      const result = this.result(rows.length);
      const importId = randomUUID();
      const hash = createHash('sha256').update(workbookBytes).digest('hex');
      await client.query(
        `INSERT INTO material_catalog_imports
          (id, status, original_filename, file_size_bytes, file_sha256, blob_object_key, template_key, template_version,
           parsed_snapshot, validation_results, imported_by_actor, committed_at, commit_summary)
         VALUES ($1, 'committed', 'data-transfer.xlsx', $2, $3, $4, 'pis-data-transfer', '1', '{}'::jsonb, '{}'::jsonb, $5, now(), '{}'::jsonb)
         ON CONFLICT (file_sha256) DO UPDATE SET updated_at = now()
         RETURNING id`,
        [importId, workbookBytes.length, hash, `data-transfer/${hash}.xlsx`, actor]
      ).then((query) => { if (query.rows[0]?.id) return query.rows[0].id as string; return importId; });
      const importRow = await client.query<{ id: string }>('SELECT id FROM material_catalog_imports WHERE file_sha256 = $1', [hash]);
      const sourceImportId = importRow.rows[0]?.id ?? importId;

      for (const row of rows) {
        const materialId = await this.resolve(client, 'materials', 'material_code', String(row['materialCode']));
        const definition = await client.query<{ id: string }>(
          `INSERT INTO material_property_definitions (property_key, category, canonical_name, value_type, status)
           VALUES ($1, $2, $3, $4, 'active')
           ON CONFLICT (property_key) DO UPDATE SET category = EXCLUDED.category, canonical_name = EXCLUDED.canonical_name,
             value_type = EXCLUDED.value_type, updated_at = now()
           RETURNING id`,
          [row['propertyId'], row['category'], row['propertyName'], row['valueType']]
        );
        const propertyDefinitionId = definition.rows[0]?.id ?? '';
        const sourceFilename = String(row['sourceFile'] || 'data-transfer.xlsx');
        const sourceDocument = await client.query<{ id: string }>(
          `INSERT INTO material_source_documents (material_id, source_filename, source_revision_date, source_import_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (material_id, source_filename, source_revision_date) DO UPDATE SET updated_at = now()
           RETURNING id`,
          [materialId, sourceFilename, value(row, 'sourceRevisionDate'), sourceImportId]
        );
        const identity = [materialId, propertyDefinitionId, row['sourceLabel'], row['testMethod'], row['testCondition'] ?? ''].join('|');
        const existing = await client.query<{ id: string }>(
          `SELECT id FROM material_property_facts
           WHERE material_id = $1 AND property_definition_id = $2 AND source_label = $3 AND test_method = $4
             AND COALESCE(test_condition, '') = COALESCE($5, '') LIMIT 1`,
          [materialId, propertyDefinitionId, row['sourceLabel'], row['testMethod'], value(row, 'testCondition')]
        );
        const factHash = createHash('sha256').update(`${identity}|${JSON.stringify(row)}`).digest('hex');
        if (existing.rows[0]?.id) {
          await client.query(
            `UPDATE material_property_facts SET source_document_id = $2, value_numeric = $3, value_text = $4, qualifier = $5,
             unit = $6, test_condition = $7, temperature_c = $8, load = $9, source_revision_date = $10, notes = $11,
             fact_hash = $12, source_import_id = $13 WHERE id = $1`,
            [existing.rows[0].id, sourceDocument.rows[0]?.id, value(row, 'valueNumeric'), value(row, 'valueText'), value(row, 'qualifier'),
              value(row, 'unit'), value(row, 'testCondition'), value(row, 'temperatureC'), value(row, 'load'), value(row, 'sourceRevisionDate'),
              value(row, 'notes'), factHash, sourceImportId]
          );
          result.updated += 1;
        } else {
          await client.query(
            `INSERT INTO material_property_facts
              (material_id, property_definition_id, source_document_id, source_label, value_numeric, value_text, qualifier, unit,
               test_method, test_condition, temperature_c, load, source_revision_date, notes, fact_hash, source_import_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
            [materialId, propertyDefinitionId, sourceDocument.rows[0]?.id, row['sourceLabel'], value(row, 'valueNumeric'), value(row, 'valueText'),
              value(row, 'qualifier'), value(row, 'unit'), row['testMethod'], value(row, 'testCondition'), value(row, 'temperatureC'),
              value(row, 'load'), value(row, 'sourceRevisionDate'), value(row, 'notes'), factHash, sourceImportId]
          );
          result.created += 1;
        }
      }
      return result;
    });
  }

  async importFormulations(data: TransferRows): Promise<TransferImportResult> {
    const formulations = data['Formulations'] ?? [];
    const components = data['Components'] ?? [];
    return this.withTransaction(async (client) => {
      const result = this.result(formulations.length + components.length);
      for (const row of formulations) {
        const experimentId = row['experimentName'] ? await this.upsertNamed(client, 'experiments', 'experiment_name', String(row['experimentName'])) : null;
        const familyId = row['family'] ? await this.upsertNamed(client, 'formulation_families', 'family_name', String(row['family'])) : null;
        const benchmarkId = row['targetBenchmarkCode'] ? await this.resolve(client, 'benchmark_profiles', 'benchmark_code', String(row['targetBenchmarkCode'])) : null;
        const saved = await client.query<{ id: string; inserted: boolean }>(
          `INSERT INTO formulations (formulation_code, version_no, experiment_id, family_id, target_benchmark_id, status, notes)
           VALUES ($1,$2,$3,$4,$5,$6::formulation_status,$7)
           ON CONFLICT (formulation_code, version_no) DO UPDATE SET experiment_id=EXCLUDED.experiment_id, family_id=EXCLUDED.family_id,
             target_benchmark_id=EXCLUDED.target_benchmark_id, status=EXCLUDED.status, notes=EXCLUDED.notes, updated_at=now()
           RETURNING id, (xmax = 0) AS inserted`,
          [row['formulationCode'], row['versionNo'], experimentId, familyId, benchmarkId, row['status'] || 'draft', value(row, 'notes')]
        );
        if (saved.rows[0]?.inserted) result.created += 1; else result.updated += 1;
      }
      const formulationKeys = new Set(components.map((row) => `${row['formulationCode']}|${row['versionNo']}`));
      for (const key of formulationKeys) {
        const [code, version] = key.split('|');
        const formulationId = await this.resolveFormulation(client, code ?? '', Number(version));
        await client.query('DELETE FROM formulation_components WHERE formulation_id = $1', [formulationId]);
        const matching = components.filter((row) => `${row['formulationCode']}|${row['versionNo']}` === key);
        for (const row of matching) {
          const materialId = await this.resolve(client, 'materials', 'material_code', String(row['materialCode']));
          const supplierId = await this.resolve(client, 'suppliers', 'supplier_code', String(row['supplierCode']));
          const lotId = row['lotNumber'] ? await this.resolveLot(client, String(row['lotNumber']), materialId, supplierId) : null;
          await client.query(
            `INSERT INTO formulation_components (formulation_id, material_id, supplier_id, material_lot_id, percent_composition, basis, sort_order)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [formulationId, materialId, supplierId, lotId, row['percentComposition'], row['basis'] || 'weight_percent', row['sortOrder'] ?? 0]
          );
          result.updated += 1;
        }
      }
      return result;
    });
  }

  async importProductionRuns(data: TransferRows): Promise<TransferImportResult> {
    const runs = data['Production Runs'] ?? [];
    const samples = data['Samples'] ?? [];
    return this.withTransaction(async (client) => {
      const result = this.result(runs.length + samples.length);
      for (const row of runs) {
        const formulationId = await this.resolveFormulation(client, String(row['formulationCode']), Number(row['formulationVersion']));
        const machineId = await this.resolve(client, 'machines', 'machine_code', String(row['machineCode']));
        const moldId = await this.resolve(client, 'molds', 'mold_code', String(row['moldCode']));
        const saved = await client.query<{ inserted: boolean }>(
          `INSERT INTO production_runs
            (run_code, formulation_id, date_produced, machine_id, mold_id, injection_pressure, injection_pressure_unit,
             melt_temperature, melt_temperature_unit, cooling_time, cooling_time_unit, cycle_time, cycle_time_unit,
             cure_hours_before_test, job_name, part_number, operator_name, shift_code, status)
           VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'psi'),$8,COALESCE($9,'C'),$10,COALESCE($11,'sec'),$12,COALESCE($13,'sec'),
             COALESCE($14,72),$15,$16,$17,$18,$19::production_run_status)
           ON CONFLICT (run_code) DO UPDATE SET formulation_id=EXCLUDED.formulation_id, date_produced=EXCLUDED.date_produced,
             machine_id=EXCLUDED.machine_id, mold_id=EXCLUDED.mold_id, injection_pressure=EXCLUDED.injection_pressure,
             injection_pressure_unit=EXCLUDED.injection_pressure_unit, melt_temperature=EXCLUDED.melt_temperature,
             melt_temperature_unit=EXCLUDED.melt_temperature_unit, cooling_time=EXCLUDED.cooling_time,
             cooling_time_unit=EXCLUDED.cooling_time_unit, cycle_time=EXCLUDED.cycle_time, cycle_time_unit=EXCLUDED.cycle_time_unit,
             cure_hours_before_test=EXCLUDED.cure_hours_before_test, job_name=EXCLUDED.job_name, part_number=EXCLUDED.part_number,
             operator_name=EXCLUDED.operator_name, shift_code=EXCLUDED.shift_code, status=EXCLUDED.status, updated_at=now()
           RETURNING (xmax = 0) AS inserted`,
          [row['runCode'], formulationId, row['dateProduced'], machineId, moldId, value(row, 'injectionPressure'), value(row, 'injectionPressureUnit'),
            value(row, 'meltTemperature'), value(row, 'meltTemperatureUnit'), value(row, 'coolingTime'), value(row, 'coolingTimeUnit'),
            value(row, 'cycleTime'), value(row, 'cycleTimeUnit'), value(row, 'cureHoursBeforeTest'), value(row, 'jobName'), value(row, 'partNumber'),
            value(row, 'operatorName'), value(row, 'shiftCode'), row['status'] || 'planned']
        );
        if (saved.rows[0]?.inserted) result.created += 1; else result.updated += 1;
      }
      for (const row of samples) {
        const runId = await this.resolve(client, 'production_runs', 'run_code', String(row['runCode']));
        const saved = await client.query<{ inserted: boolean }>(
          `INSERT INTO samples (production_run_id, sample_code, cavity_number, status)
           VALUES ($1,$2,$3,$4::sample_status)
           ON CONFLICT (sample_code) DO UPDATE SET production_run_id=EXCLUDED.production_run_id, cavity_number=EXCLUDED.cavity_number,
             status=EXCLUDED.status, updated_at=now() RETURNING (xmax = 0) AS inserted`,
          [runId, row['sampleCode'], value(row, 'cavityNumber'), row['status'] || 'created']
        );
        if (saved.rows[0]?.inserted) result.created += 1; else result.updated += 1;
      }
      return result;
    });
  }

  async importLabResults(data: TransferRows): Promise<TransferImportResult> {
    const allRows = Object.values(data).reduce((total, rows) => total + rows.length, 0);
    return this.withTransaction(async (client) => {
      const result = this.result(allRows);
      for (const row of data['Lab Results'] ?? []) {
        const refs = await this.labRefs(client, row);
        const existing = await client.query<{ id: string }>(
          'SELECT id FROM sample_test_results WHERE sample_id=$1 AND metric_id=$2 AND test_method_id IS NOT DISTINCT FROM $3 LIMIT 1',
          [refs.sampleId, refs.metricId, refs.methodId]
        );
        if (existing.rows[0]?.id) {
          await client.query(`UPDATE sample_test_results SET value_numeric=$2, unit=$3, tested_by=$4,
            tested_at=COALESCE($5::timestamptz,tested_at), audit_reason=$6, updated_at=now() WHERE id=$1`,
          [existing.rows[0].id, row['valueNumeric'], value(row, 'unit'), value(row, 'testedBy'), value(row, 'testedAt'), value(row, 'auditReason')]);
          result.updated += 1;
        } else {
          await client.query(`INSERT INTO sample_test_results (sample_id, metric_id, test_method_id, value_numeric, unit, tested_by, tested_at, audit_reason)
            VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7::timestamptz,now()),$8)`,
          [refs.sampleId, refs.metricId, refs.methodId, row['valueNumeric'], value(row, 'unit'), value(row, 'testedBy'), value(row, 'testedAt'), value(row, 'auditReason')]);
          result.created += 1;
        }
      }
      for (const row of data['Environmental Results'] ?? []) {
        const refs = await this.labRefs(client, row);
        const conditionId = row['conditionCode'] ? await this.resolve(client, 'test_condition_definitions', 'condition_code', String(row['conditionCode'])) : null;
        const existing = await client.query<{ id: string }>(`SELECT id FROM environmental_test_results WHERE sample_id=$1 AND metric_id=$2
          AND test_condition_id IS NOT DISTINCT FROM $3 AND test_method_id IS NOT DISTINCT FROM $4 LIMIT 1`,
        [refs.sampleId, refs.metricId, conditionId, refs.methodId]);
        if (existing.rows[0]?.id) {
          await client.query(`UPDATE environmental_test_results SET value_numeric=$2, unit=$3, tested_by=$4,
            tested_at=COALESCE($5::timestamptz,tested_at), audit_reason=$6, updated_at=now() WHERE id=$1`,
          [existing.rows[0].id, row['valueNumeric'], value(row, 'unit'), value(row, 'testedBy'), value(row, 'testedAt'), value(row, 'auditReason')]);
          result.updated += 1;
        } else {
          await client.query(`INSERT INTO environmental_test_results (sample_id, metric_id, test_condition_id, test_method_id, value_numeric, unit, tested_by, tested_at, audit_reason)
            VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8::timestamptz,now()),$9)`,
          [refs.sampleId, refs.metricId, conditionId, refs.methodId, row['valueNumeric'], value(row, 'unit'), value(row, 'testedBy'), value(row, 'testedAt'), value(row, 'auditReason')]);
          result.created += 1;
        }
      }
      for (const row of data['Subjective Ratings'] ?? []) {
        const sampleId = await this.resolve(client, 'samples', 'sample_code', String(row['sampleCode']));
        const metricId = row['metricKey'] ? await this.resolve(client, 'metric_definitions', 'metric_key', String(row['metricKey'])) : null;
        const existing = await client.query<{ id: string }>('SELECT id FROM sample_subjective_ratings WHERE sample_id=$1 AND metric_id IS NOT DISTINCT FROM $2 LIMIT 1', [sampleId, metricId]);
        if (existing.rows[0]?.id) {
          await client.query(`UPDATE sample_subjective_ratings SET rating_value=$2, feedback_text=$3, rated_by=$4,
            rated_at=COALESCE($5::timestamptz,rated_at), audit_reason=$6, updated_at=now() WHERE id=$1`,
          [existing.rows[0].id, value(row, 'ratingValue'), value(row, 'feedbackText'), value(row, 'ratedBy'), value(row, 'ratedAt'), value(row, 'auditReason')]);
          result.updated += 1;
        } else {
          await client.query(`INSERT INTO sample_subjective_ratings (sample_id, metric_id, rating_value, feedback_text, rated_by, rated_at, audit_reason)
            VALUES ($1,$2,$3,$4,$5,COALESCE($6::timestamptz,now()),$7)`,
          [sampleId, metricId, value(row, 'ratingValue'), value(row, 'feedbackText'), value(row, 'ratedBy'), value(row, 'ratedAt'), value(row, 'auditReason')]);
          result.created += 1;
        }
      }
      for (const row of data['Observations'] ?? []) {
        const sampleId = await this.resolve(client, 'samples', 'sample_code', String(row['sampleCode']));
        const exists = await client.query(
          `SELECT 1 FROM sample_observations WHERE sample_id=$1 AND observation_type=$2 AND observation_text=$3
           AND observed_at=COALESCE($4::timestamptz, observed_at) LIMIT 1`,
          [sampleId, row['observationType'] || 'general', row['observationText'], value(row, 'observedAt')]
        );
        if (exists.rowCount) { result.skipped += 1; continue; }
        await client.query(
          `INSERT INTO sample_observations (sample_id, observation_type, observation_text, observed_by, observed_at, audit_reason)
           VALUES ($1,$2,$3,$4,COALESCE($5::timestamptz,now()),$6)`,
          [sampleId, row['observationType'] || 'general', row['observationText'], value(row, 'observedBy'), value(row, 'observedAt'), value(row, 'auditReason')]
        );
        result.created += 1;
      }
      return result;
    });
  }

  private async exportFormulations(): Promise<TransferRows> {
    return {
      Formulations: await this.rows(`SELECT f.formulation_code AS "formulationCode", f.version_no AS "versionNo", e.experiment_name AS "experimentName",
        ff.family_name AS family, bp.benchmark_code AS "targetBenchmarkCode", f.status::text AS status, f.notes
        FROM formulations f LEFT JOIN experiments e ON e.id=f.experiment_id LEFT JOIN formulation_families ff ON ff.id=f.family_id
        LEFT JOIN benchmark_profiles bp ON bp.id=f.target_benchmark_id ORDER BY f.formulation_code,f.version_no`),
      Components: await this.rows(`SELECT f.formulation_code AS "formulationCode", f.version_no AS "versionNo", m.material_code AS "materialCode",
        s.supplier_code AS "supplierCode", ml.lot_number AS "lotNumber", fc.percent_composition::float AS "percentComposition", fc.basis, fc.sort_order AS "sortOrder"
        FROM formulation_components fc JOIN formulations f ON f.id=fc.formulation_id JOIN materials m ON m.id=fc.material_id
        JOIN suppliers s ON s.id=fc.supplier_id LEFT JOIN material_lots ml ON ml.id=fc.material_lot_id
        ORDER BY f.formulation_code,f.version_no,fc.sort_order`),
    };
  }

  private async exportProductionRuns(): Promise<TransferRows> {
    return {
      'Production Runs': await this.rows(`SELECT pr.run_code AS "runCode", f.formulation_code AS "formulationCode", f.version_no AS "formulationVersion",
        pr.date_produced AS "dateProduced", m.machine_code AS "machineCode", mo.mold_code AS "moldCode", pr.injection_pressure::float AS "injectionPressure",
        pr.injection_pressure_unit AS "injectionPressureUnit", pr.melt_temperature::float AS "meltTemperature", pr.melt_temperature_unit AS "meltTemperatureUnit",
        pr.cooling_time::float AS "coolingTime", pr.cooling_time_unit AS "coolingTimeUnit", pr.cycle_time::float AS "cycleTime",
        pr.cycle_time_unit AS "cycleTimeUnit", pr.cure_hours_before_test::float AS "cureHoursBeforeTest", pr.job_name AS "jobName",
        pr.part_number AS "partNumber", pr.operator_name AS "operatorName", pr.shift_code AS "shiftCode", pr.status::text AS status
        FROM production_runs pr JOIN formulations f ON f.id=pr.formulation_id JOIN machines m ON m.id=pr.machine_id JOIN molds mo ON mo.id=pr.mold_id
        ORDER BY pr.date_produced DESC,pr.run_code`),
      Samples: await this.rows(`SELECT pr.run_code AS "runCode", s.sample_code AS "sampleCode", s.cavity_number AS "cavityNumber", s.status::text AS status
        FROM samples s JOIN production_runs pr ON pr.id=s.production_run_id ORDER BY pr.run_code,s.sample_code`),
    };
  }

  private async exportLabResults(): Promise<TransferRows> {
    return {
      'Lab Results': await this.rows(`SELECT s.sample_code AS "sampleCode", md.metric_key AS "metricKey", tm.method_code AS "methodCode",
        r.value_numeric::float AS "valueNumeric", r.unit, r.tested_by AS "testedBy", r.tested_at AS "testedAt", r.audit_reason AS "auditReason"
        FROM sample_test_results r JOIN samples s ON s.id=r.sample_id JOIN metric_definitions md ON md.id=r.metric_id
        LEFT JOIN test_method_definitions tm ON tm.id=r.test_method_id ORDER BY s.sample_code,md.metric_key`),
      'Environmental Results': await this.rows(`SELECT s.sample_code AS "sampleCode", md.metric_key AS "metricKey", tc.condition_code AS "conditionCode",
        tm.method_code AS "methodCode", r.value_numeric::float AS "valueNumeric", r.unit, r.tested_by AS "testedBy", r.tested_at AS "testedAt", r.audit_reason AS "auditReason"
        FROM environmental_test_results r JOIN samples s ON s.id=r.sample_id JOIN metric_definitions md ON md.id=r.metric_id
        LEFT JOIN test_condition_definitions tc ON tc.id=r.test_condition_id LEFT JOIN test_method_definitions tm ON tm.id=r.test_method_id
        ORDER BY s.sample_code,md.metric_key`),
      'Subjective Ratings': await this.rows(`SELECT s.sample_code AS "sampleCode", md.metric_key AS "metricKey", r.rating_value::float AS "ratingValue",
        r.feedback_text AS "feedbackText", r.rated_by AS "ratedBy", r.rated_at AS "ratedAt", r.audit_reason AS "auditReason"
        FROM sample_subjective_ratings r JOIN samples s ON s.id=r.sample_id LEFT JOIN metric_definitions md ON md.id=r.metric_id
        ORDER BY s.sample_code,md.metric_key`),
      Observations: await this.rows(`SELECT s.sample_code AS "sampleCode", r.observation_type AS "observationType", r.observation_text AS "observationText",
        r.observed_by AS "observedBy", r.observed_at AS "observedAt", r.audit_reason AS "auditReason"
        FROM sample_observations r JOIN samples s ON s.id=r.sample_id ORDER BY s.sample_code,r.observed_at`),
    };
  }

  private async labRefs(client: PoolClient, row: Row) {
    return {
      sampleId: await this.resolve(client, 'samples', 'sample_code', String(row['sampleCode'])),
      metricId: await this.resolve(client, 'metric_definitions', 'metric_key', String(row['metricKey'])),
      methodId: row['methodCode'] ? await this.resolve(client, 'test_method_definitions', 'method_code', String(row['methodCode'])) : null,
    };
  }

  private async resolve(client: PoolClient, table: string, column: string, code: string): Promise<string> {
    const result = await client.query<{ id: string }>(`SELECT id FROM ${table} WHERE ${column} = $1 LIMIT 1`, [code]);
    if (!result.rows[0]?.id) throw new ValidationError(`Unknown ${column.replaceAll('_', ' ')}: ${code}`);
    return result.rows[0].id;
  }

  private async resolveFormulation(client: PoolClient, code: string, version: number): Promise<string> {
    const result = await client.query<{ id: string }>('SELECT id FROM formulations WHERE formulation_code=$1 AND version_no=$2 LIMIT 1', [code, version]);
    if (!result.rows[0]?.id) throw new ValidationError(`Unknown formulation: ${code} V${version}`);
    return result.rows[0].id;
  }

  private async resolveLot(client: PoolClient, lotNumber: string, materialId: string, supplierId: string): Promise<string> {
    const result = await client.query<{ id: string }>(`SELECT ml.id FROM material_lots ml JOIN supplier_materials sm ON sm.id=ml.supplier_material_id
      WHERE ml.lot_number=$1 AND sm.material_id=$2 AND sm.supplier_id=$3 LIMIT 1`, [lotNumber, materialId, supplierId]);
    if (!result.rows[0]?.id) throw new ValidationError(`Unknown material lot: ${lotNumber}`);
    return result.rows[0].id;
  }

  private async upsertNamed(client: PoolClient, table: string, column: string, name: string): Promise<string> {
    const result = await client.query<{ id: string }>(`INSERT INTO ${table} (${column}) VALUES ($1) ON CONFLICT (${column}) DO UPDATE SET updated_at=now() RETURNING id`, [name]);
    return result.rows[0]?.id ?? '';
  }

  private async rows(sql: string): Promise<Row[]> {
    return (await getPool().query(sql)).rows as Row[];
  }

  private result(processed: number): TransferImportResult {
    return { created: 0, errors: [], processed, skipped: 0, updated: 0 };
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
