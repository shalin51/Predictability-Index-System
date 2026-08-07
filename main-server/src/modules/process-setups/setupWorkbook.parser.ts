import * as XLSX from 'xlsx';
import { ValidationError } from '../../errors/app-error';
import type {
  ImportValidationResults,
  ParsedDryingEvent,
  ParsedMaterialProfile,
  ParsedProcessParameter,
  ParsedRevisionLogEntry,
  ParsedSetupWorkbook,
} from './processSetup.types';

const REQUIRED_SHEETS = ['Setup Sheet', 'Hot Runner Zones', 'Revision Log', 'Material Reference'] as const;
const TITLE_CELLS: Record<(typeof REQUIRED_SHEETS)[number], string> = {
  'Setup Sheet': 'BOY 125E  INJECTION MOLDING MACHINE — SETUP SHEET',
  'Hot Runner Zones': 'BOY 125E — HOT RUNNER ZONE TEMPERATURE SETTINGS',
  'Revision Log': 'SETUP SHEET — REVISION LOG',
  'Material Reference': 'MATERIAL PROCESSING REFERENCE',
};
const KNOWN_UNITS = new Set([
  'a', 'bar', 'ccm', 'cm³', 'count', 'f', 'gpm', 'hr', 'hrs', 'hours', 'in', 'in/s', 'kg', 'kn', 'min', 'mm', 'mm/s',
  'oz', 'psi', 'rpm', 's', 'sec', 'ton', 'w', '%', '°c', '°f',
]);
const COMPATIBLE_UNITS: Record<string, Set<string>> = {
  temperature: new Set(['°c', '°f']),
  flow: new Set(['gpm']),
  speed: new Set(['in/s', 'mm/s']),
  pressure: new Set(['bar', 'psi']),
  position: new Set(['in', 'mm']),
  time: new Set(['hr', 'hrs', 'hours', 'min', 's', 'sec']),
  rotation: new Set(['rpm']),
  force: new Set(['kn', 'ton']),
  count: new Set(['count']),
  amperage: new Set(['a']),
  wattage: new Set(['w']),
  percentage: new Set(['%']),
};

type Sheet = XLSX.WorkSheet;

const INJECTION_SINGLE_KEYS: Record<string, string> = {
  v_p_transfer_position: 'injection.vp_transfer_position',
  shot_size_stroke: 'injection.shot_size',
  cushion: 'injection.cushion',
  fill_time: 'injection.fill_time',
};

const SCREW_PARAMETER_KEYS: Record<string, string> = {
  screw_speed: 'screw.speed',
  back_pressure: 'screw.back_pressure',
  decompression_suck_back: 'screw.decompression',
  recovery_time: 'screw.recovery_time',
  screw_diameter: 'screw.diameter',
  l_d_ratio: 'screw.ld_ratio',
};

const CYCLE_PARAMETER_KEYS: Record<string, string> = {
  cooling_time: 'cycle.cooling_time',
  total_cycle_time: 'cycle.total_time',
  mold_open_time: 'cycle.mold_open_time',
  mold_close_time: 'cycle.mold_close_time',
  ejector_forward_time: 'cycle.ejector_forward_time',
  ejector_return_time: 'cycle.ejector_return_time',
  ejector_strokes: 'cycle.ejector_strokes',
};

const CLAMP_PARAMETER_KEYS: Record<string, string> = {
  clamp_force: 'clamp.force',
  mold_close_speed: 'clamp.mold_close_speed',
  mold_close_speed_fast: 'clamp.mold_close_speed_fast',
  mold_close_speed_slow: 'clamp.mold_close_speed_slow',
  mold_close_pressure: 'clamp.mold_close_pressure',
  mold_open_speed: 'clamp.mold_open_speed',
  mold_open_speed_fast: 'clamp.mold_open_speed_fast',
  mold_open_speed_slow: 'clamp.mold_open_speed_slow',
  low_pressure_protection: 'clamp.low_pressure_protection',
  ejector_forward_position: 'clamp.ejector_forward_position',
  ejector_forward_speed: 'clamp.ejector_forward_speed',
  ejector_retract_speed: 'clamp.ejector_retract_speed',
};

export class SetupWorkbookParser {
  parse(bytes: Buffer): { snapshot: ParsedSetupWorkbook; validation: ImportValidationResults } {
    if (bytes.subarray(0, 2).toString('hex') !== '504b') throw new ValidationError('The uploaded file is not a readable XLSX workbook');
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(bytes, { type: 'buffer', cellDates: true, cellFormula: true, bookVBA: true });
    } catch {
      throw new ValidationError('The uploaded file is not a readable XLSX workbook');
    }

