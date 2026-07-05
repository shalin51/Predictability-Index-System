import { NotFoundError } from '../../../errors/app-error';
import type { ReportRepository } from '../repositories/report.repository';
import type { ReportExport, ReportRecord, ReportSnapshot } from '../report.types';
import { validateReportId } from '../validators/report.validator';

export class ReportExportService {
  constructor(private readonly repo: ReportRepository) {}

  async csv(reportId: string): Promise<ReportExport> {
    const report = await this.requireReport(reportId);
    const snapshot = report['reportSnapshot'] as ReportSnapshot;
    const rows = [
      ['Section', 'Name', 'Value', 'Status', 'Notes'],
      ...Object.entries(snapshot.executiveSummary).map(([key, value]) => ['Executive Summary', key, this.value(value), '', '']),
      ...snapshot.benchmarkComparison.map((row) => [
        'Benchmark Comparison',
        this.value(row['benchmarkName']),
        this.value(row['similarityScore']),
        this.value(row['status']),
        `PI ${this.value(row['predictabilityIndex'])}; readiness ${this.value(row['productionReadinessScore'])}`,
      ]),
      ...snapshot.metricBreakdown.map((row) => [
        'Metric Breakdown',
        this.value(row['metricName']),
        this.value(row['runMeanValue']),
        this.value(row['trafficLight']),
        `Target ${this.value(row['benchmarkTargetMean'])}; range ${this.value(row['range'])}; risk ${this.value(row['risk'])}`,
      ]),
      ...snapshot.keyRisks.map((risk) => ['Key Risks', risk, '', '', '']),
      ...snapshot.formulationRecipe.map((row) => [
        'Formulation Recipe',
        this.value(row['material']),
        this.value(row['percent']),
        '',
        `Supplier ${this.value(row['supplier'])}; lot ${this.value(row['lot'])}`,
      ]),
    ];

    return {
      body: rows.map((row) => row.map((cell) => this.csvCell(cell)).join(',')).join('\n'),
      contentType: 'text/csv; charset=utf-8',
      filename: `${this.safeName(String(report['reportName']))}.csv`,
    };
  }

  async pdf(reportId: string): Promise<ReportExport> {
    const report = await this.requireReport(reportId);
    const snapshot = report['reportSnapshot'] as ReportSnapshot;
    const lines = [
      String(report['reportName']),
      '',
      'Executive Summary',
      ...Object.entries(snapshot.executiveSummary).map(([key, value]) => `${this.title(key)}: ${this.value(value)}`),
      '',
      'Benchmark Similarity',
      ...snapshot.benchmarkComparison.map((row) => `${this.value(row['benchmarkName'])}: similarity ${this.value(row['similarityScore'])}, PI ${this.value(row['predictabilityIndex'])}, readiness ${this.value(row['productionReadinessScore'])}, ${this.value(row['status'])}`),
      '',
      'Metric Breakdown',
      ...snapshot.metricBreakdown.map((row) => `${this.value(row['metricName'])}: run ${this.value(row['runMeanValue'])}, target ${this.value(row['benchmarkTargetMean'])}, range ${this.value(row['range'])}, score ${this.value(row['metricScore'])}, risk ${this.value(row['risk'])}`),
      '',
      'Key Risks',
      ...(snapshot.keyRisks.length ? snapshot.keyRisks : ['No key risks detected']),
      '',
      'Recommendations',
      ...(snapshot.recommendations.length ? snapshot.recommendations : [snapshot.recommendationsPlaceholder]),
    ];

    return {
      body: this.buildPdf(lines),
      contentType: 'application/pdf',
      filename: `${this.safeName(String(report['reportName']))}.pdf`,
    };
  }

  private async requireReport(reportId: string): Promise<ReportRecord> {
    validateReportId(reportId);
    const report = await this.repo.findById(reportId);
    if (!report) throw new NotFoundError(`Report ${reportId}`);
    return report;
  }

  private buildPdf(lines: string[]): Buffer {
    const wrapped = lines.flatMap((line) => this.wrap(line, 96)).slice(0, 52);
    const content = [
      'BT',
      '/F1 10 Tf',
      '50 760 Td',
      '14 TL',
      ...wrapped.map((line) => `(${this.pdfEscape(line)}) Tj T*`),
      'ET',
    ].join('\n');
    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
      '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
      `5 0 obj << /Length ${Buffer.byteLength(content)} >> stream\n${content}\nendstream endobj`,
    ];
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (const object of objects) {
      offsets.push(Buffer.byteLength(pdf));
      pdf += `${object}\n`;
    }
    const xrefOffset = Buffer.byteLength(pdf);
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (const offset of offsets.slice(1)) {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(pdf, 'binary');
  }

  private csvCell(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
  }

  private pdfEscape(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  private safeName(value: string): string {
    return value.replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '') || 'report';
  }

  private title(value: string): string {
    return value.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
  }

  private value(value: unknown): string {
    if (value === null || value === undefined || value === '') return '-';
    return String(value);
  }

  private wrap(value: string, max: number): string[] {
    if (value.length <= max) return [value];
    const words = value.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      if (`${current} ${word}`.trim().length > max) {
        lines.push(current);
        current = word;
      } else {
        current = `${current} ${word}`.trim();
      }
    }
    if (current) lines.push(current);
    return lines;
  }
}
