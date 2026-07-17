import { createHash } from 'crypto';
import type { PoolClient } from 'pg';
import { getPool } from '../../infrastructure/database/pg-pool';
import type { ParsedSetupWorkbook, ProcessSetupRecord, SetupImportCommitInput } from './processSetup.types';

interface ImportRow extends ProcessSetupRecord {
  status: string;
  fileSha256: string;
  parsedSnapshot: ParsedSetupWorkbook;
  validationResults: { errors: string[]; warnings: string[] };
  productionRunId?: string | null;
}

export class ProcessSetupRepository {
  async findImportByHash(hash: string): Promise<ImportRow | null> {
    const result = await getPool().query(this.importSelect('WHERE file_sha256 = $1'), [hash]);
    return (result.rows[0] as ImportRow | undefined) ?? null;
  }

  async findImport(id: string): Promise<ImportRow | null> {
    const result = await getPool().query(this.importSelect('WHERE id = $1'), [id]);
    return (result.rows[0] as ImportRow | undefined) ?? null;
  }

  async createImport(input: {
    id: string;
    filename: string;
    size: number;
    sha256: string;
    blobObjectKey: string;
    snapshot: ParsedSetupWorkbook;
    validation: { errors: string[]; warnings: string[] };
    actor: string;
  }): Promise<ImportRow> {
    const status = input.validation.errors.length > 0 ? 'validation_failed' : 'ready';
    await getPool().query(
      `INSERT INTO setup_sheet_imports
        (id, status, original_filename, file_size_bytes, file_sha256, blob_object_key,
         template_key, template_version, parsed_snapshot, validation_results, imported_by_actor, parsed_at)
       VALUES ($1, $2::setup_sheet_import_status, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, now())`,
      [input.id, status, input.filename, input.size, input.sha256, input.blobObjectKey, input.snapshot.templateKey, input.snapshot.templateVersion, JSON.stringify(input.snapshot), JSON.stringify(input.validation), input.actor]
    );
    return (await this.findImport(input.id)) as ImportRow;
  }

  async markImportFailed(id: string, message: string): Promise<void> {
    await getPool().query(
      `UPDATE setup_sheet_imports SET status = 'failed', failure_message = $2, updated_at = now() WHERE id = $1 AND production_run_id IS NULL`,
      [id, message.slice(0, 4000)]
    );
  }

  async matchLibrary(snapshot: ParsedSetupWorkbook): Promise<Record<string, ProcessSetupRecord[]>> {
    const [machines, molds, materials, lots, formulations, components] = await Promise.all([
      this.options(`SELECT id, machine_code AS code, machine_name AS label, (lower(machine_code) = lower($1) OR lower(machine_name) = lower($1)) AS matched FROM machines WHERE status = 'active' ORDER BY matched DESC, machine_code`, snapshot.header.machineCode),
      this.options(`SELECT id, mold_code AS code, mold_name AS label, (lower(mold_code) = lower($1) OR lower(COALESCE(mold_name, '')) = lower($1)) AS matched FROM molds WHERE status = 'active' ORDER BY matched DESC, mold_code`, snapshot.header.moldCode),
      this.options(`SELECT id, material_code AS code, material_name AS label, (lower(material_code) = lower($1) OR lower(material_name) = lower($1)) AS matched FROM materials WHERE status = 'active' ORDER BY matched DESC, material_code`, snapshot.header.materialName),
      this.options(`SELECT ml.id, ml.lot_number AS code, m.material_name AS label, sm.material_id AS "materialId", (lower(ml.lot_number) = lower($1)) AS matched FROM material_lots ml JOIN supplier_materials sm ON sm.id = ml.supplier_material_id JOIN materials m ON m.id = sm.material_id WHERE ml.status = 'active' ORDER BY matched DESC, ml.lot_number`, snapshot.header.materialLotNumber),
      this.options(`SELECT f.id, f.formulation_code AS code, CONCAT(f.formulation_code, ' V', f.version_no) AS label, (lower(f.formulation_code) = lower($1) OR lower(CONCAT(f.formulation_code, ' V', f.version_no)) = lower($1)) AS matched FROM formulations f WHERE f.status = 'approved' ORDER BY matched DESC, f.formulation_code, f.version_no DESC`, snapshot.header.partNumber || snapshot.header.jobName),
      getPool().query(`SELECT fc.id, fc.formulation_id AS "formulationId", fc.material_id AS "materialId", m.material_code AS code, m.material_name AS label FROM formulation_components fc JOIN materials m ON m.id = fc.material_id JOIN formulations f ON f.id = fc.formulation_id WHERE f.status = 'approved' ORDER BY f.formulation_code, fc.sort_order`).then((result) => result.rows as ProcessSetupRecord[]),
    ]);
    return { machines, molds, materials, lots, formulations, formulationComponents: components };
  }

