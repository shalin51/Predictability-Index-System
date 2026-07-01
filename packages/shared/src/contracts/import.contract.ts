import type { FormulationStatus } from '../types/domain';

export type BallTestingSheetClassification = 'benchmark' | 'formulation' | 'skip';

export interface BallTestingSampleDto {
  sampleLabel: string;
  weightG?: number;
  compressionLbf?: number;
  stretchQuarterInchLbf?: number;
  fullStretchMaxLbf?: number;
  hardnessShoreD?: number;
  wallThicknessMm?: number;
  diameterMm?: number;
  dropTestCm?: number;
}

export interface BallTestingMetricAveragesDto {
  weightG?: number;
  compressionLbf?: number;
  compressionKg?: number;
  stretchQuarterInchLbf?: number;
  fullStretchMaxLbf?: number;
  hardnessShoreD?: number;
  wallThicknessMm?: number;
  diameterMm?: number;
  dropTestCm?: number;
}

export interface BallTestingSheetImportDto {
  sheetName: string;
  classification: BallTestingSheetClassification;
  benchmarkId?: string;
  benchmarkName?: string;
  benchmarkDescription?: string;
  ballBrand?: string;
  ballModel?: string;
  syncBenchmarkMetrics?: boolean;
  formulationCode?: string;
  formulationName?: string;
  formulationStatus?: FormulationStatus;
  testedAt?: string;
  notes?: string;
  samples: BallTestingSampleDto[];
}

export interface BallTestingImportRequestDto {
  workbookName: string;
  importedAt?: string;
  sheets: BallTestingSheetImportDto[];
}

export interface BallTestingImportSheetResultDto {
  importSheetId: string;
  sheetName: string;
  classification: BallTestingSheetClassification;
  action: 'created' | 'updated' | 'skipped';
  sampleCount: number;
  formulationId?: string;
  benchmarkId?: string;
  averages: BallTestingMetricAveragesDto;
  benchmarkMetricsUpdated: string[];
}

export interface BallTestingImportResultDto {
  batchId: string;
  workbookName: string;
  importedAt: string;
  totals: {
    processedSheets: number;
    skippedSheets: number;
    formulationsCreated: number;
    formulationsUpdated: number;
    benchmarksCreated: number;
    benchmarksUpdated: number;
    benchmarkMetricsUpdated: number;
    rawSamplesStored: number;
  };
  sheets: BallTestingImportSheetResultDto[];
}
