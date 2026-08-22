import { NotFoundError } from '../../../errors/app-error';
import * as XLSX from 'xlsx';
import type { ReportRepository } from '../repositories/report.repository';
import type { ReportExport, ReportRecord, ReportSnapshot } from '../report.types';
import { validateReportId } from '../validators/report.validator';

export class ReportExportService {
  constructor(private readonly repo: ReportRepository) {}

  async databaseXlsx(category?: string): Promise<ReportExport> {
    const workbook = XLSX.utils.book_new();
    const dataset = await this.repo.exportAllDataset();
    const exportDefinition = this.databaseExport(category, Object.keys(dataset));
    const selectedDataset = Object.fromEntries(
      exportDefinition.sheets.map((sheet) => [sheet, dataset[sheet] ?? []])
    ) as Record<string, ReportRecord[]>;
    this.addRelationshipGuide(workbook, selectedDataset);
    this.addDatabaseSheets(workbook, selectedDataset);
    return {
      body: XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: this.timestampedFilename(exportDefinition.filename, 'xlsx'),
    };
  }

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
      ...this.processValues(snapshot).map((row) => [
        'Process Setup',
        this.value(row['displayName']),
        this.value(row['actualNumeric'] ?? row['actualText'] ?? row['actualDate']),
        '',
        `Section ${this.value(row['section'])}; position ${this.value(row['positionLabel'] ?? row['positionIndex'])}; setpoint ${this.value(row['setpointNumeric'] ?? row['setpointText'] ?? row['setpointDate'])}; unit ${this.value(row['unit'])}`,
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
      filename: this.timestampedFilename(this.safeName(String(report['reportName'])), 'csv'),
    };
  }

  async xlsx(reportId: string): Promise<ReportExport> {
    const report = await this.requireReport(reportId);
    const snapshot = report['reportSnapshot'] as ReportSnapshot;
    const workbook = XLSX.utils.book_new();
    const title = String(report['reportName']);

    this.addSheet(workbook, 'Executive Scorecard', [
      ['Report', title],
      ['Generated At', this.value(report['generatedAt'])],
      [],
      ['Measure', 'Value'],
      ...Object.entries(snapshot.executiveSummary).map(([key, value]) => [this.title(key), this.value(value)]),
      [],
      ['Key Risks'],
      ...(snapshot.keyRisks.length ? snapshot.keyRisks.map((risk) => [risk]) : [['No key risks detected']]),
      [],
      ['Recommendations'],
      ...(snapshot.recommendations.length ? snapshot.recommendations.map((recommendation) => [recommendation]) : [[snapshot.recommendationsPlaceholder]]),
    ]);
    this.addSheet(workbook, 'Benchmark Comparison', [
      ['Benchmark', 'Similarity Score', 'Predictability Index', 'Production Readiness', 'Status'],
      ...snapshot.benchmarkComparison.map((row) => [
        this.value(row['benchmarkName']), row['similarityScore'] ?? '', row['predictabilityIndex'] ?? '',
        row['productionReadinessScore'] ?? '', this.value(row['status']),
      ]),
    ]);
    this.addSheet(workbook, 'Metric Risk Register', [
      ['Metric', 'Category', 'Run Mean', 'Benchmark Target', 'Acceptable Range', 'Score', 'Status', 'Risk', 'Risk Note'],
      ...snapshot.metricBreakdown.map((row) => [
        this.value(row['metricName']), this.value(row['category']), row['runMeanValue'] ?? '', row['benchmarkTargetMean'] ?? '',
        this.value(row['range']), row['metricScore'] ?? '', this.value(row['trafficLight']), this.value(row['risk']), this.value(row['riskNote']),
      ]),
    ]);
    this.addSheet(workbook, 'Lab Results', [
      ['Sample', 'Metric', 'Category', 'Condition', 'Value', 'Unit', 'Recorded At', 'Result Type'],
      ...snapshot.labTestResults.map((row) => [
        this.value(row['sampleCode']), this.value(row['metricName']), this.value(row['category']), this.value(row['conditionName']),
        row['value'] ?? row['meanValue'] ?? '', this.value(row['unit']), this.value(row['recordedAt'] ?? row['generatedAt']), this.value(row['resultType'] ?? row['sourceTable']),
      ]),
    ]);
    this.addSheet(workbook, 'Process Setup', [
      ['Section', 'Parameter', 'Position', 'Setpoint', 'Actual', 'Unit', 'Tolerance Min', 'Tolerance Max', 'Notes'],
      ...this.processValues(snapshot).map((row) => [
        this.value(row['section']), this.value(row['displayName']), this.value(row['positionLabel'] ?? row['positionIndex']),
        row['setpointNumeric'] ?? row['setpointText'] ?? row['setpointDate'] ?? '', row['actualNumeric'] ?? row['actualText'] ?? row['actualDate'] ?? '',
        this.value(row['unit']), row['toleranceMin'] ?? '', row['toleranceMax'] ?? '', this.value(row['notes']),
      ]),
    ]);
    this.addSheet(workbook, 'Formulation Recipe', [
      ['Material Code', 'Material', 'Supplier', 'Lot', 'Percent', 'Basis'],
      ...snapshot.formulationRecipe.map((row) => [
        this.value(row['materialCode']), this.value(row['material']), this.value(row['supplier']), this.value(row['lot']), row['percent'] ?? '', this.value(row['basis']),
      ]),
    ]);
    const dataset = await this.dataset(report, snapshot);
    this.addRelationshipGuide(workbook, dataset);
    this.addDatabaseSheets(workbook, dataset);

    return {
      body: XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: this.timestampedFilename(this.safeName(title), 'xlsx'),
    };
  }

