import * as XLSX from 'xlsx';
import type {
  BallTestingMetricAveragesDto,
  BallTestingSampleDto,
  BallTestingSheetClassification,
  BallTestingSheetImportDto,
} from '@amfpi/shared';

export interface ParsedWorkbookSheet extends BallTestingSheetImportDto {
  averages: BallTestingMetricAveragesDto;
  hasData: boolean;
}

export interface ParsedWorkbook {
  workbookName: string;
  sheets: ParsedWorkbookSheet[];
}

const BENCHMARK_SHEETS = new Set(['lt48', 'selkirk', 'x40', 'selkirkpros2']);

function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const match = value.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return undefined;
  }

  return Number(match[0]);
}

function normalizeLabel(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeSheetKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function average(values: Array<number | undefined>): number | undefined {
  const valid = values.filter((value): value is number => typeof value === 'number' && !Number.isNaN(value));
  if (valid.length === 0) {
    return undefined;
  }

  return Math.round((valid.reduce((sum, value) => sum + value, 0) / valid.length) * 10_000) / 10_000;
}

function inferClassification(sheetName: string, hasData: boolean): BallTestingSheetClassification {
  if (!hasData) {
    return 'skip';
  }

  return BENCHMARK_SHEETS.has(normalizeSheetKey(sheetName)) ? 'benchmark' : 'formulation';
}

function inferBenchmarkDefaults(sheetName: string): Pick<
  BallTestingSheetImportDto,
  'benchmarkName' | 'ballBrand' | 'ballModel'
> {
  if (/^x[-\s]?40$/i.test(sheetName)) {
    return {
      benchmarkName: 'Franklin X-40',
      ballBrand: 'Franklin Sports',
      ballModel: 'X-40',
    };
  }

  if (/^lt48$/i.test(sheetName)) {
    return {
      benchmarkName: 'LT48',
      ballBrand: 'LT',
      ballModel: '48',
    };
  }

  const parts = sheetName.trim().split(/\s+/);
  return {
    benchmarkName: sheetName.trim(),
    ballBrand: parts[0] ?? sheetName.trim(),
    ballModel: parts.slice(1).join(' ') || sheetName.trim(),
  };
}

function inferFormulationCode(sheetName: string): string {
  const normalized = sheetName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'IMPORTED-FORMULATION';
}

function applyMetric(sample: BallTestingSampleDto, label: string, value: number | undefined): BallTestingSampleDto {
  if (value == null) {
    return sample;
  }

  if (label === 'weight') {
    return { ...sample, weightG: value };
  }

  if (label.includes('compression')) {
    return { ...sample, compressionLbf: value };
  }

  if (label.includes('stretch @ 1/4')) {
    return { ...sample, stretchQuarterInchLbf: value };
  }

  if (label.includes('full stretch')) {
    return { ...sample, fullStretchMaxLbf: value };
  }

  if (label === 'hardness') {
    return { ...sample, hardnessShoreD: value };
  }

  if (label.includes('wall thickness')) {
    return { ...sample, wallThicknessMm: value };
  }

  if (label === 'diameter') {
    return { ...sample, diameterMm: value };
  }

  if (label.includes('drop test')) {
    return { ...sample, dropTestCm: value };
  }

  return sample;
}

function buildAverages(samples: BallTestingSampleDto[]): BallTestingMetricAveragesDto {
  const compressionLbf = average(samples.map((sample) => sample.compressionLbf));
  return {
    weightG: average(samples.map((sample) => sample.weightG)),
    compressionLbf,
    compressionKg: compressionLbf != null ? Math.round(compressionLbf * 0.45359237 * 10_000) / 10_000 : undefined,
    stretchQuarterInchLbf: average(samples.map((sample) => sample.stretchQuarterInchLbf)),
    fullStretchMaxLbf: average(samples.map((sample) => sample.fullStretchMaxLbf)),
    hardnessShoreD: average(samples.map((sample) => sample.hardnessShoreD)),
    wallThicknessMm: average(samples.map((sample) => sample.wallThicknessMm)),
    diameterMm: average(samples.map((sample) => sample.diameterMm)),
    dropTestCm: average(samples.map((sample) => sample.dropTestCm)),
  };
}

export async function parseWorkbook(file: File): Promise<ParsedWorkbook> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const sheets = workbook.SheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Array<string | number | null>>(worksheet, {
      header: 1,
      blankrows: false,
    });

    const header = rows[0] ?? [];
    const sampleLabels = header.slice(1, 4).map((value, index) => String(value ?? `Sample ${index + 1}`).trim());
    let samples: BallTestingSampleDto[] = sampleLabels.map((sampleLabel, index) => ({
      sampleLabel: sampleLabel || `Sample ${index + 1}`,
    }));

    for (const row of rows.slice(1)) {
      const label = normalizeLabel(row[0]);
      for (let index = 0; index < sampleLabels.length; index += 1) {
        samples[index] = applyMetric(samples[index], label, parseNumber(row[index + 1]));
      }
    }

    const hasData = samples.some((sample) => (
      sample.weightG != null
      || sample.compressionLbf != null
      || sample.stretchQuarterInchLbf != null
      || sample.fullStretchMaxLbf != null
      || sample.hardnessShoreD != null
      || sample.wallThicknessMm != null
      || sample.diameterMm != null
      || sample.dropTestCm != null
    ));
    const classification = inferClassification(sheetName, hasData);
    const averages = buildAverages(samples);
    const benchmarkDefaults = inferBenchmarkDefaults(sheetName);

    return {
      sheetName,
      classification,
      benchmarkId: undefined,
      benchmarkName: benchmarkDefaults.benchmarkName,
      ballBrand: benchmarkDefaults.ballBrand,
      ballModel: benchmarkDefaults.ballModel,
      syncBenchmarkMetrics: true,
      formulationCode: inferFormulationCode(sheetName),
      formulationName: sheetName,
      formulationStatus: 'testing',
      testedAt: '',
      notes: '',
      samples,
      averages,
      hasData,
    } satisfies ParsedWorkbookSheet;
  });

  return {
    workbookName: file.name,
    sheets,
  };
}
