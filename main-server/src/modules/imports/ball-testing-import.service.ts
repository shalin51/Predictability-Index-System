import type {
  BallTestingImportRequestDto,
  BallTestingImportResultDto,
  BallTestingImportSheetResultDto,
  BallTestingMetricAveragesDto,
  BallTestingSampleDto,
  BallTestingSheetClassification,
  BenchmarkMetricTarget,
  Formulation,
  UpsertTestResultDto,
} from '@amfpi/shared';
import { getPool } from '../../infrastructure/database/pg-pool';
import { BenchmarkRepository } from '../../infrastructure/repositories/benchmark.repository';
import { FormulationRepository } from '../../infrastructure/repositories/formulation.repository';
import { TestResultRepository } from '../../infrastructure/repositories/test-result.repository';
import { BenchmarkService } from '../benchmarks/benchmark.service';
import { AuditService } from '../audit/audit.service';
import { ValidationError } from '../../errors/app-error';

const LBF_TO_KGF = 0.45359237;

const BENCHMARK_METRIC_CONFIG: Array<{
  averageKey: keyof BallTestingMetricAveragesDto;
  metricName: string;
  metricCategory: BenchmarkMetricTarget['metricCategory'];
  unit: string;
}> = [
  { averageKey: 'weightG', metricName: 'weight', metricCategory: 'physical', unit: 'g' },
  { averageKey: 'compressionKg', metricName: 'compression', metricCategory: 'performance', unit: 'kgf' },
  { averageKey: 'hardnessShoreD', metricName: 'hardness', metricCategory: 'performance', unit: 'Shore D' },
  { averageKey: 'wallThicknessMm', metricName: 'wall_thickness', metricCategory: 'physical', unit: 'mm' },
  { averageKey: 'diameterMm', metricName: 'diameter', metricCategory: 'physical', unit: 'mm' },
  { averageKey: 'stretchQuarterInchLbf', metricName: 'stretch_quarter_inch', metricCategory: 'performance', unit: 'lbf' },
  { averageKey: 'fullStretchMaxLbf', metricName: 'full_stretch_max', metricCategory: 'performance', unit: 'lbf' },
  { averageKey: 'dropTestCm', metricName: 'drop_test', metricCategory: 'performance', unit: 'cm' },
];

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function averageNumeric(values: Array<number | undefined>): number | undefined {
  const valid = values.filter((value): value is number => typeof value === 'number' && !Number.isNaN(value));
  if (valid.length === 0) {
    return undefined;
  }

  const total = valid.reduce((sum, value) => sum + value, 0);
  return round4(total / valid.length);
}

function buildAverages(samples: BallTestingSampleDto[]): BallTestingMetricAveragesDto {
  const compressionLbf = averageNumeric(samples.map((sample) => sample.compressionLbf));
  return {
    weightG: averageNumeric(samples.map((sample) => sample.weightG)),
    compressionLbf,
    compressionKg: compressionLbf != null ? round4(compressionLbf * LBF_TO_KGF) : undefined,
    stretchQuarterInchLbf: averageNumeric(samples.map((sample) => sample.stretchQuarterInchLbf)),
    fullStretchMaxLbf: averageNumeric(samples.map((sample) => sample.fullStretchMaxLbf)),
    hardnessShoreD: averageNumeric(samples.map((sample) => sample.hardnessShoreD)),
    wallThicknessMm: averageNumeric(samples.map((sample) => sample.wallThicknessMm)),
    diameterMm: averageNumeric(samples.map((sample) => sample.diameterMm)),
    dropTestCm: averageNumeric(samples.map((sample) => sample.dropTestCm)),
  };
}

function inferBenchmarkIdentity(sheetName: string): { name: string; brand: string; model: string } {
  const normalized = sheetName.trim();

  if (/^x[-\s]?40$/i.test(normalized)) {
    return {
      name: 'Franklin X-40',
      brand: 'Franklin Sports',
      model: 'X-40',
    };
  }

  if (/^lt48$/i.test(normalized)) {
    return {
      name: 'LT48',
      brand: 'LT',
      model: '48',
    };
  }

  const parts = normalized.split(/\s+/);
  return {
    name: normalized,
    brand: parts[0] ?? normalized,
    model: parts.slice(1).join(' ') || normalized,
  };
}