  async pdf(reportId: string): Promise<ReportExport> {
    const report = await this.requireReport(reportId);
    const snapshot = report['reportSnapshot'] as ReportSnapshot;
    const lines = [
      `Report: ${String(report['reportName'])}`,
      `Generated: ${this.value(report['generatedAt'])}`,
      '', 'Executive Summary',
      ...Object.entries(snapshot.executiveSummary).map(([key, value]) => `${this.title(key)}: ${this.value(value)}`),
      '',
      'Benchmark Similarity',
      ...snapshot.benchmarkComparison.map((row) => `${this.value(row['benchmarkName'])}: similarity ${this.value(row['similarityScore'])}, PI ${this.value(row['predictabilityIndex'])}, readiness ${this.value(row['productionReadinessScore'])}, ${this.value(row['status'])}`),
      '',
      'Metric Breakdown',
      ...snapshot.metricBreakdown.map((row) => `${this.value(row['metricName'])}: run ${this.value(row['runMeanValue'])}, target ${this.value(row['benchmarkTargetMean'])}, range ${this.value(row['range'])}, score ${this.value(row['metricScore'])}, risk ${this.value(row['risk'])}`),
      '',
      'Process Setup',
      ...this.processValues(snapshot).map((row) => `${this.value(row['displayName'])} ${this.value(row['positionLabel'] ?? row['positionIndex'])}: setpoint ${this.value(row['setpointNumeric'] ?? row['setpointText'] ?? row['setpointDate'])}, actual ${this.value(row['actualNumeric'] ?? row['actualText'] ?? row['actualDate'])} ${this.value(row['unit'])}`),
      '',
      'Key Risks',
      ...(snapshot.keyRisks.length ? snapshot.keyRisks : ['No key risks detected']),
      '',
      'Recommendations',
      ...(snapshot.recommendations.length ? snapshot.recommendations : [snapshot.recommendationsPlaceholder]),
      '',
      'Formulation Recipe',
      ...snapshot.formulationRecipe.map((row) => `${this.value(row['material'])}: ${this.value(row['percent'])}% (${this.value(row['supplier'])}, lot ${this.value(row['lot'])})`),
      '',
      'Lab Results',
      ...snapshot.labTestResults.map((row) => `${this.value(row['sampleCode'])} - ${this.value(row['metricName'])}: ${this.value(row['value'] ?? row['meanValue'])} ${this.value(row['unit'])} ${this.value(row['conditionName'])}`),
    ];

    return {
      body: this.buildPdf(lines),
      contentType: 'application/pdf',
      filename: this.timestampedFilename(this.safeName(String(report['reportName'])), 'pdf'),
    };
  }