    if ((workbook as XLSX.WorkBook & { vbaraw?: unknown }).vbaraw) {
      throw new ValidationError('Macro-enabled workbooks are not supported');
    }
    const missing = REQUIRED_SHEETS.filter((name) => !workbook.Sheets[name]);
    if (missing.length > 0) throw new ValidationError(`Missing required sheets: ${missing.join(', ')}`);
    const unsupported = workbook.SheetNames.filter((name) => !REQUIRED_SHEETS.includes(name as (typeof REQUIRED_SHEETS)[number]));
    if (unsupported.length > 0) throw new ValidationError(`Unsupported sheets: ${unsupported.join(', ')}`);
    if (this.hasExternalLinks(workbook)) throw new ValidationError('External workbook links are not supported');

    const setup = this.requireSheet(workbook, 'Setup Sheet');
    const hotRunner = this.requireSheet(workbook, 'Hot Runner Zones');
    const revisionLog = this.requireSheet(workbook, 'Revision Log');
    const materialReference = this.requireSheet(workbook, 'Material Reference');
    if (REQUIRED_SHEETS.some((name) => this.text(this.requireSheet(workbook, name), 'A1') !== TITLE_CELLS[name])) {
      throw new ValidationError('Workbook fingerprint does not match the BOY 125E setup template');
    }