  async listSetups(): Promise<ProcessSetupRecord[]> {
    const result = await getPool().query(
      `SELECT psr.id, psr.revision_no AS "revisionNo", psr.status::text AS status,
              psr.approved_by_display AS "approvedBy", psr.approved_at AS "approvedAt",
              ma.machine_code AS machine, mo.mold_code AS mold,
              CONCAT(f.formulation_code, ' V', f.version_no) AS formulation,
              COUNT(psrp.id)::int AS "parameterCount", psr.created_at AS "createdAt"
       FROM process_setup_revisions psr
       JOIN machines ma ON ma.id = psr.machine_id
       JOIN molds mo ON mo.id = psr.mold_id
       JOIN formulations f ON f.id = psr.formulation_id
       LEFT JOIN process_setup_revision_parameters psrp ON psrp.process_setup_revision_id = psr.id
       GROUP BY psr.id, ma.machine_code, mo.mold_code, f.formulation_code, f.version_no
       ORDER BY psr.created_at DESC`
    );
    return result.rows as ProcessSetupRecord[];
  }

  async setupDetail(id: string): Promise<ProcessSetupRecord | null> {
    const setup = await getPool().query(
      `SELECT psr.*, ma.machine_code AS machine, mo.mold_code AS mold,
              CONCAT(f.formulation_code, ' V', f.version_no) AS formulation
       FROM process_setup_revisions psr
       JOIN machines ma ON ma.id = psr.machine_id JOIN molds mo ON mo.id = psr.mold_id
       JOIN formulations f ON f.id = psr.formulation_id WHERE psr.id = $1`, [id]
    );
    if (!setup.rows[0]) return null;
    const [parameters, revisions] = await Promise.all([
      getPool().query(this.parameterSelect('WHERE p.process_setup_revision_id = $1'), [id]),
      getPool().query(`SELECT revision_no AS "revisionNo", revision_date AS "revisionDate", changed_by AS "changedBy", approved_by AS "approvedBy", change_description AS description, machine_status AS "machineStatus" FROM process_setup_revision_log_entries WHERE process_setup_revision_id = $1 ORDER BY sort_order`, [id]),
    ]);
    return { ...(setup.rows[0] as ProcessSetupRecord), parameters: parameters.rows, revisionHistory: revisions.rows };
  }

