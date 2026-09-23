import { createHash, randomUUID } from 'node:crypto';
import { formatCode } from '../../core/code-format';
import type { PoolClient } from 'pg';
import { ValidationError } from '../../errors/app-error';
import { getPool } from '../../infrastructure/database/pg-pool';
import type { TransferImportResult, TransferRows } from './dataTransfer.types';

type Row = Record<string, unknown>;
type SampleRow = { id: string; sampleCode: string };
type RunRow = { id: string; runCode: string };
type MetricRow = { id: string; metricKey: string; category: string; defaultUnit: string | null };
type MachineSetupProfileParameterMetadata = { displayName: string; category: string };

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
      case 'machines': return this.exportMachines();
      case 'molds': return this.exportMolds();
      case 'benchmarks': return this.exportBenchmarks();
      case 'formulations': return this.exportFormulations();
      case 'production-runs': return this.exportProductionRuns();
      case 'machine-setup-profiles': return this.exportMachineSetupProfiles();
      case 'scoring-profiles': return this.exportScoringProfiles();
      case 'testing': return this.exportTesting();
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

  async importMachinesWithParameters(data: TransferRows): Promise<TransferImportResult> {
    const machines = data['Machines'] ?? [];
    const parameters = data['Machine Parameters'] ?? [];
    return this.withTransaction(async (client) => {
      const result = this.result(machines.length + parameters.length);
      for (const row of machines) {
        const saved = await client.query<{ inserted: boolean }>(
          `INSERT INTO machines (machine_code, machine_name, manufacturer, machine_type, model_number, serial_number, location, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8::record_status)
           ON CONFLICT (machine_code) DO UPDATE SET machine_name=EXCLUDED.machine_name, manufacturer=EXCLUDED.manufacturer,
             machine_type=EXCLUDED.machine_type, model_number=EXCLUDED.model_number, serial_number=EXCLUDED.serial_number,
             location=EXCLUDED.location, status=EXCLUDED.status, updated_at=now()
           RETURNING (xmax = 0) AS inserted`,
          [row['machineCode'], row['machineName'], value(row, 'manufacturer'), value(row, 'machineType'),
            value(row, 'modelNumber'), value(row, 'serialNumber'), value(row, 'location'), row['status'] || 'active']
        );
        if (saved.rows[0]?.inserted) result.created += 1; else result.updated += 1;
      }
      for (const row of parameters) {
        const machineId = await this.resolve(client, 'machines', 'machine_code', String(row['machineCode']));
        const existing = await client.query<{ id: string }>(
          `SELECT id FROM machine_parameter_capabilities
           WHERE machine_id = $1 AND parameter_key = $2 AND position_type = $3
             AND position_index IS NOT DISTINCT FROM $4 AND position_label IS NOT DISTINCT FROM $5
           LIMIT 1`,
          [machineId, row['parameterKey'], row['positionType'] || 'single', value(row, 'positionIndex'), value(row, 'positionLabel')]
        );
        if (existing.rows[0]?.id) {
          await client.query(
            `UPDATE machine_parameter_capabilities
             SET display_name = $2, section_key = $3, minimum_value = $4, maximum_value = $5, unit = $6,
                 sort_order = $7, notes = $8, status = $9::record_status, updated_at = now()
             WHERE id = $1`,
            [existing.rows[0].id, row['displayName'], row['sectionKey'], value(row, 'minimumValue'), value(row, 'maximumValue'),
              value(row, 'unit'), value(row, 'sortOrder') ?? 0, value(row, 'notes'), row['status'] || 'active']
          );
          result.updated += 1;
        } else {
          await client.query(
            `INSERT INTO machine_parameter_capabilities
              (machine_id, parameter_key, display_name, section_key, position_type, position_index, position_label, minimum_value, maximum_value, unit, sort_order, notes, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::record_status)`,
            [machineId, row['parameterKey'], row['displayName'], row['sectionKey'], row['positionType'] || 'single', value(row, 'positionIndex'),
              value(row, 'positionLabel'), value(row, 'minimumValue'), value(row, 'maximumValue'), value(row, 'unit'), value(row, 'sortOrder') ?? 0,
              value(row, 'notes'), row['status'] || 'active']
          );
          result.created += 1;
        }
      }
      return result;
    });
  }

  async importMoldsWithZones(data: TransferRows): Promise<TransferImportResult> {
    const molds = data['Molds'] ?? [];
    const zones = data['Mold Zones'] ?? [];
    return this.withTransaction(async (client) => {
      const result = this.result(molds.length + zones.length);
      for (const row of molds) {
        const saved = await client.query<{ inserted: boolean }>(
          `INSERT INTO molds (mold_code, mold_name, mold_type, manufacturer, cavity_count, hot_runner_controller, zone_count, description, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::record_status)
           ON CONFLICT (mold_code) DO UPDATE SET mold_name=EXCLUDED.mold_name, mold_type=EXCLUDED.mold_type,
             manufacturer=EXCLUDED.manufacturer, cavity_count=EXCLUDED.cavity_count, hot_runner_controller=EXCLUDED.hot_runner_controller,
             zone_count=EXCLUDED.zone_count, description=EXCLUDED.description, status=EXCLUDED.status, updated_at=now()
           RETURNING (xmax = 0) AS inserted`,
          [row['moldCode'], value(row, 'moldName'), value(row, 'moldType'), value(row, 'manufacturer'), value(row, 'cavityCount'),
            value(row, 'hotRunnerController'), value(row, 'zoneCount'), value(row, 'description'), row['status'] || 'active']
        );
        if (saved.rows[0]?.inserted) result.created += 1; else result.updated += 1;
      }
      for (const row of zones) {
        const moldId = await this.resolve(client, 'molds', 'mold_code', String(row['moldCode']));
        const saved = await client.query<{ inserted: boolean }>(
          `INSERT INTO mold_zones (mold_id, zone_number, zone_name, zone_type, minimum_temperature, maximum_temperature, temperature_unit, notes, status)
           VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'°F'),$8,$9::record_status)
           ON CONFLICT (mold_id, zone_number) DO UPDATE SET zone_name=EXCLUDED.zone_name, zone_type=EXCLUDED.zone_type,
             minimum_temperature=EXCLUDED.minimum_temperature, maximum_temperature=EXCLUDED.maximum_temperature,
             temperature_unit=EXCLUDED.temperature_unit, notes=EXCLUDED.notes, status=EXCLUDED.status, updated_at=now()
           RETURNING (xmax = 0) AS inserted`,
          [moldId, row['zoneNumber'], value(row, 'zoneName'), value(row, 'zoneType'), value(row, 'minimumTemperature'),
            value(row, 'maximumTemperature'), value(row, 'temperatureUnit'), value(row, 'notes'), row['status'] || 'active']
        );
        if (saved.rows[0]?.inserted) result.created += 1; else result.updated += 1;
      }
      return result;
    });
  }

  async importBenchmarksWithProperties(data: TransferRows): Promise<TransferImportResult> {
    const benchmarks = data['Benchmarks'] ?? [];
    const properties = data['Benchmark Properties'] ?? [];
    return this.withTransaction(async (client) => {
      const result = this.result(benchmarks.length + properties.length);
      for (const row of benchmarks) {
        const saved = await client.query<{ inserted: boolean }>(
          `INSERT INTO benchmark_profiles (benchmark_code, benchmark_name, profile_version, ball_brand, ball_model, test_date, report_number, status, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8::record_status,$9)
           ON CONFLICT (benchmark_code, profile_version) DO UPDATE SET benchmark_name=EXCLUDED.benchmark_name,
             ball_brand=EXCLUDED.ball_brand, ball_model=EXCLUDED.ball_model, test_date=EXCLUDED.test_date,
             report_number=EXCLUDED.report_number, status=EXCLUDED.status, notes=EXCLUDED.notes, updated_at=now()
           RETURNING (xmax = 0) AS inserted`,
          [row['benchmarkCode'], row['benchmarkName'], row['profileVersion'], row['ballBrand'], row['ballModel'],
            value(row, 'testDate'), value(row, 'reportNumber'), row['status'] || 'active', value(row, 'notes')]
        );
        if (saved.rows[0]?.inserted) result.created += 1; else result.updated += 1;
      }
      for (const row of properties) {
        const benchmarkId = await this.resolveBenchmark(client, String(row['benchmarkCode']), Number(row['profileVersion']));
        const metric = await this.resolveMetric(client, String(row['metricKey']));
        await client.query(
          `INSERT INTO benchmark_metric_targets (benchmark_id, benchmark_profile_id, metric_name, metric_category, metric_id, target_mean, unit, required_for_pass)
           VALUES ($1,$1,$2,$3,$4,$5,$6,false)
           ON CONFLICT (benchmark_id, metric_name) DO UPDATE SET benchmark_profile_id=EXCLUDED.benchmark_profile_id,
             metric_category=EXCLUDED.metric_category, metric_id=EXCLUDED.metric_id, target_mean=EXCLUDED.target_mean,
             unit=EXCLUDED.unit, updated_at=now()`,
          [benchmarkId, metric.metricKey, metric.category, metric.id, value(row, 'value'), metric.defaultUnit]
        );
        result.updated += 1;
      }
      return result;
    });
  }

  async importFormulations(data: TransferRows): Promise<TransferImportResult> {
    const rows = data['Formulations'] ?? [];
    return this.withTransaction(async (client) => {
      const result = this.result(rows.length);
      const grouped = new Map<string, Row[]>();
      for (const row of rows) {
        const key = `${row['formulationCode']}|${row['versionNo']}`;
        grouped.set(key, [...(grouped.get(key) ?? []), row]);
      }

      for (const group of grouped.values()) {
        const formulationRow = group.find((row) => !value(row, 'materialCode')) ?? group[0]!;
        if (formulationRow['status'] === 'approved' && !value(formulationRow, 'approvedBy')) {
          throw new ValidationError(`Approved formulation ${String(formulationRow['formulationCode'])} requires Approved By`);
        }
        const saved = await client.query<{ id: string; inserted: boolean }>(
          `INSERT INTO formulations (formulation_code, formulation_name, version_no, status, approved_by, notes)
           VALUES ($1,$2,$3,$4::formulation_status,$5,$6)
           ON CONFLICT (formulation_code, version_no) DO UPDATE SET formulation_name=EXCLUDED.formulation_name, status=EXCLUDED.status, approved_by=EXCLUDED.approved_by, notes=EXCLUDED.notes, updated_at=now()
           RETURNING id, (xmax = 0) AS inserted`,
          [formulationRow['formulationCode'], value(formulationRow, 'formulationName'), formulationRow['versionNo'], formulationRow['status'] || 'draft', value(formulationRow, 'approvedBy'), value(formulationRow, 'notes')]
        );
        const formulationId = saved.rows[0]?.id ?? await this.resolveFormulation(client, String(formulationRow['formulationCode']), Number(formulationRow['versionNo']));
        if (saved.rows[0]?.inserted) result.created += 1; else result.updated += 1;

        const components = group.filter((row) => value(row, 'materialCode'));
        if (components.length === 0) continue;

        await client.query('DELETE FROM formulation_components WHERE formulation_id = $1', [formulationId]);
        for (const row of components) {
          const materialId = await this.resolve(client, 'materials', 'material_code', String(row['materialCode']));
          const supplierId = row['supplierCode'] ? await this.resolveOptional(client, 'suppliers', 'supplier_code', String(row['supplierCode'])) : null;
          const lotId = row['lotNumber'] ? await this.resolveLotOptional(client, String(row['lotNumber']), materialId, supplierId) : null;
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
    return this.withTransaction(async (client) => {
      const result = this.result(runs.length);
      for (const row of runs) {
        const formulationId = await this.resolveFormulation(client, String(row['formulationCode']), Number(row['formulationVersion']));
        const machineId = await this.resolve(client, 'machines', 'machine_code', String(row['machineCode']));
        const moldId = await this.resolve(client, 'molds', 'mold_code', String(row['moldCode']));
        const machineSetupProfileId = row['machineSetupProfileCode']
          ? await this.resolveOptional(client, 'machine_setup_profiles', 'profile_code', String(row['machineSetupProfileCode']))
          : null;
        const saved = await client.query<{ inserted: boolean }>(
          `INSERT INTO production_runs
            (run_code, formulation_id, date_produced, machine_id, mold_id, machine_setup_profile_id, injection_pressure, injection_pressure_unit,
             melt_temperature, melt_temperature_unit, cooling_time, cooling_time_unit, cycle_time, cycle_time_unit,
             cure_hours_before_test, job_name, part_number, operator_name, shift_code, status, approved_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,'psi'),$9,COALESCE($10,'C'),$11,COALESCE($12,'sec'),$13,COALESCE($14,'sec'),
             COALESCE($15,72),$16,$17,$18,$19,$20::production_run_status,$21)
           ON CONFLICT (run_code) DO UPDATE SET formulation_id=EXCLUDED.formulation_id, date_produced=EXCLUDED.date_produced,
             machine_id=EXCLUDED.machine_id, mold_id=EXCLUDED.mold_id, machine_setup_profile_id=EXCLUDED.machine_setup_profile_id,
             injection_pressure=EXCLUDED.injection_pressure, injection_pressure_unit=EXCLUDED.injection_pressure_unit,
             melt_temperature=EXCLUDED.melt_temperature, melt_temperature_unit=EXCLUDED.melt_temperature_unit,
             cooling_time=EXCLUDED.cooling_time, cooling_time_unit=EXCLUDED.cooling_time_unit, cycle_time=EXCLUDED.cycle_time,
             cycle_time_unit=EXCLUDED.cycle_time_unit, cure_hours_before_test=EXCLUDED.cure_hours_before_test, job_name=EXCLUDED.job_name,
             part_number=EXCLUDED.part_number, operator_name=EXCLUDED.operator_name, shift_code=EXCLUDED.shift_code,
             status=EXCLUDED.status, approved_by=EXCLUDED.approved_by, updated_at=now()
           RETURNING (xmax = 0) AS inserted`,
          [row['runCode'], formulationId, row['dateProduced'], machineId, moldId, machineSetupProfileId, value(row, 'injectionPressure'), value(row, 'injectionPressureUnit'),
            value(row, 'meltTemperature'), value(row, 'meltTemperatureUnit'), value(row, 'coolingTime'), value(row, 'coolingTimeUnit'),
            value(row, 'cycleTime'), value(row, 'cycleTimeUnit'), value(row, 'cureHoursBeforeTest'), value(row, 'jobName'), value(row, 'partNumber'),
            value(row, 'operatorName'), value(row, 'shiftCode'), row['status'] || 'planned', value(row, 'approvedBy')]
        );
        if (saved.rows[0]?.inserted) result.created += 1; else result.updated += 1;
      }
      return result;
    });
  }

  async importMachineSetupProfiles(data: TransferRows): Promise<TransferImportResult> {
    const rows = data['Machine Setup Profiles'] ?? [];
    return this.withTransaction(async (client) => {
      const result = this.result(rows.length);
      const grouped = new Map<string, Row[]>();
      for (const row of rows) {
        const key = `${row['machineCode']}|${row['profileCode']}`;
        grouped.set(key, [...(grouped.get(key) ?? []), row]);
      }

      for (const group of grouped.values()) {
        const header = group[0]!;
        const machineId = await this.resolve(client, 'machines', 'machine_code', String(header['machineCode']));
        const parameters = await Promise.all(group
          .filter((row) => ['parameterKey', 'positionLabel', 'unit', 'value'].some((key) => value(row, key) !== null))
          .map(async (row) => {
            const parameterKey = value(row, 'parameterKey');
            const metadata = parameterKey === null ? null : await this.machineSetupProfileParameterMetadata(
              client, machineId, String(parameterKey), value(row, 'positionLabel')
            );
            return {
              ...(parameterKey !== null ? { key: String(parameterKey) } : {}),
              ...(value(row, 'displayName') !== null ? { displayName: String(row['displayName']) } : metadata ? { displayName: metadata.displayName } : parameterKey !== null ? { displayName: String(parameterKey) } : {}),
              ...(value(row, 'category') !== null ? { category: String(row['category']) } : metadata ? { category: metadata.category } : {}),
              ...(value(row, 'scope') !== null ? { scope: String(row['scope']) } : { scope: 'machine' }),
              ...(value(row, 'positionLabel') !== null ? { positionLabel: String(row['positionLabel']) } : {}),
              ...(value(row, 'unit') !== null ? { unit: String(row['unit']) } : {}),
              ...(value(row, 'value') !== null ? { value: String(row['value']) } : {}),
            };
          }));
        const saved = await client.query<{ inserted: boolean }>(
          `INSERT INTO machine_setup_profiles (machine_id, profile_code, profile_name, parameters, status, notes)
           VALUES ($1,$2,$3,$4::jsonb,$5,$6)
           ON CONFLICT (profile_code) DO UPDATE SET machine_id=EXCLUDED.machine_id, profile_name=EXCLUDED.profile_name,
             parameters=EXCLUDED.parameters, status=EXCLUDED.status, notes=EXCLUDED.notes, updated_at=now()
           RETURNING (xmax = 0) AS inserted`,
          [machineId, header['profileCode'], header['profileName'], JSON.stringify(parameters), this.normalizeMachineSetupProfileStatus(header['status']), value(header, 'notes')]
        );
        if (saved.rows[0]?.inserted) result.created += group.length; else result.updated += group.length;
      }
      return result;
    });
  }

  async importScoringProfiles(data: TransferRows): Promise<TransferImportResult> {
    const rows = data['Scoring Profiles'] ?? [];
    return this.withTransaction(async (client) => {
      const result = this.result(rows.length);
      const grouped = new Map<string, Row[]>();
      for (const row of rows) {
        const key = String(row['scoringProfileId']);
        grouped.set(key, [...(grouped.get(key) ?? []), row]);
      }

      for (const group of grouped.values()) {
        const header = group[0]!;
        const saved = await client.query<{ id: string; inserted: boolean }>(
          `INSERT INTO scoring_profiles (scoring_code, profile_name, status)
           VALUES ($1,$2,$3::record_status)
           ON CONFLICT (scoring_code) DO UPDATE SET profile_name=EXCLUDED.profile_name, status=EXCLUDED.status, updated_at=now()
           RETURNING id, (xmax = 0) AS inserted`,
          [header['scoringProfileId'], header['scoringProfileName'], header['status'] || 'active']
        );
        const scoringProfileId = saved.rows[0]?.id ?? await this.resolve(client, 'scoring_profiles', 'scoring_code', String(header['scoringProfileId']));
        for (const row of group) {
          const metric = await this.resolveMetric(client, String(row['metricKey']));
          await client.query(
            `INSERT INTO scoring_profile_weights (scoring_profile_id, metric_id, weight)
             VALUES ($1,$2,$3)
             ON CONFLICT (scoring_profile_id, metric_id) DO UPDATE SET weight=EXCLUDED.weight, updated_at=now()`,
            [scoringProfileId, metric.id, row['weight']]
          );
        }
        if (saved.rows[0]?.inserted) result.created += group.length; else result.updated += group.length;
      }
      return result;
    });
  }

  async importTesting(data: TransferRows): Promise<TransferImportResult> {
    const rows = data['Ball Tests'] ?? [];
    return this.withTransaction(async (client) => {
      const result = this.result(rows.length);
      for (const row of rows) {
        const run = await this.resolveRun(client, String(row['productionRunCode']));
        const metric = await this.resolveMetric(client, String(row['ballTestType']));
        const measurements = [1, 2, 3, 4, 5, 6].map((index) => value(row, `sample${index}`));
        const highestSample = measurements.reduce<number>((highest, current, index) => current == null ? highest : index + 1, 0);
        if (highestSample === 0) {
          result.skipped += 1;
          continue;
        }

        const samples = await this.ensureSamples(client, run.id, run.runCode, highestSample);
        let created = false;
        let updated = false;

        for (let index = 0; index < highestSample; index += 1) {
          const measurement = measurements[index];
          if (measurement == null) continue;
          const sample = samples[index];
          if (!sample) throw new ValidationError(`Missing sample ${index + 1} for production run ${run.runCode}`);
          const existing = await client.query<{ id: string }>(
            'SELECT id FROM sample_test_results WHERE sample_id=$1 AND metric_id=$2 AND test_method_id IS NULL LIMIT 1',
            [sample.id, metric.id]
          );
          if (existing.rows[0]?.id) {
            await client.query(
              `UPDATE sample_test_results
               SET value_numeric = $2, unit = $3, tested_at = now(), updated_at = now()
               WHERE id = $1`,
              [existing.rows[0].id, measurement, metric.defaultUnit]
            );
            updated = true;
          } else {
            await client.query(
              `INSERT INTO sample_test_results (sample_id, metric_id, test_method_id, value_numeric, unit, tested_at)
               VALUES ($1,$2,NULL,$3,$4,now())`,
              [sample.id, metric.id, measurement, metric.defaultUnit]
            );
            created = true;
          }
        }

        if (created && !updated) result.created += 1; else result.updated += 1;
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

  private async exportMachines(): Promise<TransferRows> {
    return {
      Machines: await this.rows(`SELECT machine_code AS "machineCode", machine_name AS "machineName", manufacturer, machine_type AS "machineType",
        model_number AS "modelNumber", serial_number AS "serialNumber", location, status::text AS status
        FROM machines ORDER BY machine_code`),
      'Machine Parameters': await this.rows(`SELECT m.machine_code AS "machineCode", mpc.parameter_key AS "parameterKey", mpc.display_name AS "displayName",
        mpc.section_key AS "sectionKey", mpc.position_type AS "positionType", mpc.position_index AS "positionIndex",
        mpc.position_label AS "positionLabel", mpc.minimum_value::float AS "minimumValue", mpc.maximum_value::float AS "maximumValue",
        mpc.unit, mpc.sort_order AS "sortOrder", mpc.notes, mpc.status::text AS status
        FROM machine_parameter_capabilities mpc JOIN machines m ON m.id = mpc.machine_id ORDER BY m.machine_code, mpc.sort_order, mpc.position_index NULLS FIRST, mpc.position_label`),
    };
  }

  private async exportMolds(): Promise<TransferRows> {
    return {
      Molds: await this.rows(`SELECT mold_code AS "moldCode", mold_name AS "moldName", mold_type AS "moldType", manufacturer,
        cavity_count AS "cavityCount", hot_runner_controller AS "hotRunnerController", zone_count AS "zoneCount",
        description, status::text AS status FROM molds ORDER BY mold_code`),
      'Mold Zones': await this.rows(`SELECT mo.mold_code AS "moldCode", mz.zone_number AS "zoneNumber", mz.zone_name AS "zoneName", mz.zone_type AS "zoneType",
        mz.minimum_temperature::float AS "minimumTemperature", mz.maximum_temperature::float AS "maximumTemperature",
        mz.temperature_unit AS "temperatureUnit", mz.notes, mz.status::text AS status
        FROM mold_zones mz JOIN molds mo ON mo.id = mz.mold_id ORDER BY mo.mold_code, mz.zone_number`),
    };
  }

  private async exportBenchmarks(): Promise<TransferRows> {
    return {
      Benchmarks: await this.rows(`SELECT benchmark_code AS "benchmarkCode", benchmark_name AS "benchmarkName", profile_version AS "profileVersion",
        ball_brand AS "ballBrand", ball_model AS "ballModel", test_date AS "testDate", report_number AS "reportNumber", status::text AS status, notes
        FROM benchmark_profiles ORDER BY benchmark_code, profile_version`),
      'Benchmark Properties': await this.rows(`SELECT bp.benchmark_code AS "benchmarkCode", bp.profile_version AS "profileVersion",
        COALESCE(md.metric_key, bmt.metric_name) AS "metricKey", bmt.target_mean::float AS "value"
        FROM benchmark_metric_targets bmt
        JOIN benchmark_profiles bp ON bp.id = bmt.benchmark_profile_id
        LEFT JOIN metric_definitions md ON md.id = bmt.metric_id
        ORDER BY bp.benchmark_code, bp.profile_version, COALESCE(md.metric_key, bmt.metric_name)`),
    };
  }

  private async exportFormulations(): Promise<TransferRows> {
    return {
      Formulations: await this.rows(`SELECT "formulationCode", "formulationName", "versionNo", status, "approvedBy", notes,
        "materialCode", "supplierCode", "lotNumber", "percentComposition", basis, "sortOrder"
        FROM (
          SELECT f.formulation_code AS "formulationCode", f.formulation_name AS "formulationName", f.version_no AS "versionNo",
                 f.status::text AS status, f.approved_by AS "approvedBy", f.notes,
                 NULL::text AS "materialCode", NULL::text AS "supplierCode", NULL::text AS "lotNumber",
                 NULL::float AS "percentComposition", NULL::text AS basis, NULL::int AS "sortOrder",
                 0 AS row_sort, 0 AS component_sort
          FROM formulations f
          WHERE NOT EXISTS (
            SELECT 1 FROM formulation_components fc WHERE fc.formulation_id = f.id
          )
          UNION ALL
          SELECT f.formulation_code AS "formulationCode", f.formulation_name AS "formulationName", f.version_no AS "versionNo",
                 f.status::text AS status, f.approved_by AS "approvedBy", f.notes,
                 m.material_code AS "materialCode", s.supplier_code AS "supplierCode", ml.lot_number AS "lotNumber",
                 fc.percent_composition::float AS "percentComposition", fc.basis::text AS basis, fc.sort_order AS "sortOrder",
                 1 AS row_sort, COALESCE(fc.sort_order, 0) AS component_sort
          FROM formulation_components fc
          JOIN formulations f ON f.id = fc.formulation_id
          JOIN materials m ON m.id = fc.material_id
          LEFT JOIN suppliers s ON s.id = fc.supplier_id
          LEFT JOIN material_lots ml ON ml.id = fc.material_lot_id
        ) formulation_rows
        ORDER BY "formulationCode", "versionNo", row_sort, component_sort`),
    };
  }

  private async exportProductionRuns(): Promise<TransferRows> {
    return {
      'Production Runs': await this.rows(`SELECT pr.run_code AS "runCode", f.formulation_code AS "formulationCode", f.version_no AS "formulationVersion",
        pr.date_produced AS "dateProduced", m.machine_code AS "machineCode", mo.mold_code AS "moldCode",
        msp.profile_code AS "machineSetupProfileCode",
        pr.injection_pressure::float AS "injectionPressure", pr.injection_pressure_unit AS "injectionPressureUnit",
        pr.melt_temperature::float AS "meltTemperature", pr.melt_temperature_unit AS "meltTemperatureUnit",
        pr.cooling_time::float AS "coolingTime", pr.cooling_time_unit AS "coolingTimeUnit",
        pr.cycle_time::float AS "cycleTime", pr.cycle_time_unit AS "cycleTimeUnit",
        pr.cure_hours_before_test::float AS "cureHoursBeforeTest", pr.job_name AS "jobName", pr.part_number AS "partNumber",
        pr.operator_name AS "operatorName", pr.shift_code AS "shiftCode", pr.status::text AS status, pr.approved_by AS "approvedBy"
        FROM production_runs pr
        JOIN formulations f ON f.id = pr.formulation_id
        JOIN machines m ON m.id = pr.machine_id
        JOIN molds mo ON mo.id = pr.mold_id
        LEFT JOIN machine_setup_profiles msp ON msp.id = pr.machine_setup_profile_id
        ORDER BY pr.date_produced DESC, pr.run_code`),
    };
  }

  private async exportMachineSetupProfiles(): Promise<TransferRows> {
    return {
      'Machine Setup Profiles': await this.rows(`SELECT m.machine_code AS "machineCode", msp.profile_code AS "profileCode", msp.profile_name AS "profileName",
        param.item->>'key' AS "parameterKey", param.item->>'displayName' AS "displayName", param.item->>'category' AS "category", param.item->>'scope' AS "scope",
        param.item->>'positionLabel' AS "positionLabel", param.item->>'unit' AS "unit", param.item->>'value' AS "value",
        msp.status AS status, msp.notes
        FROM machine_setup_profiles msp
        JOIN machines m ON m.id = msp.machine_id
        LEFT JOIN LATERAL jsonb_array_elements(
          CASE
            WHEN jsonb_typeof(msp.parameters) = 'array' AND jsonb_array_length(msp.parameters) > 0 THEN msp.parameters
            ELSE jsonb_build_array('{}'::jsonb)
          END
        ) AS param(item) ON TRUE
        ORDER BY m.machine_code, msp.profile_code, COALESCE(param.item->>'positionLabel', ''), COALESCE(param.item->>'key', '')`),
    };
  }

  private async exportScoringProfiles(): Promise<TransferRows> {
    return {
      'Scoring Profiles': await this.rows(`SELECT sp.scoring_code AS "scoringProfileId", sp.profile_name AS "scoringProfileName",
        md.metric_key AS "metricKey", spw.weight::float AS weight, sp.status::text AS status
        FROM scoring_profiles sp
        JOIN scoring_profile_weights spw ON spw.scoring_profile_id = sp.id
        JOIN metric_definitions md ON md.id = spw.metric_id
        ORDER BY sp.profile_name, md.metric_key`),
    };
  }

  private async exportTesting(): Promise<TransferRows> {
    return {
      'Ball Tests': await this.rows(`WITH ordered AS (
          SELECT pr.run_code AS "productionRunCode", md.metric_key AS "ballTestType", r.value_numeric::float AS value,
                 ROW_NUMBER() OVER (PARTITION BY pr.id, md.metric_key ORDER BY s.sample_code) AS sample_no
          FROM sample_test_results r
          JOIN samples s ON s.id = r.sample_id
          JOIN production_runs pr ON pr.id = s.production_run_id
          JOIN metric_definitions md ON md.id = r.metric_id
        )
        SELECT "productionRunCode", "ballTestType",
               MAX(CASE WHEN sample_no = 1 THEN value END) AS "sample1",
               MAX(CASE WHEN sample_no = 2 THEN value END) AS "sample2",
               MAX(CASE WHEN sample_no = 3 THEN value END) AS "sample3",
               MAX(CASE WHEN sample_no = 4 THEN value END) AS "sample4",
               MAX(CASE WHEN sample_no = 5 THEN value END) AS "sample5",
               MAX(CASE WHEN sample_no = 6 THEN value END) AS "sample6"
        FROM ordered
        GROUP BY "productionRunCode", "ballTestType"
        ORDER BY "productionRunCode", "ballTestType"`),
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

  private async resolveOptional(client: PoolClient, table: string, column: string, code: string): Promise<string | null> {
    const result = await client.query<{ id: string }>(`SELECT id FROM ${table} WHERE ${column} = $1 LIMIT 1`, [code]);
    return result.rows[0]?.id ?? null;
  }

  private async resolveBenchmark(client: PoolClient, code: string, version: number): Promise<string> {
    const result = await client.query<{ id: string }>('SELECT id FROM benchmark_profiles WHERE benchmark_code=$1 AND profile_version=$2 LIMIT 1', [code, version]);
    if (!result.rows[0]?.id) throw new ValidationError(`Unknown benchmark: ${code} V${version}`);
    return result.rows[0].id;
  }

  private async resolveFormulation(client: PoolClient, code: string, version: number): Promise<string> {
    const result = await client.query<{ id: string }>('SELECT id FROM formulations WHERE formulation_code=$1 AND version_no=$2 LIMIT 1', [code, version]);
    if (!result.rows[0]?.id) throw new ValidationError(`Unknown formulation: ${code} V${version}`);
    return result.rows[0].id;
  }

  private async resolveLotOptional(client: PoolClient, lotNumber: string, materialId: string, supplierId: string | null): Promise<string | null> {
    if (supplierId) {
      const result = await client.query<{ id: string }>(`SELECT ml.id FROM material_lots ml JOIN supplier_materials sm ON sm.id=ml.supplier_material_id
        WHERE ml.lot_number=$1 AND sm.material_id=$2 AND sm.supplier_id=$3 LIMIT 1`, [lotNumber, materialId, supplierId]);
      if (!result.rows[0]?.id) throw new ValidationError(`Unknown material lot: ${lotNumber}`);
      return result.rows[0].id;
    }
    const result = await client.query<{ id: string }>(`SELECT ml.id FROM material_lots ml JOIN supplier_materials sm ON sm.id=ml.supplier_material_id
      WHERE ml.lot_number=$1 AND sm.material_id=$2 ORDER BY ml.created_at DESC`, [lotNumber, materialId]);
    if (result.rowCount === 1) return result.rows[0]?.id ?? null;
    if ((result.rowCount ?? 0) > 1) throw new ValidationError(`Material lot ${lotNumber} is ambiguous without Supplier Code`);
    throw new ValidationError(`Unknown material lot: ${lotNumber}`);
  }

  private async resolveMetric(client: PoolClient, metricKey: string): Promise<MetricRow> {
    const result = await client.query<MetricRow>(
      `SELECT id, metric_key AS "metricKey", category::text AS category, default_unit AS "defaultUnit"
       FROM metric_definitions WHERE metric_key = $1 LIMIT 1`,
      [metricKey]
    );
    if (!result.rows[0]) throw new ValidationError(`Unknown metric key: ${metricKey}`);
    return result.rows[0];
  }

  private async resolveRun(client: PoolClient, runCode: string): Promise<RunRow> {
    const result = await client.query<RunRow>(
      `SELECT id, run_code AS "runCode" FROM production_runs WHERE run_code = $1 LIMIT 1`,
      [runCode]
    );
    if (!result.rows[0]) throw new ValidationError(`Unknown production run code: ${runCode}`);
    return result.rows[0];
  }

  private async ensureSamples(client: PoolClient, runId: string, runCode: string, count: number): Promise<SampleRow[]> {
    const existing = await client.query<SampleRow>(
      `SELECT id, sample_code AS "sampleCode" FROM samples WHERE production_run_id = $1 ORDER BY sample_code`,
      [runId]
    );
    const samples = [...existing.rows];
    for (let index = samples.length; index < count; index += 1) {
      const inserted = await client.query<SampleRow>(
        `INSERT INTO samples (production_run_id, sample_code, cavity_number, status)
         VALUES ($1,$2,$3,'created')
         RETURNING id, sample_code AS "sampleCode"`,
        [runId, formatCode(`${runCode}-${String(index + 1).padStart(3, '0')}`, 'T'), index + 1]
      );
      if (inserted.rows[0]) samples.push(inserted.rows[0]);
    }
    return samples.sort((left, right) => left.sampleCode.localeCompare(right.sampleCode));
  }

  private async machineSetupProfileParameterMetadata(
    client: PoolClient,
    machineId: string,
    parameterKey: string,
    positionLabel: unknown
  ): Promise<MachineSetupProfileParameterMetadata | null> {
    const result = await client.query<MachineSetupProfileParameterMetadata>(
      `SELECT display_name AS "displayName", section_key AS category
       FROM machine_parameter_capabilities
       WHERE machine_id = $1 AND parameter_key = $2
       ORDER BY CASE WHEN COALESCE(position_label, '') = COALESCE($3, '') THEN 0 ELSE 1 END, sort_order
       LIMIT 1`,
      [machineId, parameterKey, value({ positionLabel }, 'positionLabel')]
    );
    return result.rows[0] ?? null;
  }

  private normalizeMachineSetupProfileStatus(status: unknown): 'active' | 'inactive' {
    return String(status ?? 'active').toLowerCase() === 'active' ? 'active' : 'inactive';
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