  private async requireReport(reportId: string): Promise<ReportRecord> {
    validateReportId(reportId);
    const report = await this.repo.findById(reportId);
    if (!report) throw new NotFoundError(`Report ${reportId}`);
    return report;
  }

  private buildPdf(lines: string[]): Buffer {
    const wrapped = lines.flatMap((line) => this.wrap(this.ascii(line), 96));
    const pages = this.chunk(wrapped, 48);
    const fontObject = 3 + pages.length * 2;
    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      `2 0 obj << /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(' ')}] /Count ${pages.length} >> endobj`,
    ];
    pages.forEach((page, index) => {
      const pageObject = 3 + index * 2;
      const contentObject = pageObject + 1;
      const content = ['BT', '/F1 10 Tf', '50 760 Td', '14 TL', ...page.map((line) => `(${this.pdfEscape(line)}) Tj T*`), 'ET'].join('\n');
      objects.push(`${pageObject} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObject} 0 R >> >> /Contents ${contentObject} 0 R >> endobj`);
      objects.push(`${contentObject} 0 obj << /Length ${Buffer.byteLength(content)} >> stream\n${content}\nendstream endobj`);
    });
    objects.push(`${fontObject} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`);
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

  private timestampedFilename(name: string, extension: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${name}-${timestamp}.${extension}`;
  }

  private title(value: string): string {
    return value.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
  }

  private value(value: unknown): string {
    if (value === null || value === undefined || value === '') return '-';
    return String(value);
  }

  private addSheet(workbook: XLSX.WorkBook, name: string, rows: unknown[][]): void {
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet['!cols'] = rows[0]?.map((_, columnIndex) => ({
      wch: Math.min(42, Math.max(14, ...rows.map((row) => String(row[columnIndex] ?? '').length + 2))),
    })) ?? [];
    XLSX.utils.book_append_sheet(workbook, worksheet, name);
  }

  private async dataset(report: ReportRecord, snapshot: ReportSnapshot): Promise<Record<string, ReportRecord[]>> {
    const exportDataset = (this.repo as Partial<ReportRepository>).exportDataset;
    if (exportDataset) return exportDataset.call(this.repo, String(report['id']));

    // Keeps exports useful for older report repositories and lightweight tests.
    return {
      Formulations: [],
      Materials: snapshot.formulationRecipe.map((row, index) => ({
        id: String(row['materialId'] ?? `snapshot-material-${index + 1}`),
        materialCode: row['materialCode'], materialName: row['material'],
      })),
      Suppliers: [],
      'Property Definitions': [],
      'Material Properties': [],
      'Supplier Materials': [],
      'Material Lots': [],
      'Formulation Components': [],
      'Production Runs': [],
    };
  }

  private addRelationshipGuide(workbook: XLSX.WorkBook, dataset: Record<string, ReportRecord[]>): void {
    const rows: unknown[][] = [
      ['Database export', 'This workbook contains the report and its connected source records. Blue underlined IDs open the related row.'],
      [],
      ['Sheet', 'Primary key', 'Relationships'],
      ['Formulations', 'id', 'Referenced by Production Runs and Formulation Components'],
      ['Materials', 'id', 'materialProperties opens Material Properties; referenced by Supplier Materials and Formulation Components'],
      ['Suppliers', 'id', 'Referenced by Materials, Supplier Materials, and Formulation Components'],
      ['Property Definitions', 'id', 'Referenced by Material Properties'],
      ['Material Properties', 'id', 'materialId → Materials; propertyDefinitionId → Property Definitions'],
      ['Supplier Materials', 'id', 'supplierId → Suppliers; materialId → Materials'],
      ['Material Lots', 'id', 'supplierMaterialId → Supplier Materials'],
      ['Formulation Components', 'id', 'formulationId → Formulations; materialId → Materials; supplierId → Suppliers; materialLotId → Material Lots'],
      ['Production Runs', 'id', 'formulationId → Formulations'],
      ['Machines', 'id', 'Referenced by Production Runs, Machine Capabilities, and Process Setup Revisions'],
      ['Machine Capabilities', 'id', 'machineId → Machines'],
      ['Molds', 'id', 'Referenced by Production Runs, Mold Zones, and Process Setup Revisions'],
      ['Mold Zones', 'id', 'moldId → Molds'],
      ['Process Setup Revisions', 'id', 'machineId → Machines; moldId → Molds; formulationId → Formulations'],
      ['Process Setup Parameters', 'id', 'processSetupRevisionId → Process Setup Revisions; parameterDefinitionId → Process Parameter Definitions'],
      ['Production Run Process Values', 'id', 'productionRunId → Production Runs; parameterDefinitionId → Process Parameter Definitions'],
      ['Production Run Material Lots', 'id', 'productionRunId → Production Runs; formulationComponentId → Formulation Components; materialLotId → Material Lots'],
      ['Production Run Notes', 'id', 'productionRunId → Production Runs'],
      ['Samples', 'id', 'productionRunId → Production Runs'],
      ['Sample Test Results', 'id', 'sampleId → Samples; metricId → Metric Definitions; testMethodId → Test Method Definitions'],
      ['Environmental Test Results', 'id', 'sampleId → Samples; metricId → Metric Definitions; testConditionId → Test Condition Definitions; testMethodId → Test Method Definitions'],
      ['Sample Observations', 'id', 'sampleId → Samples'],
      ['Sample Ratings', 'id', 'sampleId → Samples; metricId → Metric Definitions'],
      [],
      ['Record counts', '', ''],
      ...Object.entries(dataset).map(([sheet, records]) => [sheet, records.length, '']),
    ];
    this.addSheet(workbook, 'Database Relations', rows);
  }

  private databaseExport(category?: string, allSheets: string[] = []): { filename: string; sheets: string[] } {
    const exports: Record<string, { filename: string; sheets: string[] }> = {
      'material-properties': { filename: 'material-properties', sheets: ['Material Properties', 'Property Definitions'] },
      'material-suppliers': { filename: 'material-suppliers', sheets: ['Suppliers', 'Supplier Materials'] },
      'material-details': { filename: 'material-details', sheets: ['Materials', 'Material Lots'] },
      'materials-with-properties': { filename: 'materials-with-properties', sheets: ['Materials', 'Material Properties', 'Property Definitions'] },
      'machine-specifications': { filename: 'machine-specifications', sheets: ['Machines', 'Machine Capabilities'] },
      'mold-template': { filename: 'mold-template', sheets: ['Molds', 'Mold Zones'] },
      'machine-template': { filename: 'machine-template', sheets: ['Process Parameter Definitions', 'Process Setup Revisions', 'Process Setup Parameters'] },
      machines: { filename: 'machines', sheets: ['Machines'] },
      'formulation-details': { filename: 'formulation-details', sheets: ['Formulations'] },
      'formulation-materials': { filename: 'formulation-materials', sheets: ['Formulation Components', 'Materials', 'Suppliers', 'Material Lots'] },
      'formulation-benchmarks': { filename: 'formulation-benchmarks', sheets: ['Benchmark Profiles', 'Benchmark Metric Targets'] },
      'formulation-templates': { filename: 'formulation-templates', sheets: ['Formulations', 'Formulation Components'] },
      'product-run-details': { filename: 'product-run-details', sheets: ['Production Runs', 'Samples'] },
      'product-run-process-values': { filename: 'product-run-process-values', sheets: ['Production Run Process Values', 'Process Parameter Definitions'] },
      'product-run-material-lots': { filename: 'product-run-material-lots', sheets: ['Production Run Material Lots', 'Material Lots', 'Supplier Materials'] },
      'product-run-notes': { filename: 'product-run-notes', sheets: ['Production Run Notes'] },
      'testing-specifications': { filename: 'testing-specifications', sheets: ['Metric Definitions'] },
      'testing-methods': { filename: 'testing-methods', sheets: ['Test Method Definitions'] },
      'testing-conditions': { filename: 'testing-conditions', sheets: ['Test Condition Definitions'] },
      'testing-results': { filename: 'testing-results', sheets: ['Sample Test Results', 'Environmental Test Results', 'Sample Observations', 'Sample Ratings', 'Samples'] },
    };
    return exports[category ?? ''] ?? { filename: 'predictability-index-database', sheets: allSheets };
  }

  private addDatabaseSheets(workbook: XLSX.WorkBook, dataset: Record<string, ReportRecord[]>): void {
    const rowsBySheet = new Map<string, Map<string, number>>();
    for (const [sheet, records] of Object.entries(dataset)) {
      rowsBySheet.set(sheet, new Map(records.map((record, index) => [String(record['id']), index + 2])));
    }
    for (const [sheet, records] of Object.entries(dataset)) {
      const headers = this.databaseHeaders(records);
      const worksheet = XLSX.utils.aoa_to_sheet([
        headers,
        ...records.map((record) => headers.map((header) => this.databaseValue(record[header]))),
      ]);
      records.forEach((record, rowIndex) => headers.forEach((header, columnIndex) => {
        const targetSheet = this.relatedSheet(header);
        const targetId = header === 'materialProperties'
          ? dataset['Material Properties']?.find((property) => property['materialId'] === record['id'])?.['id']
          : record[header];
        const targetRow = targetSheet ? rowsBySheet.get(targetSheet)?.get(String(targetId ?? '')) : undefined;
        if (!targetSheet || !targetRow) return;
        const address = XLSX.utils.encode_cell({ c: columnIndex, r: rowIndex + 1 });
        worksheet[address] = {
          t: 's',
          v: String(record[header]),
          l: { Target: `#'${targetSheet}'!A${targetRow}`, Tooltip: `Open ${targetSheet} record` },
          s: { font: { color: { rgb: '0563C1' }, underline: true } },
        };
      }));
      worksheet['!cols'] = headers.map((header) => ({
        wch: Math.min(42, Math.max(14, header.length + 2, ...records.map((record) => String(record[header] ?? '').length + 2))),
      }));
      if (headers.length) worksheet['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(headers.length - 1)}${Math.max(1, records.length + 1)}` };
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet);
    }
  }

  private databaseHeaders(records: ReportRecord[]): string[] {
    const headers = new Set<string>();
    records.forEach((record) => Object.keys(record).forEach((key) => headers.add(key)));
    return ['id', ...Array.from(headers).filter((header) => header !== 'id')];
  }

  private databaseValue(value: unknown): string | number | boolean {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
    return JSON.stringify(value);
  }

  private relatedSheet(column: string): string | undefined {
    return {
      formulationId: 'Formulations', materialId: 'Materials', supplierId: 'Suppliers',
      propertyDefinitionId: 'Property Definitions', supplierMaterialId: 'Supplier Materials',
      materialLotId: 'Material Lots', materialProperties: 'Material Properties',
      machineId: 'Machines', moldId: 'Molds', processSetupRevisionId: 'Process Setup Revisions',
      parameterDefinitionId: 'Process Parameter Definitions', productionRunId: 'Production Runs',
      formulationComponentId: 'Formulation Components', sampleId: 'Samples', metricId: 'Metric Definitions',
      testMethodId: 'Test Method Definitions', testConditionId: 'Test Condition Definitions', benchmarkId: 'Benchmark Profiles',
    }[column];
  }

  private processValues(snapshot: ReportSnapshot): ReportRecord[] {
    const values = snapshot.processSetup?.['values'];
    return Array.isArray(values) ? values as ReportRecord[] : [];
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

  private ascii(value: string): string {
    return value.normalize('NFKD').replace(/[^\x20-\x7E]/g, '?');
  }

  private chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
    return chunks.length ? chunks : [[]];
  }
}