  async runProcessSetup(runId: string): Promise<ProcessSetupRecord | null> {
    const run = await getPool().query(
      `SELECT pr.id, pr.run_code AS "runCode", pr.status::text AS status,
              pr.process_setup_revision_id AS "processSetupRevisionId", si.id AS "sourceImportId",
              si.original_filename AS "sourceFilename", si.file_sha256 AS "sourceSha256",
              psr.revision_no AS "revisionNo", psr.approved_by_display AS "approvedBy",
              psr.approved_at AS "approvedAt"
       FROM production_runs pr
       LEFT JOIN process_setup_revisions psr ON psr.id = pr.process_setup_revision_id
       LEFT JOIN setup_sheet_imports si ON si.production_run_id = pr.id
       WHERE pr.id = $1`, [runId]
    );
    if (!run.rows[0]) return null;
    const [values, notes, materialProfiles, dryingEvents, revisionHistory] = await Promise.all([
      getPool().query(
        `SELECT v.id, d.parameter_key AS "parameterKey", d.section_key AS section,
                d.display_name AS "displayName", d.data_type::text AS "dataType",
                v.position_type AS "positionType", v.position_index AS "positionIndex",
                v.position_label AS "positionLabel", v.setpoint_numeric::float AS "setpointNumeric",
                v.setpoint_text AS "setpointText", v.setpoint_date AS "setpointDate",
                v.actual_numeric::float AS "actualNumeric", v.actual_text AS "actualText",
                v.actual_date AS "actualDate", v.unit, v.tolerance_min::float AS "toleranceMin",
                v.tolerance_max::float AS "toleranceMax", v.notes
         FROM production_run_process_values v JOIN process_parameter_definitions d ON d.id = v.parameter_definition_id
         WHERE v.production_run_id = $1 ORDER BY d.sort_order, v.position_index NULLS FIRST, v.position_label`, [runId]
      ),
      getPool().query(`SELECT note_type AS "noteType", note_text AS "noteText", entered_by AS "enteredBy", created_at AS "createdAt" FROM production_run_notes WHERE production_run_id = $1 ORDER BY created_at`, [runId]),
      getPool().query(`SELECT mp.*, mr.parameter_key AS "parameterKey", mr.display_name AS "rangeDisplayName", mr.min_value::float AS "minValue", mr.max_value::float AS "maxValue", mr.recommended_value::float AS "recommendedValue", mr.unit AS "rangeUnit", mr.notes AS "rangeNotes" FROM setup_sheet_imports si JOIN material_processing_profiles mp ON mp.id = si.material_processing_profile_id LEFT JOIN material_processing_ranges mr ON mr.material_processing_profile_id = mp.id WHERE si.production_run_id = $1 ORDER BY mr.sort_order`, [runId]),
      getPool().query(`SELECT dryer_code AS "dryerCode", setpoint_temperature::float AS "setpointTemperature", actual_temperature::float AS "actualTemperature", temperature_unit AS "temperatureUnit", started_at AS "startedAt", ended_at AS "endedAt", duration_hours::float AS "durationHours", approved_by_display AS "approvedBy" FROM material_drying_events WHERE production_run_id = $1 ORDER BY started_at`, [runId]),
      getPool().query(`SELECT l.revision_no AS "revisionNo", l.revision_date AS "revisionDate", l.changed_by AS "changedBy", l.approved_by AS "approvedBy", l.change_description AS description, l.machine_status AS "machineStatus" FROM production_runs pr JOIN process_setup_revision_log_entries l ON l.process_setup_revision_id = pr.process_setup_revision_id WHERE pr.id = $1 ORDER BY l.sort_order`, [runId]),
    ]);
    return { ...(run.rows[0] as ProcessSetupRecord), values: values.rows, notes: notes.rows, materialProfile: materialProfiles.rows, dryingEvents: dryingEvents.rows, revisionHistory: revisionHistory.rows };
  }

