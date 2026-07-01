import type { CSSProperties, ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { BallTestingSheetClassification } from '@amfpi/shared';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles } from '../../components/ui/controls';
import { DashboardPage, EmptyState, MessageBanner, SectionHeading } from '../../components/ui/Page';
import {
  importBallTestingWorkbook,
  listBenchmarks,
  type BallTestingImportResultDto,
  type BenchmarkItem,
} from '../../services/api';
import { useAppDispatch } from '../../store/hooks';
import { trackActivity } from '../../store/activityTracker';
import { colors, font, radius, spacing } from '../../theme/tokens';
import { parseWorkbook, type ParsedWorkbook, type ParsedWorkbookSheet } from './workbookImportParser';

const CLASSIFICATION_OPTIONS: BallTestingSheetClassification[] = ['benchmark', 'formulation', 'skip'];

function normalizeValue(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function formatNumber(value: number | undefined): string {
  return value == null ? '—' : value.toFixed(4).replace(/\.?0+$/, '');
}

export function WorkbookImportPage() {
  const dispatch = useAppDispatch();
  const [benchmarks, setBenchmarks] = useState<BenchmarkItem[]>([]);
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null);
  const [loadingBenchmarks, setLoadingBenchmarks] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BallTestingImportResultDto | null>(null);

  useEffect(() => {
    void listBenchmarks()
      .then(setBenchmarks)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoadingBenchmarks(false));
  }, []);

  useEffect(() => {
    if (!workbook || benchmarks.length === 0) {
      return;
    }

    let changed = false;
    const nextSheets = workbook.sheets.map((sheet) => {
      if (sheet.classification !== 'benchmark' || sheet.benchmarkId) {
        return sheet;
      }

      const match = benchmarks.find((benchmark) => (
        normalizeValue(benchmark.name) === normalizeValue(sheet.benchmarkName ?? sheet.sheetName)
        || normalizeValue(benchmark.name) === normalizeValue(sheet.sheetName)
      ));

      if (!match) {
        return sheet;
      }

      changed = true;
      return {
        ...sheet,
        benchmarkId: match.id,
      };
    });

    if (changed) {
      setWorkbook({
        ...workbook,
        sheets: nextSheets,
      });
    }
  }, [benchmarks, workbook]);

  const counts = useMemo(() => {
    const sheets = workbook?.sheets ?? [];
    return {
      benchmark: sheets.filter((sheet) => sheet.classification === 'benchmark').length,
      formulation: sheets.filter((sheet) => sheet.classification === 'formulation').length,
      skip: sheets.filter((sheet) => sheet.classification === 'skip').length,
      withData: sheets.filter((sheet) => sheet.hasData).length,
    };
  }, [workbook]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setParsing(true);
    setError('');
    setResult(null);

    try {
      setWorkbook(await parseWorkbook(file));
    } catch (err) {
      setWorkbook(null);
      setError(err instanceof Error ? err.message : 'Failed to parse workbook');
    } finally {
      setParsing(false);
      event.target.value = '';
    }
  };

  const updateSheet = (index: number, updater: (sheet: ParsedWorkbookSheet) => ParsedWorkbookSheet) => {
    setWorkbook((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        sheets: current.sheets.map((sheet, sheetIndex) => (
          sheetIndex === index ? updater(sheet) : sheet
        )),
      };
    });
  };

  const handleImport = async () => {
    if (!workbook) {
      return;
    }

    setImporting(true);
    setError('');

    try {
      const importResult = await trackActivity(dispatch, 'Importing workbook...', async () => (
        importBallTestingWorkbook({
          workbookName: workbook.workbookName,
          sheets: workbook.sheets.map(({ averages: _averages, hasData: _hasData, ...sheet }) => ({
            ...sheet,
            benchmarkId: sheet.benchmarkId || undefined,
            benchmarkName: sheet.benchmarkName?.trim() || undefined,
            ballBrand: sheet.ballBrand?.trim() || undefined,
            ballModel: sheet.ballModel?.trim() || undefined,
            formulationCode: sheet.formulationCode?.trim() || undefined,
            formulationName: sheet.formulationName?.trim() || undefined,
            testedAt: sheet.testedAt?.trim() || undefined,
            notes: sheet.notes?.trim() || undefined,
          })),
        })
      ));

      setResult(importResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Workbook import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <DashboardPage>
      <div style={styles.stack}>
        <Card>
          <SectionHeading
            title="Ball Testing Workbook Import"
            action={(
              <div style={styles.actionRow}>
                <label style={styles.fileButton}>
                  <input accept=".xlsx,.xls" hidden onChange={(event) => void handleFileChange(event)} type="file" />
                  {parsing ? 'Parsing...' : 'Choose Workbook'}
                </label>
                <button
                  disabled={!workbook || importing}
                  onClick={() => void handleImport()}
                  style={controlStyles.primaryButton}
                  type="button"
                >
                  {importing ? 'Importing...' : 'Import Workbook'}
                </button>
              </div>
            )}
          />

          <p style={styles.subtitle}>
            Parse a client workbook, classify each sheet, review raw samples, then land benchmark and formulation data.
          </p>

          <Divider />

          {error && <MessageBanner tone="danger">{error}</MessageBanner>}

          {!error && !workbook && !parsing && (
            <EmptyState>Choose a workbook to build an import preview.</EmptyState>
          )}

          {workbook && (
            <div style={styles.summaryGrid}>
              <SummaryCard label="Workbook" value={workbook.workbookName} />
              <SummaryCard label="Sheets With Data" value={String(counts.withData)} />
              <SummaryCard label="Benchmarks" value={String(counts.benchmark)} />
              <SummaryCard label="Formulations" value={String(counts.formulation)} />
              <SummaryCard label="Skipped" value={String(counts.skip)} />
            </div>
          )}

          {result && (
            <>
              <Divider />
              <div style={styles.resultCard}>
                <div style={styles.resultTitle}>Last Import</div>
                <div style={styles.resultGrid}>
                  <SummaryCard label="Processed Sheets" value={String(result.totals.processedSheets)} />
                  <SummaryCard label="Raw Samples" value={String(result.totals.rawSamplesStored)} />
                  <SummaryCard label="Benchmark Metrics" value={String(result.totals.benchmarkMetricsUpdated)} />
                  <SummaryCard label="Batch ID" value={result.batchId} />
                </div>
              </div>
            </>
          )}
        </Card>

        {loadingBenchmarks && (
          <Card>
            <div style={styles.muted}>Loading benchmark options...</div>
          </Card>
        )}

        {workbook?.sheets.map((sheet, index) => (
          <Card key={`${sheet.sheetName}-${index}`}>
            <div style={styles.sheetHeader}>
              <div>
                <h2 style={styles.sheetTitle}>{sheet.sheetName}</h2>
                <div style={styles.sheetMeta}>
                  {sheet.samples.length} samples · {sheet.hasData ? 'data found' : 'empty sheet'}
                </div>
              </div>

              <label style={controlStyles.field}>
                <span style={controlStyles.fieldLabel}>Classification</span>
                <select
                  onChange={(event) => updateSheet(index, (current) => ({
                    ...current,
                    classification: event.target.value as BallTestingSheetClassification,
                  }))}
                  style={controlStyles.input}
                  value={sheet.classification}
                >
                  {CLASSIFICATION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <Divider />

            {sheet.classification === 'formulation' && (
              <div style={styles.fieldGrid}>
                <label style={controlStyles.field}>
                  <span style={controlStyles.fieldLabel}>Formulation Code</span>
                  <input
                    onChange={(event) => updateSheet(index, (current) => ({
                      ...current,
                      formulationCode: event.target.value,
                    }))}
                    style={controlStyles.input}
                    value={sheet.formulationCode ?? ''}
                  />
                </label>
                <label style={controlStyles.field}>
                  <span style={controlStyles.fieldLabel}>Formulation Name</span>
                  <input
                    onChange={(event) => updateSheet(index, (current) => ({
                      ...current,
                      formulationName: event.target.value,
                    }))}
                    style={controlStyles.input}
                    value={sheet.formulationName ?? ''}
                  />
                </label>
                <label style={controlStyles.field}>
                  <span style={controlStyles.fieldLabel}>Status</span>
                  <select
                    onChange={(event) => updateSheet(index, (current) => ({
                      ...current,
                      formulationStatus: event.target.value as ParsedWorkbookSheet['formulationStatus'],
                    }))}
                    style={controlStyles.input}
                    value={sheet.formulationStatus ?? 'testing'}
                  >
                    <option value="draft">draft</option>
                    <option value="testing">testing</option>
                    <option value="approved">approved</option>
                    <option value="rejected">rejected</option>
                    <option value="archived">archived</option>
                  </select>
                </label>
                <label style={controlStyles.field}>
                  <span style={controlStyles.fieldLabel}>Tested At</span>
                  <input
                    onChange={(event) => updateSheet(index, (current) => ({
                      ...current,
                      testedAt: event.target.value,
                    }))}
                    style={controlStyles.input}
                    type="datetime-local"
                    value={sheet.testedAt ?? ''}
                  />
                </label>
              </div>
            )}

            {sheet.classification === 'benchmark' && (
              <div style={styles.fieldGrid}>
                <label style={controlStyles.field}>
                  <span style={controlStyles.fieldLabel}>Existing Benchmark</span>
                  <select
                    onChange={(event) => updateSheet(index, (current) => ({
                      ...current,
                      benchmarkId: event.target.value || undefined,
                    }))}
                    style={controlStyles.input}
                    value={sheet.benchmarkId ?? ''}
                  >
                    <option value="">Create / match by name</option>
                    {benchmarks.map((benchmark) => (
                      <option key={benchmark.id} value={benchmark.id}>
                        {benchmark.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={controlStyles.field}>
                  <span style={controlStyles.fieldLabel}>Benchmark Name</span>
                  <input
                    onChange={(event) => updateSheet(index, (current) => ({
                      ...current,
                      benchmarkName: event.target.value,
                    }))}
                    style={controlStyles.input}
                    value={sheet.benchmarkName ?? ''}
                  />
                </label>
                <label style={controlStyles.field}>
                  <span style={controlStyles.fieldLabel}>Brand</span>
                  <input
                    onChange={(event) => updateSheet(index, (current) => ({
                      ...current,
                      ballBrand: event.target.value,
                    }))}
                    style={controlStyles.input}
                    value={sheet.ballBrand ?? ''}
                  />
                </label>
                <label style={controlStyles.field}>
                  <span style={controlStyles.fieldLabel}>Model</span>
                  <input
                    onChange={(event) => updateSheet(index, (current) => ({
                      ...current,
                      ballModel: event.target.value,
                    }))}
                    style={controlStyles.input}
                    value={sheet.ballModel ?? ''}
                  />
                </label>
                <label style={styles.checkboxLabel}>
                  <input
                    checked={sheet.syncBenchmarkMetrics !== false}
                    onChange={(event) => updateSheet(index, (current) => ({
                      ...current,
                      syncBenchmarkMetrics: event.target.checked,
                    }))}
                    type="checkbox"
                  />
                  Sync averaged metrics into benchmark targets
                </label>
              </div>
            )}

            <div style={styles.noteWrap}>
              <label style={controlStyles.field}>
                <span style={controlStyles.fieldLabel}>Notes</span>
                <textarea
                  onChange={(event) => updateSheet(index, (current) => ({
                    ...current,
                    notes: event.target.value,
                  }))}
                  style={controlStyles.textarea}
                  value={sheet.notes ?? ''}
                />
              </label>
            </div>

            <Divider />

            <div style={styles.summaryGrid}>
              <SummaryCard label="Weight (g)" value={formatNumber(sheet.averages.weightG)} />
              <SummaryCard label="Compression (lbf)" value={formatNumber(sheet.averages.compressionLbf)} />
              <SummaryCard label="Compression (kgf)" value={formatNumber(sheet.averages.compressionKg)} />
              <SummaryCard label="Hardness" value={formatNumber(sheet.averages.hardnessShoreD)} />
              <SummaryCard label="Wall (mm)" value={formatNumber(sheet.averages.wallThicknessMm)} />
              <SummaryCard label="Diameter (mm)" value={formatNumber(sheet.averages.diameterMm)} />
              <SummaryCard label="Stretch @ 1/4" value={formatNumber(sheet.averages.stretchQuarterInchLbf)} />
              <SummaryCard label="Full Stretch" value={formatNumber(sheet.averages.fullStretchMaxLbf)} />
            </div>

            <Divider />

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Sample</th>
                    <th style={styles.th}>Weight</th>
                    <th style={styles.th}>Compression</th>
                    <th style={styles.th}>Stretch @ 1/4</th>
                    <th style={styles.th}>Full Stretch</th>
                    <th style={styles.th}>Hardness</th>
                    <th style={styles.th}>Wall</th>
                    <th style={styles.th}>Diameter</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.samples.map((sample) => (
                    <tr key={sample.sampleLabel}>
                      <td style={styles.tdStrong}>{sample.sampleLabel}</td>
                      <td style={styles.td}>{formatNumber(sample.weightG)}</td>
                      <td style={styles.td}>{formatNumber(sample.compressionLbf)}</td>
                      <td style={styles.td}>{formatNumber(sample.stretchQuarterInchLbf)}</td>
                      <td style={styles.td}>{formatNumber(sample.fullStretchMaxLbf)}</td>
                      <td style={styles.td}>{formatNumber(sample.hardnessShoreD)}</td>
                      <td style={styles.td}>{formatNumber(sample.wallThicknessMm)}</td>
                      <td style={styles.td}>{formatNumber(sample.diameterMm)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>
    </DashboardPage>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.summaryCard}>
      <div style={styles.summaryLabel}>{label}</div>
      <div style={styles.summaryValue}>{value}</div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  actionRow: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  checkboxLabel: {
    alignItems: 'center',
    color: colors.text.secondary,
    display: 'flex',
    fontSize: font.size.sm,
    gap: spacing.sm,
    minHeight: 42,
  },
  fieldGrid: {
    display: 'grid',
    gap: spacing.sm,
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  },
  fileButton: {
    ...controlStyles.secondaryButton,
    display: 'inline-flex',
  },
  muted: {
    color: colors.text.muted,
    fontSize: font.size.sm,
  },
  noteWrap: {
    marginTop: spacing.md,
  },
  resultCard: {
    backgroundColor: colors.surfaceElevated,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  resultGrid: {
    display: 'grid',
    gap: spacing.sm,
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    marginTop: spacing.sm,
  },
  resultTitle: {
    color: colors.text.primary,
    fontSize: font.size.md,
    fontWeight: font.weight.semibold,
  },
  sheetHeader: {
    alignItems: 'flex-start',
    display: 'flex',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  sheetMeta: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
    marginTop: 4,
  },
  sheetTitle: {
    color: colors.text.primary,
    fontSize: font.size.lg,
    margin: 0,
  },
  stack: {
    display: 'grid',
    gap: spacing.md,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: font.size.sm,
    lineHeight: 1.6,
    margin: `${spacing.sm}px 0 0`,
  },
  summaryCard: {
    backgroundColor: colors.surfaceElevated,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    padding: `${spacing.sm}px ${spacing.md}px`,
  },
  summaryGrid: {
    display: 'grid',
    gap: spacing.sm,
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  },
  summaryLabel: {
    color: colors.text.secondary,
    fontSize: font.size.xs,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: colors.text.primary,
    fontFamily: font.mono,
    fontSize: font.size.sm,
    marginTop: 6,
    overflowWrap: 'anywhere',
  },
  table: {
    borderCollapse: 'collapse',
    minWidth: 760,
    width: '100%',
  },
  tableWrap: {
    overflowX: 'auto',
  },
  td: {
    borderTop: `1px solid ${colors.border}`,
    color: colors.text.secondary,
    fontFamily: font.mono,
    fontSize: font.size.sm,
    padding: `${spacing.sm}px ${spacing.sm}px`,
  },
  tdStrong: {
    borderTop: `1px solid ${colors.border}`,
    color: colors.text.primary,
    fontSize: font.size.sm,
    fontWeight: font.weight.medium,
    padding: `${spacing.sm}px ${spacing.sm}px`,
  },
  th: {
    color: colors.text.muted,
    fontSize: font.size.xs,
    fontWeight: font.weight.semibold,
    padding: `${spacing.sm}px ${spacing.sm}px`,
    textAlign: 'left',
    textTransform: 'uppercase',
  },
};
