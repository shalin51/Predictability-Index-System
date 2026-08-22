import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { ReportExportService } from '../services/reportExport.service';

const report = {
  id: '50000001-0000-0000-0000-000000000001',
  reportName: 'RUN-001 Score Report',
  generatedAt: '2026-08-19T12:00:00.000Z',
  reportSnapshot: {
    schemaVersion: 2,
    executiveSummary: { bestMatch: 'Benchmark A', predictabilityIndex: 88, trafficLight: 'green' },
    benchmarkComparison: [{ benchmarkName: 'Benchmark A', similarityScore: 91, predictabilityIndex: 88, productionReadinessScore: 93, status: 'green' }],
    metricBreakdown: [{ metricName: 'Tensile Strength', category: 'performance', runMeanValue: 12, benchmarkTargetMean: 11, range: '10 - 14', metricScore: 95, trafficLight: 'green', risk: 'none' }],
    labTestResults: [{ sampleCode: 'S-01', metricName: 'Tensile Strength', category: 'performance', value: 12, unit: 'MPa', resultType: 'sample_result' }],
    processSetup: { values: [{ section: 'Barrel', displayName: 'Melt Temperature', positionLabel: 'Zone 1', setpointNumeric: 220, actualNumeric: 221, unit: 'C' }] },
    formulationRecipe: [{ materialCode: 'MAT-001', material: 'Material A', supplier: 'Supplier A', percent: 100, basis: 'weight_percent' }],
    keyRisks: [], recommendations: ['Proceed to production review.'], recommendationsPlaceholder: 'No recommendation',
    historicalComparison: [], scoreReports: [], trendAnalysis: [], manufacturingParameters: {},
  },
};

describe('ReportExportService', () => {
  const service = new ReportExportService({ findById: async () => report } as never);
  const id = String(report.id);

  it('exports the report as a workbook with operational report tabs', async () => {
    const file = await service.xlsx(id);
    const workbook = XLSX.read(file.body as Buffer, { type: 'buffer' });

    expect(file.filename).toMatch(/^RUN-001_Score_Report-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.xlsx$/);
    expect(workbook.SheetNames).toContain('Database Relations');
    expect(workbook.SheetNames).toContain('Materials');
    expect(workbook.SheetNames).toContain('Material Properties');
    expect(XLSX.utils.sheet_to_json(workbook.Sheets['Benchmark Comparison']!, { header: 1 })).toContainEqual([
      'Benchmark A', 91, 88, 93, 'green',
    ]);
  });

  it('creates a paginated PDF without truncating long reports', async () => {
    const longReport = {
      ...report,
      reportSnapshot: { ...report.reportSnapshot, keyRisks: Array.from({ length: 60 }, (_, index) => `Risk ${index + 1}`) },
    };
    const longService = new ReportExportService({ findById: async () => longReport } as never);
    const file = await longService.pdf(id);

    expect(file.contentType).toBe('application/pdf');
    expect((file.body as Buffer).toString('binary')).toContain('/Count 2');
  });
});