  async commitImport(id: string, input: SetupImportCommitInput, actor: string): Promise<string> {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const importResult = await client.query(this.importSelect('WHERE id = $1 FOR UPDATE'), [id]);
      const importRow = importResult.rows[0] as ImportRow | undefined;
      if (!importRow) throw new Error('IMPORT_NOT_FOUND');
      if (importRow.productionRunId) { await client.query('COMMIT'); return importRow.productionRunId; }
      if ((importRow.validationResults?.errors ?? []).length > 0) throw new Error('VALIDATION_FAILED');
      const snapshot = importRow.parsedSnapshot;
      await this.validateResolution(client, input);
      const setupHash = this.hash({
        header: { machine: input.machineId, mold: input.moldId, formulation: input.formulationId, revision: snapshot.header.revisionNo },
        parameters: snapshot.parameters.filter((parameter) => parameter.setpoint != null || parameter.notes).map(({ actual: _actual, ...parameter }) => parameter),
      });
      const revisionId = await this.resolveRevision(client, importRow.id, snapshot, input, setupHash, actor);
      const materialProfileId = await this.resolveMaterialProfile(client, importRow.id, snapshot, input.materialId ?? null, actor);
      const runId = await this.createRun(client, revisionId, snapshot, input);
      await this.insertRunData(client, runId, revisionId, importRow.id, snapshot, input, actor);
      await client.query(`UPDATE setup_sheet_imports SET status = 'committed', production_run_id = $2, process_setup_revision_id = $3, material_processing_profile_id = $4, committed_at = now(), updated_at = now() WHERE id = $1`, [id, runId, revisionId, materialProfileId]);
      await client.query(`INSERT INTO audit_log (table_name, record_id, action, changed_by, new_values) VALUES ('production_runs', $1, 'INSERT', $2, $3::jsonb)`, [runId, actor, JSON.stringify({ sourceImportId: id, processSetupRevisionId: revisionId })]);
      await client.query(`INSERT INTO audit_log (table_name, record_id, action, changed_by, new_values) VALUES ('process_setup_revisions', $1, 'IMPORT', $2, $3::jsonb)`, [revisionId, actor, JSON.stringify({ sourceImportId: id, productionRunId: runId })]);
      await client.query(`INSERT INTO audit_log (table_name, record_id, action, changed_by, new_values) VALUES ('setup_sheet_imports', $1, 'COMMIT', $2, $3::jsonb)`, [id, actor, JSON.stringify({ productionRunId: runId, processSetupRevisionId: revisionId })]);
      await client.query('COMMIT');
      return runId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  async updateRunValues(runId: string, values: Array<Record<string, unknown>>): Promise<void> {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      for (const value of values) {
        const result = await client.query(
          `UPDATE production_run_process_values SET
             actual_numeric = $3, actual_text = $4, actual_date = $5::date,
             notes = COALESCE($6, notes), updated_at = now()
           WHERE id = $2 AND production_run_id = $1`,
          [runId, value['id'], value['actualNumeric'] ?? null, value['actualText'] ?? null, value['actualDate'] ?? null, value['notes'] ?? null]
        );
        if (result.rowCount !== 1) throw new Error('PROCESS_VALUE_NOT_FOUND');
      }
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }

  async runState(runId: string): Promise<{ status: string } | null> {
    const result = await getPool().query<{ status: string }>(`SELECT status::text AS status FROM production_runs WHERE id = $1`, [runId]);
    return result.rows[0] ?? null;
  }

  private async validateResolution(client: PoolClient, input: SetupImportCommitInput): Promise<void> {
    const result = await client.query(
      `SELECT
         EXISTS(SELECT 1 FROM formulations WHERE id = $1 AND status = 'approved') AS formulation,
         EXISTS(SELECT 1 FROM machines WHERE id = $2 AND status = 'active') AS machine,
         EXISTS(SELECT 1 FROM molds WHERE id = $3 AND status = 'active') AS mold`,
      [input.formulationId, input.machineId, input.moldId]
    );
    const row = result.rows[0];
    if (!row?.formulation || !row.machine || !row.mold) throw new Error('INVALID_RESOLUTION');
    if (input.materialId) {
      const material = await client.query(`SELECT 1 FROM materials WHERE id = $1 AND status = 'active'`, [input.materialId]);
      if (!material.rows[0]) throw new Error('INVALID_RESOLUTION');
    }
    let componentMaterialId: string | null = null;
    if (input.primaryFormulationComponentId) {
      const component = await client.query(`SELECT material_id FROM formulation_components WHERE id = $1 AND formulation_id = $2`, [input.primaryFormulationComponentId, input.formulationId]);
      if (!component.rows[0]) throw new Error('INVALID_COMPONENT');
      componentMaterialId = String(component.rows[0].material_id);
      if (input.materialId && component.rows[0].material_id !== input.materialId) throw new Error('MATERIAL_COMPONENT_MISMATCH');
    }
    if (input.materialLotId) {
      if (!input.primaryFormulationComponentId) throw new Error('INVALID_COMPONENT');
      const lot = await client.query(
        `SELECT sm.material_id FROM material_lots ml JOIN supplier_materials sm ON sm.id = ml.supplier_material_id WHERE ml.id = $1 AND ml.status = 'active'`,
        [input.materialLotId]
      );
      const expectedMaterialId = input.materialId ?? componentMaterialId;
      if (!lot.rows[0] || (expectedMaterialId && lot.rows[0].material_id !== expectedMaterialId)) throw new Error('MATERIAL_COMPONENT_MISMATCH');
    }
  }

  private async resolveRevision(client: PoolClient, importId: string, snapshot: ParsedSetupWorkbook, input: SetupImportCommitInput, setupHash: string, actor: string): Promise<string> {
    const existing = await client.query(`SELECT id, setup_hash FROM process_setup_revisions WHERE machine_id = $1 AND mold_id = $2 AND formulation_id = $3 AND revision_no = $4 FOR UPDATE`, [input.machineId, input.moldId, input.formulationId, snapshot.header.revisionNo]);
    if (existing.rows[0]) {
      if (existing.rows[0].setup_hash !== setupHash) throw new Error('REVISION_CONTENT_CONFLICT');
      return String(existing.rows[0].id);
    }
    await client.query(`UPDATE process_setup_revisions SET status = 'superseded', updated_at = now() WHERE machine_id = $1 AND mold_id = $2 AND formulation_id = $3 AND status = 'approved'`, [input.machineId, input.moldId, input.formulationId]);
    const matchingLog = snapshot.revisions.find((entry) => entry.revisionNo.toLowerCase() === snapshot.header.revisionNo?.toLowerCase());
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO process_setup_revisions
        (machine_id, mold_id, formulation_id, revision_no, status, setup_hash,
         hot_runner_manufacturer, hot_runner_controller_model, hot_runner_zone_count,
         approved_by_display, approved_by_actor, document_approval_date, approved_at, source_import_id)
       VALUES ($1, $2, $3, $4, 'approved', $5, $6, $7, $8, $9, $10, $11::date, now(), $12) RETURNING id`,
      [input.machineId, input.moldId, input.formulationId, snapshot.header.revisionNo, setupHash, snapshot.hotRunner.manufacturer, snapshot.hotRunner.controllerModel, snapshot.hotRunner.zoneCount, snapshot.header.approvedBy, actor, matchingLog?.revisionDate ?? snapshot.header.productionDate, importId]
    );
    const revisionId = inserted.rows[0]?.id ?? '';
    const definitions = await this.definitionMap(client);
    for (const parameter of snapshot.parameters.filter((item) => item.setpoint != null || item.notes)) {
      const definitionId = definitions.get(parameter.key);
      if (!definitionId) continue;
      await client.query(
        `INSERT INTO process_setup_revision_parameters
          (process_setup_revision_id, parameter_definition_id, position_type, position_index, position_label,
           value_numeric, value_text, value_date, unit, tolerance_min, tolerance_max, notes, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date, $9, $10, $11, $12, $13)`,
        [revisionId, definitionId, parameter.positionType, parameter.positionIndex ?? null, parameter.positionLabel ?? null, typeof parameter.setpoint === 'number' ? parameter.setpoint : null, typeof parameter.setpoint === 'string' && !parameter.valueDate ? parameter.setpoint : null, parameter.valueDate && parameter.setpoint ? parameter.valueDate : null, parameter.unit ?? null, parameter.toleranceMin ?? null, parameter.toleranceMax ?? null, parameter.notes ?? null, parameter.sortOrder]
      );
    }
    for (const entry of snapshot.revisions) await client.query(`INSERT INTO process_setup_revision_log_entries (process_setup_revision_id, revision_no, revision_date, changed_by, approved_by, change_description, machine_status, sort_order) VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8)`, [revisionId, entry.revisionNo, entry.revisionDate ?? null, entry.changedBy ?? null, entry.approvedBy ?? null, entry.description ?? null, entry.machineStatus ?? null, entry.sortOrder]);
    return revisionId;
  }

  private async resolveMaterialProfile(client: PoolClient, importId: string, snapshot: ParsedSetupWorkbook, materialId: string | null, actor: string): Promise<string | null> {
    if (!materialId || !this.hasMaterialProfileData(snapshot)) return null;
    const profile = snapshot.materialProfile;
    const profileHash = this.hash(profile);
    const current = await client.query(`SELECT id, profile_hash, profile_version FROM material_processing_profiles WHERE material_id = $1 AND status = 'approved' FOR UPDATE`, [materialId]);
    if (current.rows[0]?.profile_hash === profileHash) return String(current.rows[0].id);
    const version = Number(current.rows[0]?.profile_version ?? 0) + 1;
    if (current.rows[0]) await client.query(`UPDATE material_processing_profiles SET status = 'superseded', updated_at = now() WHERE id = $1`, [current.rows[0].id]);
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO material_processing_profiles
        (material_id, profile_version, status, profile_hash, trade_name, manufacturer, grade, color_pigment,
         melt_flow_index, specific_gravity, shrink_rate, moisture_absorption_pct,
         approved_by_display, approved_by_actor, approved_at, source_import_id)
       VALUES ($1, $2, 'approved', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now(), $14) RETURNING id`,
      [materialId, version, profileHash, profile.tradeName, profile.manufacturer, profile.grade, profile.colorPigment, profile.meltFlowIndex, profile.specificGravity, profile.shrinkRate, profile.moistureAbsorptionPct, snapshot.header.approvedBy, actor, importId]
    );
    const profileId = inserted.rows[0]?.id ?? '';
    for (const range of profile.ranges) await client.query(`INSERT INTO material_processing_ranges (material_processing_profile_id, parameter_key, display_name, min_value, max_value, recommended_value, unit, notes, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [profileId, range.parameterKey, range.displayName, range.minValue ?? null, range.maxValue ?? null, range.recommendedValue ?? null, range.unit ?? null, range.notes ?? null, range.sortOrder]);
    return profileId;
  }

  private async createRun(client: PoolClient, revisionId: string, snapshot: ParsedSetupWorkbook, input: SetupImportCommitInput): Promise<string> {
    let runCode = input.runCode?.trim();
    if (!runCode) {
      const formulation = await client.query<{ formulation_code: string }>(`SELECT formulation_code FROM formulations WHERE id = $1`, [input.formulationId]);
      const count = await client.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM production_runs WHERE formulation_id = $1`, [input.formulationId]);
      runCode = `${formulation.rows[0]?.formulation_code ?? 'RUN'}-RUN-${String.fromCharCode(65 + Number(count.rows[0]?.count ?? 0))}`;
    }
    const coolingParameter = snapshot.parameters.find((item) => item.key === 'cycle.cooling_time');
    const cycleParameter = snapshot.parameters.find((item) => item.key === 'cycle.total_time');
    const cooling = coolingParameter?.actual;
    const cycle = cycleParameter?.actual;
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO production_runs
        (run_code, formulation_id, date_produced, machine_id, mold_id, process_setup_revision_id,
         job_name, part_number, operator_name, shift_code, injection_pressure, melt_temperature,
         cooling_time, cooling_time_unit, cycle_time, cycle_time_unit, cure_hours_before_test, status)
       VALUES ($1,$2,$3::date,$4,$5,$6,$7,$8,$9,$10,NULL,NULL,$11,$12,$13,$14,$15,$16::production_run_status) RETURNING id`,
      [runCode, input.formulationId, snapshot.header.productionDate, input.machineId, input.moldId, revisionId, snapshot.header.jobName, snapshot.header.partNumber, snapshot.header.operatorName, snapshot.header.shiftCode, typeof cooling === 'number' ? cooling : null, coolingParameter?.unit ?? null, typeof cycle === 'number' ? cycle : null, cycleParameter?.unit ?? null, input.cureHoursBeforeTest ?? 72, input.initialStatus ?? (snapshot.hasActualReadings ? 'molded' : 'planned')]
    );
    return inserted.rows[0]?.id ?? '';
  }

  private async insertRunData(client: PoolClient, runId: string, revisionId: string, importId: string, snapshot: ParsedSetupWorkbook, input: SetupImportCommitInput, actor: string): Promise<void> {
    const definitions = await this.definitionMap(client);
    const setupParams = await client.query(`SELECT id, parameter_definition_id, position_type, position_index, position_label FROM process_setup_revision_parameters WHERE process_setup_revision_id = $1`, [revisionId]);
    for (const parameter of snapshot.parameters) {
      const definitionId = definitions.get(parameter.key);
      if (!definitionId) continue;
      const linked = setupParams.rows.find((row) => row.parameter_definition_id === definitionId && row.position_type === parameter.positionType && (row.position_index ?? null) === (parameter.positionIndex ?? null) && (row.position_label ?? null) === (parameter.positionLabel ?? null));
      const actualDate = parameter.valueDate && parameter.actual ? parameter.valueDate : null;
      await client.query(
        `INSERT INTO production_run_process_values
          (production_run_id, setup_parameter_id, parameter_definition_id, position_type, position_index, position_label,
           setpoint_numeric, setpoint_text, setpoint_date, actual_numeric, actual_text, actual_date,
           unit, tolerance_min, tolerance_max, notes, source_import_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::date,$10,$11,$12::date,$13,$14,$15,$16,$17)`,
        [runId, linked?.id ?? null, definitionId, parameter.positionType, parameter.positionIndex ?? null, parameter.positionLabel ?? null, typeof parameter.setpoint === 'number' ? parameter.setpoint : null, typeof parameter.setpoint === 'string' && !parameter.valueDate ? parameter.setpoint : null, parameter.valueDate && parameter.setpoint ? parameter.valueDate : null, typeof parameter.actual === 'number' ? parameter.actual : null, typeof parameter.actual === 'string' && !actualDate ? parameter.actual : null, actualDate, parameter.unit ?? null, parameter.toleranceMin ?? null, parameter.toleranceMax ?? null, parameter.notes ?? null, importId]
      );
    }
    for (const note of snapshot.notes) await client.query(`INSERT INTO production_run_notes (production_run_id, note_type, note_text, entered_by, source_import_id) VALUES ($1,$2,$3,$4,$5)`, [runId, note.type, note.text, actor, importId]);
    if (input.primaryFormulationComponentId) await client.query(`INSERT INTO production_run_material_lots (production_run_id, formulation_component_id, material_lot_id, is_primary, source_import_id) VALUES ($1,$2,$3,true,$4)`, [runId, input.primaryFormulationComponentId, input.materialLotId ?? null, importId]);
    for (const event of snapshot.dryingEvents) {
      const times = this.dryingTimes(event.date ?? snapshot.header.productionDate, event.startTime, event.endTime);
      const duration = times.start && times.end ? (times.end.getTime() - times.start.getTime()) / 3_600_000 : event.durationHours ?? null;
      await client.query(`INSERT INTO material_drying_events (production_run_id, material_lot_id, dryer_code, setpoint_temperature, actual_temperature, started_at, ended_at, duration_hours, approved_by_display, source_import_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [runId, input.materialLotId ?? null, event.dryerCode ?? null, event.setpointTemperature ?? null, event.actualTemperature ?? null, times.start, times.end, duration, event.approvedBy ?? null, importId]);
    }
    if (input.sampleGeneration) {
      const match = input.sampleGeneration.startingSampleCode.match(/^(.*?)(\d+)$/);
      for (let index = 0; index < input.sampleGeneration.count; index += 1) {
        const code = match ? `${match[1]}${String(Number(match[2]) + index).padStart(match[2]?.length ?? 1, '0')}` : index === 0 ? input.sampleGeneration.startingSampleCode : `${input.sampleGeneration.startingSampleCode}-${index + 1}`;
        await client.query(`INSERT INTO samples (production_run_id, sample_code, cavity_number) VALUES ($1,$2,$3)`, [runId, code, input.sampleGeneration.cavityAssignments?.[index] ?? null]);
      }
    }
  }

  private dryingTimes(date: string | null | undefined, startTime: string | null | undefined, endTime: string | null | undefined): { start: Date | null; end: Date | null } {
    if (!date || !startTime) return { start: null, end: null };
    const start = this.chicagoDate(date, startTime);
    if (!endTime) return { start, end: null };
    let end = this.chicagoDate(date, endTime);
    if (end < start) end = new Date(end.getTime() + 86_400_000);
    return { start, end };
  }

  private chicagoDate(date: string, time: string): Date {
    const localAsUtc = new Date(`${date}T${time}:00Z`);
    const offsetName = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      timeZoneName: 'shortOffset',
    }).formatToParts(localAsUtc).find((part) => part.type === 'timeZoneName')?.value ?? 'GMT-6';
    const match = offsetName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    const minutes = match ? (match[1] === '+' ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3] ?? 0)) : -360;
    return new Date(localAsUtc.getTime() - minutes * 60_000);
  }

  private async definitionMap(client: PoolClient): Promise<Map<string, string>> {
    const result = await client.query<{ id: string; parameter_key: string }>(`SELECT id, parameter_key FROM process_parameter_definitions WHERE status = 'active'`);
    return new Map(result.rows.map((row) => [row.parameter_key, row.id]));
  }
  private hash(value: unknown): string { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
  private hasMaterialProfileData(snapshot: ParsedSetupWorkbook): boolean {
    const profile = snapshot.materialProfile;
    return Boolean(profile.tradeName || profile.manufacturer || profile.grade || profile.colorPigment || profile.meltFlowIndex != null || profile.specificGravity != null || profile.shrinkRate != null || profile.moistureAbsorptionPct != null || profile.ranges.length);
  }
  private async options(sql: string, value: string | null | undefined): Promise<ProcessSetupRecord[]> {
    return getPool().query(sql, [value ?? '']).then((result) => result.rows as ProcessSetupRecord[]);
  }
  private importSelect(suffix: string): string {
    return `SELECT id, status::text AS status, original_filename AS "originalFilename", file_size_bytes AS "fileSizeBytes", file_sha256 AS "fileSha256", blob_object_key AS "blobObjectKey", template_key AS "templateKey", template_version AS "templateVersion", parsed_snapshot AS "parsedSnapshot", validation_results AS "validationResults", imported_by_actor AS "importedByActor", production_run_id AS "productionRunId", process_setup_revision_id AS "processSetupRevisionId", material_processing_profile_id AS "materialProcessingProfileId", failure_message AS "failureMessage", created_at AS "createdAt", parsed_at AS "parsedAt", committed_at AS "committedAt" FROM setup_sheet_imports ${suffix}`;
  }
  private parameterSelect(suffix: string): string {
    return `SELECT p.id, d.parameter_key AS "parameterKey", d.section_key AS section, d.display_name AS "displayName", p.position_type AS "positionType", p.position_index AS "positionIndex", p.position_label AS "positionLabel", p.value_numeric::float AS "valueNumeric", p.value_text AS "valueText", p.value_date AS "valueDate", p.unit, p.tolerance_min::float AS "toleranceMin", p.tolerance_max::float AS "toleranceMax", p.notes FROM process_setup_revision_parameters p JOIN process_parameter_definitions d ON d.id = p.parameter_definition_id ${suffix} ORDER BY d.sort_order, p.position_index NULLS FIRST`;
  }
}