function defaultFormulationCode(sheetName: string): string {
  const normalized = sheetName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'IMPORTED-FORMULATION';
}

function toAggregateTestResult(
  testedAt: string | undefined,
  averages: BallTestingMetricAveragesDto,
  importedBy: string,
  notes: string | undefined
): UpsertTestResultDto {
  return {
    testedAt,
    testedBy: importedBy,
    weightG: averages.weightG,
    diameterMm: averages.diameterMm,
    wallThicknessMm: averages.wallThicknessMm,
    hardnessShorD: averages.hardnessShoreD,
    compressionKg: averages.compressionKg,
    stretchQuarterInchLbf: averages.stretchQuarterInchLbf,
    fullStretchMaxLbf: averages.fullStretchMaxLbf,
    bounceCm: averages.dropTestCm,
    notes,
  };
}

export class BallTestingImportService {
  constructor(
    private readonly formulationRepo: FormulationRepository,
    private readonly testResultRepo: TestResultRepository,
    private readonly benchmarkRepo: BenchmarkRepository,
    private readonly benchmarkService: BenchmarkService,
    private readonly audit: AuditService,
  ) {}

  async importWorkbook(dto: BallTestingImportRequestDto, importedBy: string): Promise<BallTestingImportResultDto> {
    this.validateRequest(dto);

    const pool = getPool();
    const importedAt = dto.importedAt ?? new Date().toISOString();
    const batchInsert = await pool.query(
      `INSERT INTO ball_testing_import_batches (workbook_name, imported_by, imported_at)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [dto.workbookName.trim(), importedBy, importedAt]
    );
    const batchId = batchInsert.rows[0]['id'] as string;

    let formulationsCreated = 0;
    let formulationsUpdated = 0;
    let benchmarksCreated = 0;
    let benchmarksUpdated = 0;
    let benchmarkMetricsUpdated = 0;
    let rawSamplesStored = 0;
    let skippedSheets = 0;

    const results: BallTestingImportSheetResultDto[] = [];

    for (const sheet of dto.sheets) {
      const sampleCount = sheet.samples.length;
      const averages = buildAverages(sheet.samples);

      if (sheet.classification === 'skip' || sampleCount === 0) {
        skippedSheets += 1;

        const skippedInsert = await pool.query(
          `INSERT INTO ball_testing_import_sheets (batch_id, sheet_name, classification, sample_count, notes)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [batchId, sheet.sheetName, 'skip', sampleCount, sheet.notes ?? null]
        );

        results.push({
          importSheetId: skippedInsert.rows[0]['id'] as string,
          sheetName: sheet.sheetName,
          classification: 'skip',
          action: 'skipped',
          sampleCount,
          averages,
          benchmarkMetricsUpdated: [],
        });
        continue;
      }

      if (sheet.classification === 'formulation') {
        const { action, formulation } = await this.upsertFormulation(sheet, importedBy);
        const existing = await this.testResultRepo.findTestResultByFormulation(formulation.id);
        const savedResult = await this.testResultRepo.upsertTestResult(
          formulation.id,
          toAggregateTestResult(sheet.testedAt, averages, importedBy, sheet.notes)
        );
        await this.audit.log({
          tableName: 'test_results',
          recordId: savedResult.id,
          action: existing ? 'UPDATE' : 'INSERT',
          changedBy: importedBy,
          oldValues: existing as unknown as Record<string, unknown> | undefined,
          newValues: savedResult as unknown as Record<string, unknown>,
        });

        const importSheetId = await this.insertImportSheet({
          batchId,
          sheetName: sheet.sheetName,
          classification: 'formulation',
          formulationId: formulation.id,
          benchmarkId: null,
          sampleCount,
          benchmarkMetrics: [],
          notes: sheet.notes,
        });

        await this.insertSamples(importSheetId, sheet.samples, formulation.id, null);
        rawSamplesStored += sampleCount;

        if (action === 'created') {
          formulationsCreated += 1;
        } else {
          formulationsUpdated += 1;
        }

        results.push({
          importSheetId,
          sheetName: sheet.sheetName,
          classification: 'formulation',
          action,
          sampleCount,
          formulationId: formulation.id,
          averages,
          benchmarkMetricsUpdated: [],
        });
        continue;
      }

