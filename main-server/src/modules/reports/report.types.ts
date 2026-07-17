export interface ReportRecord {
  [key: string]: unknown;
  id?: string;
}

export interface ReportListQuery {
  runId?: string;
  search?: string;
  status?: string;
}

export interface ReportExport {
  body: Buffer | string;
  contentType: string;
  filename: string;
}

export interface ReportSnapshot {
  schemaVersion: 2;
  benchmarkComparison: ReportRecord[];
  executiveSummary: ReportRecord;
  formulationRecipe: ReportRecord[];
  historicalComparison: ReportRecord[];
  keyRisks: string[];
  labTestResults: ReportRecord[];
  manufacturingParameters: ReportRecord;
  processSetup: ReportRecord;
  metricBreakdown: ReportRecord[];
  recommendations: string[];
  recommendationsPlaceholder: string;
  scoreReports: ReportRecord[];
  trendAnalysis: ReportRecord[];
}