    const parameters = [
      ...this.parseSetupParameters(setup),
      ...this.parseHotRunnerParameters(hotRunner),
    ];
    const snapshot: ParsedSetupWorkbook = {
      templateKey: 'boy-125e',
      templateVersion: 'v1',
      header: {
        jobName: this.optionalText(setup, 'B2'),
        partNumber: this.optionalText(setup, 'D2'),
        materialName: this.optionalText(setup, 'B3'),
        materialLotNumber: this.optionalText(setup, 'D3'),
        moldCode: this.optionalText(setup, 'B4'),
        moldDescription: this.optionalText(setup, 'D4'),
        machineCode: this.optionalText(setup, 'B5'),
        productionDate: this.date(setup, 'D5'),
        operatorName: this.optionalText(setup, 'F5'),
        shiftCode: this.optionalText(setup, 'H5'),
        revisionNo: this.optionalText(setup, 'B6'),
        approvedBy: this.optionalText(setup, 'D6'),
      },
      hotRunner: {
        moldCode: this.optionalText(hotRunner, 'B2'),
        productionDate: this.date(hotRunner, 'H2'),
        operatorName: this.optionalText(hotRunner, 'H3'),
        manufacturer: this.optionalText(hotRunner, 'E2'),
        controllerModel: this.optionalText(hotRunner, 'B3'),
        zoneCount: this.number(hotRunner, 'E3'),
        zoneNumbers: Array.from({ length: 18 }, (_, index) => this.number(hotRunner, `A${index + 7}`)).filter((value): value is number => value != null),
        zones: Array.from({ length: 18 }, (_, index) => ({
          zoneNumber: this.number(hotRunner, `A${index + 7}`) ?? index + 1,
          zoneName: this.optionalText(hotRunner, `B${index + 7}`),
        })),
      },
      parameters,
      notes: this.parseNotes(setup, hotRunner),
      revisions: this.parseRevisions(revisionLog),
      materialProfile: this.parseMaterialProfile(materialReference),
      dryingEvents: this.parseDryingEvents(materialReference),
      hasActualReadings: parameters.some((item) => item.actual !== null && item.actual !== undefined),
    };
    return { snapshot, validation: this.validate(snapshot, this.detectInvalidNumbers(workbook)) };
  }

  validateSnapshot(snapshot: ParsedSetupWorkbook): ImportValidationResults {
    return this.validate(snapshot);
  }

  private requireSheet(workbook: XLSX.WorkBook, name: string): Sheet {
    const sheet = workbook.Sheets[name];
    if (!sheet) throw new ValidationError(`Missing required sheet: ${name}`);
    return sheet;
  }

  private parseSetupParameters(sheet: Sheet): ParsedProcessParameter[] {
    const values: ParsedProcessParameter[] = [];
    for (let row = 10; row <= 14; row += 1) {
      this.pushPair(values, sheet, 'barrel.temperature', 'barrel_temperature', 'zone', row, '', 'B', 'C', 'D', 'F', '°F', row);
      const setpoint = this.number(sheet, `C${row}`);
      const tolerance = this.tolerance(this.text(sheet, `E${row}`));
      const current = values[values.length - 1];
      if (current?.sortOrder === row) current.positionIndex = row - 9;
      if (current && setpoint != null && tolerance != null) {
        current.toleranceMin = setpoint - tolerance;
        current.toleranceMax = setpoint + tolerance;
      }
    }
    for (let row = 18; row <= 21; row += 1) {
      this.pushPair(values, sheet, 'mold.temperature', 'mold_temperature', 'circuit', row, 'A', 'B', 'C', 'D', 'I', '°F', row);
      this.pushActual(values, sheet, 'mold.flow', 'mold_temperature', 'circuit', row, 'A', 'B', 'E', 'GPM', row + 100);
      this.pushActual(values, sheet, 'mold.inlet_temperature', 'mold_temperature', 'circuit', row, 'A', 'B', 'F', '°F', row + 200);
      this.pushActual(values, sheet, 'mold.outlet_temperature', 'mold_temperature', 'circuit', row, 'A', 'B', 'G', '°F', row + 300);
    }
    this.parseInjectionParameters(values, sheet);
    this.parseHoldParameters(values, sheet);
    this.parseSingleParameterSection(values, sheet, 'SCREW & RECOVERY SETTINGS', 'COOLING & CYCLE TIME', 'screw_recovery', SCREW_PARAMETER_KEYS, [44, 49]);
    this.parseSingleParameterSection(values, sheet, 'COOLING & CYCLE TIME', 'CLAMP SETTINGS', 'cooling_cycle', CYCLE_PARAMETER_KEYS, [53, 59]);
    this.parseSingleParameterSection(values, sheet, 'CLAMP SETTINGS', 'OPERATOR NOTES & OBSERVATIONS', 'clamp_ejector', CLAMP_PARAMETER_KEYS, [63, 72]);
    return values;
  }

  private parseInjectionParameters(values: ParsedProcessParameter[], sheet: Sheet): void {
    const [start, end] = this.sectionRows(sheet, 'INJECTION PARAMETERS', 'HOLD / PACK PARAMETERS', [25, 34]);
    const fallbackStageIndex = new Map<string, number>();
    for (let row = start; row <= end; row += 1) {
      const displayName = this.optionalText(sheet, `A${row}`);
      if (!displayName) continue;
      const labelKey = this.slug(displayName);
      const stageKey = labelKey === 'injection_speed' ? 'injection.speed'
        : labelKey === 'injection_pressure' ? 'injection.pressure' : null;
      if (stageKey) {
        const positionLabel = this.optionalText(sheet, `B${row}`);
        const fallback = fallbackStageIndex.get(stageKey) ?? 0;
        const positionIndex = this.positionNumber(positionLabel) ?? fallback;
        fallbackStageIndex.set(stageKey, fallback + 1);
        this.push(values, {
          key: stageKey,
          section: 'injection',
          positionType: 'stage',
          positionIndex,
          positionLabel,
          setpoint: this.number(sheet, `C${row}`),
          actual: this.number(sheet, `D${row}`),
          unit: this.unit(sheet, `E${row}`),
          notes: this.optionalText(sheet, `F${row}`),
          sortOrder: row,
        });
        continue;
      }
      const key = INJECTION_SINGLE_KEYS[labelKey];
      if (key) this.pushPair(values, sheet, key, 'injection', 'single', row, '', 'A', 'C', 'D', 'F', this.unit(sheet, `E${row}`), row);
    }
  }

  private parseHoldParameters(values: ParsedProcessParameter[], sheet: Sheet): void {
    const headingRow = this.findRow(sheet, 'HOLD / PACK PARAMETERS');
    const [start, end] = this.sectionRows(sheet, 'HOLD / PACK PARAMETERS', 'SCREW & RECOVERY SETTINGS', [38, 40]);
    const headerRow = headingRow ? headingRow + 1 : start - 1;
    const pressureUnit = this.unitFromHeader(this.optionalText(sheet, `B${headerRow}`)) ?? 'bar';
    const actualPressureUnit = this.unitFromHeader(this.optionalText(sheet, `D${headerRow}`)) ?? pressureUnit;
    const timeUnit = this.unitFromHeader(this.optionalText(sheet, `C${headerRow}`)) ?? 'sec';
    let fallbackIndex = 1;
    for (let row = start; row <= end; row += 1) {
      const label = this.optionalText(sheet, `A${row}`);
      if (!label || !this.slug(label).startsWith('hold_stage')) continue;
      const positionIndex = this.positionNumber(label) ?? fallbackIndex;
      fallbackIndex += 1;
      this.push(values, {
        key: 'hold.pressure',
        section: 'hold_pack',
        positionType: 'stage',
        positionIndex,
        positionLabel: label,
        setpoint: this.number(sheet, `B${row}`),
        actual: this.convertPressure(this.number(sheet, `D${row}`), actualPressureUnit, pressureUnit),
        unit: pressureUnit,
        notes: this.optionalText(sheet, `E${row}`),
        sortOrder: row,
      });
      this.push(values, { key: 'hold.time', section: 'hold_pack', positionType: 'stage', positionIndex, positionLabel: label, setpoint: this.number(sheet, `C${row}`), unit: timeUnit, sortOrder: row + 100 });
    }
  }

  private parseSingleParameterSection(values: ParsedProcessParameter[], sheet: Sheet, heading: string, nextHeading: string, section: string, keys: Record<string, string>, fallback: [number, number]): void {
    const [start, end] = this.sectionRows(sheet, heading, nextHeading, fallback);
    for (let row = start; row <= end; row += 1) {
      const displayName = this.optionalText(sheet, `A${row}`);
      if (!displayName) continue;
      const key = keys[this.slug(displayName)];
      if (key) this.pushPair(values, sheet, key, section, 'single', row, '', 'A', 'B', 'C', 'E', this.unit(sheet, `D${row}`), row);
    }
  }

  private parseHotRunnerParameters(sheet: Sheet): ParsedProcessParameter[] {
    const values: ParsedProcessParameter[] = [];
    for (let row = 7; row <= 24; row += 1) {
      const zone = this.number(sheet, `A${row}`) ?? row - 6;
      const label = this.optionalText(sheet, `B${row}`);
      this.push(values, { key: 'hot_runner.temperature', section: 'hot_runner', positionType: 'zone', positionIndex: zone, positionLabel: label, setpoint: this.number(sheet, `C${row}`), actual: this.number(sheet, `D${row}`), unit: '°F', notes: this.optionalText(sheet, `L${row}`), sortOrder: row });
      this.push(values, { key: 'hot_runner.amperage', section: 'hot_runner', positionType: 'zone', positionIndex: zone, positionLabel: label, actual: this.number(sheet, `E${row}`), unit: 'A', sortOrder: row + 100 });
      this.push(values, { key: 'hot_runner.wattage', section: 'hot_runner', positionType: 'zone', positionIndex: zone, positionLabel: label, actual: this.number(sheet, `F${row}`), unit: 'W', sortOrder: row + 200 });
      this.push(values, { key: 'hot_runner.status', section: 'hot_runner', positionType: 'zone', positionIndex: zone, positionLabel: label, actual: this.optionalText(sheet, `G${row}`)?.toUpperCase() ?? null, sortOrder: row + 300 });
      this.push(values, { key: 'hot_runner.alarm_low', section: 'hot_runner', positionType: 'zone', positionIndex: zone, positionLabel: label, setpoint: this.number(sheet, `H${row}`), unit: '°F', sortOrder: row + 400 });
      this.push(values, { key: 'hot_runner.alarm_high', section: 'hot_runner', positionType: 'zone', positionIndex: zone, positionLabel: label, setpoint: this.number(sheet, `I${row}`), unit: '°F', sortOrder: row + 500 });
      const tuned = this.date(sheet, `K${row}`);
      this.push(values, { key: 'hot_runner.last_tuned', section: 'hot_runner', positionType: 'zone', positionIndex: zone, positionLabel: label, actual: tuned, valueDate: tuned, sortOrder: row + 600 });
    }
    this.push(values, { key: 'hot_runner.soak_time', section: 'hot_runner', positionType: 'single', setpoint: this.number(sheet, 'B34'), unit: 'min', sortOrder: 900 });
    this.push(values, { key: 'hot_runner.minimum_soak_temperature', section: 'hot_runner', positionType: 'single', setpoint: this.number(sheet, 'E34'), unit: '°F', sortOrder: 901 });
    return values;
  }

  private parseNotes(setup: Sheet, hotRunner: Sheet): Array<{ type: string; text: string }> {
    return [
      ['startup', this.textAfterLabel(setup, 'Startup Notes:', 'B75')],
      ['quality_issue', this.textAfterLabel(setup, 'Quality Issues:', 'B76')],
      ['process_change', this.textAfterLabel(setup, 'Process Changes:', 'B77')],
      ['signoff', this.textAfterLabel(setup, 'Sign-off / Approval Notes:', 'B78')],
      ['hot_runner_startup', this.optionalText(hotRunner, 'B35')],
      ['hot_runner_purge', this.optionalText(hotRunner, 'B36')],
      ['hot_runner_issue', this.optionalText(hotRunner, 'B37')],
    ].filter((item): item is [string, string] => Boolean(item[1])).map(([type, text]) => ({ type, text }));
  }

  private parseRevisions(sheet: Sheet): ParsedRevisionLogEntry[] {
    const rows: ParsedRevisionLogEntry[] = [];
    for (let row = 3; row <= 22; row += 1) {
      const revisionNo = this.optionalText(sheet, `A${row}`);
      if (!revisionNo) continue;
      rows.push({ revisionNo, revisionDate: this.date(sheet, `B${row}`), changedBy: this.optionalText(sheet, `C${row}`), approvedBy: this.optionalText(sheet, `D${row}`), description: this.optionalText(sheet, `E${row}`), machineStatus: this.optionalText(sheet, `F${row}`), sortOrder: row });
    }
    return rows;
  }

  private parseMaterialProfile(sheet: Sheet): ParsedMaterialProfile {
    const ranges: ParsedMaterialProfile['ranges'] = [];
    for (let row = 12; row <= 19; row += 1) {
      const displayName = this.optionalText(sheet, `A${row}`);
      if (!displayName) continue;
      const range = { parameterKey: this.slug(displayName), displayName, minValue: this.number(sheet, `B${row}`), maxValue: this.number(sheet, `C${row}`), recommendedValue: this.number(sheet, `D${row}`), unit: this.optionalText(sheet, `E${row}`), notes: this.optionalText(sheet, `F${row}`), sortOrder: row };
      if (range.minValue != null || range.maxValue != null || range.recommendedValue != null || range.notes) ranges.push(range);
    }
    return { tradeName: this.optionalText(sheet, 'B5'), manufacturer: this.optionalText(sheet, 'E5'), grade: this.optionalText(sheet, 'B6'), colorPigment: this.optionalText(sheet, 'E6'), meltFlowIndex: this.number(sheet, 'B7'), specificGravity: this.number(sheet, 'E7'), shrinkRate: this.number(sheet, 'B8'), moistureAbsorptionPct: this.number(sheet, 'E8'), ranges };
  }

  private parseDryingEvents(sheet: Sheet): ParsedDryingEvent[] {
    const rows: ParsedDryingEvent[] = [];
    for (let row = 23; row <= 32; row += 1) {
      const candidate: ParsedDryingEvent = { date: this.date(sheet, `A${row}`), lotNumber: this.optionalText(sheet, `B${row}`), dryerCode: this.optionalText(sheet, `C${row}`), setpointTemperature: this.number(sheet, `D${row}`), actualTemperature: this.number(sheet, `E${row}`), startTime: this.time(sheet, `F${row}`), endTime: this.time(sheet, `G${row}`), durationHours: this.number(sheet, `H${row}`), approvedBy: this.optionalText(sheet, `I${row}`) };
      if (Object.values(candidate).some((value) => value !== null && value !== undefined && value !== '')) rows.push(candidate);
    }
    return rows;
  }

  private validate(snapshot: ParsedSetupWorkbook, parsingErrors: string[] = []): ImportValidationResults {
    const errors: string[] = [...parsingErrors];
    const warnings: string[] = [];
    if (!snapshot.header.productionDate) warnings.push('Production date is blank; the import date will be used');
    if (!snapshot.header.operatorName) warnings.push('Operator is blank; no operator will be recorded');
    if (!snapshot.header.machineCode) warnings.push('Machine number is blank; select a machine during import');
    if (!snapshot.header.moldCode) warnings.push('Mold number is blank; select a mold during import');
    if (!snapshot.header.revisionNo) warnings.push('Revision number is blank; a generated import revision will be used');
    if (!snapshot.header.approvedBy) warnings.push('Approved By is blank; the imported setup will remain a draft');
    if (snapshot.hotRunner.moldCode && snapshot.header.moldCode && snapshot.hotRunner.moldCode.toLowerCase() !== snapshot.header.moldCode.toLowerCase()) errors.push('Hot Runner mold number must match the Setup Sheet mold number');
    if (snapshot.hotRunner.operatorName && snapshot.header.operatorName && snapshot.hotRunner.operatorName.toLowerCase() !== snapshot.header.operatorName.toLowerCase()) errors.push('Hot Runner operator must match the Setup Sheet operator');
    if (snapshot.hotRunner.productionDate && snapshot.header.productionDate && snapshot.hotRunner.productionDate !== snapshot.header.productionDate) errors.push('Hot Runner date must match the Setup Sheet production date');
    const matchingRevision = snapshot.header.revisionNo
      ? snapshot.revisions.find((entry) => entry.revisionNo.toLowerCase() === snapshot.header.revisionNo?.toLowerCase())
      : undefined;
    if (snapshot.header.revisionNo && !matchingRevision) warnings.push('Revision Log does not contain the current revision number; no matching revision history will be imported');
    else if (matchingRevision && snapshot.header.approvedBy && !matchingRevision.approvedBy) warnings.push('Revision Log approver is blank; the imported setup will remain a draft');
    else if (matchingRevision?.approvedBy && snapshot.header.approvedBy && matchingRevision.approvedBy.toLowerCase() !== snapshot.header.approvedBy.toLowerCase()) errors.push('Revision Log approver must match Approved By');
    const statuses = snapshot.parameters.filter((item) => item.key === 'hot_runner.status' && item.actual != null);
    for (const status of statuses) if (!['OK', 'FAULT'].includes(String(status.actual))) errors.push(`Invalid hot-runner status at zone ${status.positionIndex}: ${status.actual}`);
    const uniqueZones = new Set(snapshot.hotRunner.zoneNumbers);
    if (uniqueZones.size !== snapshot.hotRunner.zoneNumbers.length) errors.push('Duplicate hot-runner zone numbers were found');
    if (snapshot.hotRunner.zoneCount != null && snapshot.hotRunner.zoneCount !== 18) errors.push(`Hot-runner zone count must be 18 for this template; received ${snapshot.hotRunner.zoneCount}`);
    if (snapshot.hotRunner.zoneCount != null && snapshot.hotRunner.zoneNumbers.length !== snapshot.hotRunner.zoneCount) errors.push(`Hot-runner zone rows do not match the configured zone count of ${snapshot.hotRunner.zoneCount}`);
    const revisionNumbers = snapshot.revisions.map((entry) => entry.revisionNo.toLowerCase());
    if (new Set(revisionNumbers).size !== revisionNumbers.length) errors.push('Duplicate revision numbers were found in the Revision Log');
    const stageGroups = new Map<string, number[]>();
    for (const parameter of snapshot.parameters.filter((item) => item.positionType === 'stage' && item.positionIndex != null)) {
      stageGroups.set(parameter.key, [...(stageGroups.get(parameter.key) ?? []), parameter.positionIndex as number]);
    }
    for (const [key, positions] of stageGroups) if (new Set(positions).size !== positions.length) errors.push(`Duplicate stage numbers were found for ${key}`);
    for (const parameter of snapshot.parameters) {
      if (parameter.unit && !KNOWN_UNITS.has(this.normalizeUnit(parameter.unit))) errors.push(`Unknown unit for ${parameter.key}: ${parameter.unit}`);
      else if (parameter.unit && !this.isCompatibleUnit(parameter.key, parameter.unit)) errors.push(`Incompatible unit for ${parameter.key}: ${parameter.unit}`);
    }
    for (const range of snapshot.materialProfile.ranges) {
      if (range.unit && !KNOWN_UNITS.has(this.normalizeUnit(range.unit))) errors.push(`Unknown material-range unit for ${range.displayName}: ${range.unit}`);
      else if (range.unit && !this.isCompatibleUnit(range.parameterKey, range.unit)) errors.push(`Incompatible unit for material range ${range.displayName}: ${range.unit}`);
      if (range.minValue != null && range.maxValue != null && range.minValue > range.maxValue) errors.push(`Minimum exceeds maximum for material range ${range.displayName}`);
    }
    snapshot.dryingEvents.forEach((event, index) => {
      if ((event.startTime && !event.endTime) || (!event.startTime && event.endTime)) errors.push(`Drying row ${index + 1} must include both start and end times`);
      if (event.durationHours != null && event.durationHours < 0) errors.push(`Drying row ${index + 1} has an invalid negative duration`);
    });
    if (!snapshot.header.materialName) warnings.push('Material is blank; material profile and drying lot matching will require explicit resolution');
    if (!snapshot.hasActualReadings) warnings.push('Workbook contains no actual process readings; imported run will default to planned');
    return { errors: [...new Set(errors)], warnings };
  }

  private pushPair(values: ParsedProcessParameter[], sheet: Sheet, key: string, section: string, positionType: string, row: number, indexColumn: string, labelColumn: string, setpointColumn: string, actualColumn: string, notesColumn: string, unit: string | null | undefined, sortOrder: number): void {
    const indexValue = indexColumn ? this.number(sheet, `${indexColumn}${row}`) : null;
    this.push(values, { key, section, positionType, positionIndex: indexValue, positionLabel: this.optionalText(sheet, `${labelColumn}${row}`), setpoint: this.number(sheet, `${setpointColumn}${row}`), actual: this.number(sheet, `${actualColumn}${row}`), unit, notes: this.optionalText(sheet, `${notesColumn}${row}`), sortOrder });
  }

  private pushActual(values: ParsedProcessParameter[], sheet: Sheet, key: string, section: string, positionType: string, row: number, indexColumn: string, labelColumn: string, actualColumn: string, unit: string, sortOrder: number): void {
    this.push(values, { key, section, positionType, positionIndex: this.number(sheet, `${indexColumn}${row}`), positionLabel: this.optionalText(sheet, `${labelColumn}${row}`), actual: this.number(sheet, `${actualColumn}${row}`), unit, sortOrder });
  }

  private push(values: ParsedProcessParameter[], item: ParsedProcessParameter): void {
    if (item.setpoint == null && item.actual == null && !item.notes) return;
    values.push(item);
  }

  private raw(sheet: Sheet, address: string): unknown {
    const cell = sheet[address];
    return cell?.f ? undefined : cell?.v;
  }
  private text(sheet: Sheet, address: string): string { return String(this.raw(sheet, address) ?? '').trim(); }
  private optionalText(sheet: Sheet, address: string): string | null { return this.text(sheet, address) || null; }
  private number(sheet: Sheet, address: string): number | null {
    const value = this.raw(sheet, address);
    if (value === null || value === undefined || value === '') return null;
    const parsed = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
    if (!Number.isFinite(parsed)) return null;
    return parsed;
  }
  private date(sheet: Sheet, address: string): string | null {
    const value = this.raw(sheet, address);
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
    if (typeof value === 'number') return XLSX.SSF.parse_date_code(value) ? this.excelDate(value) : null;
    const text = String(value ?? '').trim();
    if (!text) return null;
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }
  private time(sheet: Sheet, address: string): string | null {
    const value = this.raw(sheet, address);
    if (value instanceof Date) return `${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}`;
    if (typeof value === 'number') {
      const minutes = Math.round((value % 1) * 1440) % 1440;
      return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    }
    const text = String(value ?? '').trim();
    if (!text) return null;
    const match = text.match(/^(\d{1,2}):(\d{2})/);
    return match ? `${match[1]?.padStart(2, '0')}:${match[2]}` : null;
  }
  private excelDate(value: number): string | null {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return `${String(parsed.y).padStart(4, '0')}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }
  private tolerance(value: string): number | null {
    const match = value.match(/[-+±]?\s*(\d+(?:\.\d+)?)/);
    return match?.[1] ? Number(match[1]) : null;
  }
  private slug(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }
  private findRow(sheet: Sheet, label: string): number | null {
    const range = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']) : null;
    if (!range) return null;
    const target = this.slug(label);
    for (let row = range.s.r; row <= range.e.r; row += 1) {
      if (this.slug(this.text(sheet, `A${row + 1}`)) === target) return row + 1;
    }
    return null;
  }
  private sectionRows(sheet: Sheet, heading: string, nextHeading: string, fallback: [number, number]): [number, number] {
    const headingRow = this.findRow(sheet, heading);
    const nextHeadingRow = this.findRow(sheet, nextHeading);
    return headingRow && nextHeadingRow && nextHeadingRow > headingRow
      ? [headingRow + 2, nextHeadingRow - 1]
      : fallback;
  }
  private textAfterLabel(sheet: Sheet, label: string, fallbackAddress: string): string | null {
    const row = this.findRow(sheet, label);
    return this.optionalText(sheet, row ? `B${row}` : fallbackAddress);
  }
  private unitFromHeader(value: string | null): string | null {
    const match = value?.match(/\(([^)]+)\)/);
    return match?.[1] ? this.unitValue(match[1]) : null;
  }
  private unitValue(value: string): string | null {
    const trimmed = value.trim();
    return trimmed && !['-', '—'].includes(trimmed) ? trimmed : null;
  }
  private convertPressure(value: number | null, fromUnit: string, toUnit: string): number | null {
    if (value == null || this.normalizeUnit(fromUnit) === this.normalizeUnit(toUnit)) return value;
    const from = this.normalizeUnit(fromUnit);
    const to = this.normalizeUnit(toUnit);
    if (from === 'bar' && to === 'psi') return value * 14.5037738;
    if (from === 'psi' && to === 'bar') return value / 14.5037738;
    return value;
  }
  private positionNumber(value: string | null | undefined): number | null {
    const match = value?.match(/(\d+)/);
    return match?.[1] ? Number(match[1]) : null;
  }
  private normalizeUnit(value: string): string { return value.trim().toLowerCase().replace(/^deg\s*/i, '°'); }
  private unit(sheet: Sheet, address: string): string | null {
    const value = this.optionalText(sheet, address);
    return value ? this.unitValue(value) : null;
  }
  private isCompatibleUnit(key: string, unit: string): boolean {
    const normalized = this.normalizeUnit(unit);
    const group = key.includes('temperature') || key.includes('alarm_') ? 'temperature'
      : key.includes('flow') ? 'flow'
        : key.includes('speed') ? (key === 'screw.speed' || key === 'screw_speed' ? 'rotation' : 'speed')
          : key.includes('pressure') || key.includes('protection') ? 'pressure'
            : key.includes('time') ? 'time'
              : key.includes('position') || key.includes('shot_size') || key.includes('cushion') || key.includes('decompression') || key.includes('diameter') ? 'position'
                : key.includes('force') ? 'force'
                  : key.includes('strokes') ? 'count'
                    : key.includes('amperage') ? 'amperage'
                      : key.includes('wattage') ? 'wattage'
                        : key.includes('moisture') ? 'percentage' : null;
    return !group || COMPATIBLE_UNITS[group]?.has(normalized) === true;
  }
  private hasExternalLinks(workbook: XLSX.WorkBook): boolean {
    if (workbook.Workbook?.Names?.some((name) => /\[[^\]]+\]/.test(name.Ref ?? ''))) return true;
    return workbook.SheetNames.some((name) => Object.values(workbook.Sheets[name] ?? {}).some((candidate) => {
      if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return false;
      const cell = candidate as XLSX.CellObject;
      const target = cell.l?.Target ?? '';
      return (Boolean(target) && !target.startsWith('#')) || (typeof cell.f === 'string' && /\[[^\]]+\]/.test(cell.f));
    }));
  }
  private detectInvalidNumbers(workbook: XLSX.WorkBook): string[] {
    const addresses: Array<[string, string]> = [];
    const add = (sheet: string, columns: string[], start: number, end: number) => {
      for (let row = start; row <= end; row += 1) for (const column of columns) addresses.push([sheet, `${column}${row}`]);
    };
    const setup = workbook.Sheets['Setup Sheet'];
    const addSetupSection = (heading: string, nextHeading: string, columns: string[], fallback: [number, number]) => {
      const [start, end] = setup ? this.sectionRows(setup, heading, nextHeading, fallback) : fallback;
      add('Setup Sheet', columns, start, end);
    };
    add('Setup Sheet', ['C', 'D'], 10, 14);
    add('Setup Sheet', ['C', 'D', 'E', 'F', 'G'], 18, 21);
    addSetupSection('INJECTION PARAMETERS', 'HOLD / PACK PARAMETERS', ['C', 'D'], [25, 34]);
    addSetupSection('HOLD / PACK PARAMETERS', 'SCREW & RECOVERY SETTINGS', ['B', 'C', 'D'], [38, 40]);
    addSetupSection('SCREW & RECOVERY SETTINGS', 'COOLING & CYCLE TIME', ['B', 'C'], [44, 49]);
    addSetupSection('COOLING & CYCLE TIME', 'CLAMP SETTINGS', ['B', 'C'], [53, 59]);
    addSetupSection('CLAMP SETTINGS', 'OPERATOR NOTES & OBSERVATIONS', ['B', 'C'], [63, 72]);
    add('Hot Runner Zones', ['C', 'D', 'E', 'F', 'H', 'I'], 7, 24);
    addresses.push(['Hot Runner Zones', 'B34'], ['Hot Runner Zones', 'E34']);
    add('Material Reference', ['B', 'C', 'D'], 12, 19);
    add('Material Reference', ['D', 'E', 'H'], 23, 32);
    addresses.push(['Material Reference', 'B7'], ['Material Reference', 'E7'], ['Material Reference', 'B8'], ['Material Reference', 'E8']);
    return addresses.flatMap(([sheetName, address]) => {
      const cell = workbook.Sheets[sheetName]?.[address];
      if (!cell || cell.f || cell.v === null || cell.v === undefined || cell.v === '') return [];
      const value = typeof cell.v === 'number' ? cell.v : Number(String(cell.v).replace(/,/g, ''));
      return Number.isFinite(value) ? [] : [`Invalid numeric value at ${sheetName}!${address}: ${String(cell.v)}`];
    });
  }
}