      const { benchmarkId, action, updatedMetrics } = await this.upsertBenchmark(sheet, averages);
      const importSheetId = await this.insertImportSheet({
        batchId,
        sheetName: sheet.sheetName,
        classification: 'benchmark',
        formulationId: null,
        benchmarkId,
        sampleCount,
        benchmarkMetrics: updatedMetrics,
        notes: sheet.notes,
      });

      await this.insertSamples(importSheetId, sheet.samples, null, benchmarkId);
      rawSamplesStored += sampleCount;
      benchmarkMetricsUpdated += updatedMetrics.length;

      if (action === 'created') {
        benchmarksCreated += 1;
      } else {
        benchmarksUpdated += 1;
      }

      results.push({
        importSheetId,
        sheetName: sheet.sheetName,
        classification: 'benchmark',
        action,
        sampleCount,
        benchmarkId,
        averages,
        benchmarkMetricsUpdated: updatedMetrics,
      });
    }

    return {
      batchId,
      workbookName: dto.workbookName.trim(),
      importedAt,
      totals: {
        processedSheets: results.length - skippedSheets,
        skippedSheets,
        formulationsCreated,
        formulationsUpdated,
        benchmarksCreated,
        benchmarksUpdated,
        benchmarkMetricsUpdated,
        rawSamplesStored,
      },
      sheets: results,
    };
  }

  private validateRequest(dto: BallTestingImportRequestDto): void {
    if (!dto.workbookName?.trim()) {
      throw new ValidationError('workbookName is required');
    }

    if (!Array.isArray(dto.sheets) || dto.sheets.length === 0) {
      throw new ValidationError('At least one sheet is required');
    }

    for (const sheet of dto.sheets) {
      if (!sheet.sheetName?.trim()) {
        throw new ValidationError('sheetName is required');
      }

      if (!Array.isArray(sheet.samples)) {
        throw new ValidationError(`Sheet ${sheet.sheetName} must include samples`);
      }

      if (sheet.classification === 'formulation' && !sheet.formulationName?.trim() && !sheet.formulationCode?.trim()) {
        throw new ValidationError(`Sheet ${sheet.sheetName} needs a formulation name or code`);
      }
    }
  }

  private async upsertFormulation(
    sheet: BallTestingImportRequestDto['sheets'][number],
    importedBy: string
  ): Promise<{ action: 'created' | 'updated'; formulation: Formulation }> {
    const formulationCode = sheet.formulationCode?.trim() || defaultFormulationCode(sheet.sheetName);
    const producedDate = sheet.testedAt?.split('T')[0];
    const existing = await this.formulationRepo.findByCode(formulationCode);

    if (!existing) {
      const created = await this.formulationRepo.create({
        formulationCode,
        producedDate,
        resinComponents: [
          {
            resinComponent: sheet.formulationName?.trim() || 'Imported Blend',
            percentComposition: 100,
            materialSupplier: 'Unknown Supplier',
          },
        ],
        createdBy: importedBy,
      });
      await this.audit.log({
        tableName: 'formulations',
        recordId: created.id,
        action: 'INSERT',
        changedBy: importedBy,
        newValues: created as unknown as Record<string, unknown>,
      });
      return { action: 'created', formulation: created };
    }

    const updated = await this.formulationRepo.update(existing.id, {
      producedDate: producedDate ?? existing.producedDate,
    });
    const finalFormulation = updated ?? existing;
    await this.audit.log({
      tableName: 'formulations',
      recordId: existing.id,
      action: 'UPDATE',
      changedBy: importedBy,
      oldValues: existing as unknown as Record<string, unknown>,
      newValues: finalFormulation as unknown as Record<string, unknown>,
    });
    return { action: 'updated', formulation: finalFormulation };
  }

  private async upsertBenchmark(
    sheet: BallTestingImportRequestDto['sheets'][number],
    averages: BallTestingMetricAveragesDto
  ): Promise<{ benchmarkId: string; action: 'created' | 'updated'; updatedMetrics: string[] }> {
    const inferred = inferBenchmarkIdentity(sheet.sheetName);
    const existingById = sheet.benchmarkId ? await this.benchmarkRepo.findById(sheet.benchmarkId) : null;
    const existingByName = !existingById && (sheet.benchmarkName?.trim() || sheet.sheetName.trim())
      ? await this.benchmarkRepo.findByName(sheet.benchmarkName?.trim() || sheet.sheetName.trim())
      : null;

    const benchmark = existingById ?? existingByName ?? await this.benchmarkRepo.createProfile({
      name: sheet.benchmarkName?.trim() || inferred.name,
      description: sheet.benchmarkDescription?.trim() || `Imported from ${sheet.sheetName}`,
      ballBrand: sheet.ballBrand?.trim() || inferred.brand,
      ballModel: sheet.ballModel?.trim() || inferred.model,
      isActive: true,
    });

    const action: 'created' | 'updated' = existingById || existingByName ? 'updated' : 'created';
    const updatedMetrics: string[] = [];

    if (sheet.syncBenchmarkMetrics !== false) {
      for (const metric of BENCHMARK_METRIC_CONFIG) {
        const value = averages[metric.averageKey];
        if (value == null) {
          continue;
        }

        await this.benchmarkService.upsertMetric(benchmark.id, metric.metricName, {
          metricCategory: metric.metricCategory,
          targetValue: value,
          unit: metric.unit,
        });
        updatedMetrics.push(metric.metricName);
      }
    }

    return {
      benchmarkId: benchmark.id,
      action,
      updatedMetrics,
    };
  }

  private async insertImportSheet(input: {
    batchId: string;
    sheetName: string;
    classification: BallTestingSheetClassification;
    formulationId: string | null;
    benchmarkId: string | null;
    sampleCount: number;
    benchmarkMetrics: string[];
    notes?: string;
  }): Promise<string> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO ball_testing_import_sheets
         (batch_id, sheet_name, classification, formulation_id, benchmark_id, sample_count, benchmark_metrics, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        input.batchId,
        input.sheetName,
        input.classification,
        input.formulationId,
        input.benchmarkId,
        input.sampleCount,
        JSON.stringify(input.benchmarkMetrics),
        input.notes ?? null,
      ]
    );

    return result.rows[0]['id'] as string;
  }

  private async insertSamples(
    importSheetId: string,
    samples: BallTestingSampleDto[],
    formulationId: string | null,
    benchmarkId: string | null
  ): Promise<void> {
    const pool = getPool();

    for (const sample of samples) {
      await pool.query(
        `INSERT INTO ball_testing_import_samples
           (import_sheet_id, formulation_id, benchmark_id, sample_label, weight_g, compression_lbf, compression_kg,
            stretch_quarter_inch_lbf, full_stretch_max_lbf, hardness_shore_d, wall_thickness_mm, diameter_mm, drop_test_cm)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          importSheetId,
          formulationId,
          benchmarkId,
          sample.sampleLabel,
          sample.weightG ?? null,
          sample.compressionLbf ?? null,
          sample.compressionLbf != null ? round4(sample.compressionLbf * LBF_TO_KGF) : null,
          sample.stretchQuarterInchLbf ?? null,
          sample.fullStretchMaxLbf ?? null,
          sample.hardnessShoreD ?? null,
          sample.wallThicknessMm ?? null,
          sample.diameterMm ?? null,
          sample.dropTestCm ?? null,
        ]
      );
    }
  }
}
