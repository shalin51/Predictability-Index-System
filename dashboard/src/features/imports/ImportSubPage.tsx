import type { CSSProperties } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardSubtitle, CardTitle, Divider } from '../../components/ui/Card';
import { DashboardPage, MessageBanner } from '../../components/ui/Page';
import {
  downloadDataTransferWorkbook,
  importDataTransferWorkbook,
  validateDataTransferWorkbook,
  type DataTransferImportResult,
  type DataTransferValidationResponse,
  type DuplicateResolution,
} from '../../services/api';
import { colors, font, radius, spacing } from '../../theme/tokens';
import type { ImportResource } from '../../routing/dashboardRoute';

const IMPORT_TITLES: Record<ImportResource, string> = {
  'material-suppliers': 'Material Suppliers',
  materials: 'Materials',
  'material-properties': 'Material Properties',
  machines: 'Machines',
  'machine-parameters': 'Machine Parameters',
  molds: 'Molds',
  'mold-zones': 'Mold Zones',
  benchmarks: 'Benchmarks',
  'scoring-rules': 'Scoring Rules',
  formulations: 'Formulations',
  'production-runs': 'Production Runs',
};

type Stage = 'idle' | 'validating' | 'validated' | 'importing' | 'done';

interface ImportSubPageProps {
  resource: ImportResource;
  onBack: () => void;
  /** Called after a successful commit — navigate the user to the imported data. */
  onViewImported?: () => void;
}

export function ImportSubPage({ resource, onBack, onViewImported }: ImportSubPageProps) {
  const title = IMPORT_TITLES[resource] ?? resource;
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [validation, setValidation] = useState<DataTransferValidationResponse | null>(null);
  const [importResult, setImportResult] = useState<DataTransferImportResult | null>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [resolutions, setResolutions] = useState<Record<number, 'overwrite' | 'create-new'>>({});
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearProgressTimer = () => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  };

  useEffect(() => () => { clearProgressTimer(); }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFileError('');
    setValidation(null);
    setImportResult(null);
    setError('');
    setStage('idle');
    setProgress(0);
    setResolutions({});
    if (!selected) { setFile(null); return; }
    const isExcel = selected.name.endsWith('.xlsx') || selected.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (!isExcel) {
      setFileError('Only Excel (.xlsx) files are supported.');
      setFile(null);
      event.target.value = '';
      return;
    }
    setFile(selected);
  };

  const handleValidate = useCallback(async () => {
    if (!file) return;
    setStage('validating');
    setError('');
    setValidation(null);
    setProgress(0);
    setResolutions({});

    let fake = 0;
    progressTimer.current = setInterval(() => {
      fake = Math.min(fake + 5, 90);
      setProgress(fake);
    }, 150);

    try {
      const result = await validateDataTransferWorkbook(resource, file);
      clearProgressTimer();
      setProgress(100);
      setValidation(result);
      setStage('validated');
    } catch (caught) {
      clearProgressTimer();
      setError(caught instanceof Error ? caught.message : 'Validation failed');
      setStage('idle');
      setProgress(0);
    }
  }, [file, resource]);

  const handleImport = useCallback(async () => {
    if (!file || !validation?.canImport) return;
    setStage('importing');
    setError('');
    setProgress(0);

    const totalRows = validation.rows.length;
    const delayPerRow = 100;

    let processed = 0;
    progressTimer.current = setInterval(() => {
      processed += 1;
      setProgress(Math.min(Math.round((processed / Math.max(totalRows, 1)) * 95), 95));
      if (processed >= totalRows) clearProgressTimer();
    }, delayPerRow);

    // Build resolutions array for 'update' rows
    const duplicateResolutions: DuplicateResolution[] = validation.rows
      .filter((r) => r.action === 'update')
      .map((r) => ({
        rowIndex: r.rowIndex,
        action: resolutions[r.rowIndex] ?? 'overwrite',
      }));

    try {
      const result = await importDataTransferWorkbook(resource, file, duplicateResolutions);
      clearProgressTimer();
      setProgress(100);
      setImportResult(result);
      setStage('done');
    } catch (caught) {
      clearProgressTimer();
      setError(caught instanceof Error ? caught.message : 'Import failed');
      setStage('validated');
      setProgress(0);
    }
  }, [file, resource, validation, resolutions]);

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      await downloadDataTransferWorkbook(resource, 'template');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Template download failed');
    } finally {
      setDownloading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setValidation(null);
    setImportResult(null);
    setError('');
    setStage('idle');
    setProgress(0);
    setResolutions({});
    clearProgressTimer();
  };

  const updateRows = validation?.rows.filter((r) => r.action === 'update') ?? [];
  const unresolvedCount = updateRows.filter((r) => resolutions[r.rowIndex] === undefined).length;
  const allResolved = unresolvedCount === 0;
  const canImport = !!(validation?.canImport && (updateRows.length === 0 || allResolved));

  const isProcessing = stage === 'validating' || stage === 'importing';

  return (
    <DashboardPage maxWidth="100%">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Import {title}</CardTitle>
            <CardSubtitle>
              Download the template, fill it in, then upload and validate before committing the import.
            </CardSubtitle>
          </div>
          <div style={styles.headerActions}>
            <Button disabled={downloading || isProcessing} onClick={() => void handleDownloadTemplate()} type="button" variant="secondary">
              {downloading ? 'Downloading…' : '⬇ Download Template'}
            </Button>
            <Button onClick={onBack} type="button" variant="secondary">
              ← Back to Imports
            </Button>
          </div>
        </CardHeader>
        <Divider />

        {error && <MessageBanner tone="danger">{error}</MessageBanner>}

        {stage === 'done' && importResult && (
          <MessageBanner tone="success">
            Import complete — {importResult.created} created, {importResult.updated} updated, {importResult.skipped} skipped, {importResult.processed} processed.
            {importResult.errors.length > 0 && <div style={{ marginTop: 4 }}>Errors: {importResult.errors.join('; ')}</div>}
          </MessageBanner>
        )}

        {/* File picker */}
        {stage !== 'done' && (
          <div style={styles.uploadSection}>
            <label style={styles.label}>Excel File (.xlsx only)</label>
            <div style={styles.uploadRow}>
              <input
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                disabled={isProcessing}
                onChange={handleFileChange}
                style={styles.fileInput}
                type="file"
              />
              <Button
                disabled={!file || isProcessing}
                onClick={() => void handleValidate()}
                type="button"
                variant="primary"
              >
                {stage === 'validating' ? 'Validating…' : 'Validate File'}
              </Button>
            </div>
            {fileError && <div style={styles.fieldError}>{fileError}</div>}
          </div>
        )}

        {/* Progress bar */}
        {(isProcessing || (stage === 'validated' && progress > 0)) && (
          <ProgressBar
            progress={progress}
            label={stage === 'validating' ? 'Validating rows…' : 'Importing rows…'}
          />
        )}

        {/* Duplicate resolution panel */}
        {validation && stage !== 'done' && updateRows.length > 0 && (
          <DuplicateResolutionPanel
            rows={updateRows}
            resolutions={resolutions}
            onChange={setResolutions}
            disabled={isProcessing}
          />
        )}

        {/* Validation results */}
        {validation && stage !== 'done' && (
          <ValidationResultsTable
            canImport={canImport}
            onImport={() => void handleImport()}
            importing={stage === 'importing'}
            resource={resource}
            summary={validation.summary}
            rows={validation.rows}
            unresolvedCount={unresolvedCount}
          />
        )}

        {/* Done actions */}
        {stage === 'done' && (
          <div style={styles.doneActions}>
            <Button onClick={handleReset} type="button" variant="secondary">Import Another File</Button>
            <Button onClick={onBack} type="button" variant="secondary">Back to Imports</Button>
            {onViewImported && (
              <Button onClick={onViewImported} type="button" variant="primary">
                View {title} →
              </Button>
            )}
          </div>
        )}
      </Card>
    </DashboardPage>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function ProgressBar({ label, progress }: { label: string; progress: number }) {
  return (
    <div style={styles.progressWrap}>
      <div style={styles.progressLabel}>{label} {Math.round(progress)}%</div>
      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressFill, width: `${progress}%` }} />
      </div>
    </div>
  );
}

// ─── Duplicate Resolution Panel ──────────────────────────────────────────────

interface DuplicateResolutionPanelProps {
  rows: DataTransferValidationResponse['rows'];
  resolutions: Record<number, 'overwrite' | 'create-new'>;
  onChange: (r: Record<number, 'overwrite' | 'create-new'>) => void;
  disabled: boolean;
}

function DuplicateResolutionPanel({ rows, resolutions, onChange, disabled }: DuplicateResolutionPanelProps) {
  const setAll = (action: 'overwrite' | 'create-new') => {
    const next: Record<number, 'overwrite' | 'create-new'> = {};
    for (const row of rows) next[row.rowIndex] = action;
    onChange(next);
  };

  const setOne = (rowIndex: number, action: 'overwrite' | 'create-new') => {
    onChange({ ...resolutions, [rowIndex]: action });
  };

  const unresolved = rows.filter((r) => resolutions[r.rowIndex] === undefined).length;

  // Find a primary display field for each row
  const labelRow = (row: DataTransferValidationResponse['rows'][number]) => {
    const d = row.data;
    return (d['machineCode'] ?? d['materialCode'] ?? d['supplierCode'] ?? d['moldCode'] ?? d['benchmarkCode'] ?? Object.values(d)[0] ?? `Row ${row.rowIndex + 2}`) as string;
  };

  return (
    <div style={styles.dupPanel}>
      <div style={styles.dupHeader}>
        <div>
          <div style={styles.dupTitle}>⚠ Duplicate Records Detected</div>
          <div style={styles.dupSubtitle}>
            {rows.length} record{rows.length !== 1 ? 's' : ''} already exist in the system.
            {unresolved > 0 ? ` Choose an action for each before importing (${unresolved} unresolved).` : ' All resolved — ready to import.'}
          </div>
        </div>
        <div style={styles.dupBulkActions}>
          <span style={styles.dupBulkLabel}>Apply to all:</span>
          <Button disabled={disabled} onClick={() => setAll('overwrite')} type="button" variant="secondary" size="sm">
            Overwrite All
          </Button>
          <Button disabled={disabled} onClick={() => setAll('create-new')} type="button" variant="secondary" size="sm">
            Create All as New
          </Button>
        </div>
      </div>

      <div style={styles.dupList}>
        {rows.map((row) => {
          const resolution = resolutions[row.rowIndex];
          const label = labelRow(row);
          return (
            <div key={row.rowIndex} style={styles.dupRow}>
              <div style={styles.dupRowLabel}>
                <span style={styles.dupRowCode}>{label}</span>
                <span style={styles.dupRowHint}>Row {row.rowIndex + 2}</span>
              </div>
              <div style={styles.dupRowComparison}>
                <div style={styles.dupChangeSummary}>
                  {Object.keys(row.data).slice(0, 4).map((key) => {
                    const newVal = row.data[key];
                    const oldVal = row.existingRecord?.[key];
                    const changed = String(newVal) !== String(oldVal ?? '');
                    return (
                      <span key={key} style={{ ...styles.dupField, ...(changed ? styles.dupFieldChanged : {}) }}>
                        <strong>{key}:</strong>{' '}
                        {changed ? (
                          <><span style={styles.dupOldVal}>{formatCellValue(oldVal)}</span>{' → '}<span style={styles.dupNewVal}>{formatCellValue(newVal)}</span></>
                        ) : formatCellValue(newVal)}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div style={styles.dupActions}>
                <button
                  disabled={disabled}
                  onClick={() => setOne(row.rowIndex, 'overwrite')}
                  style={{ ...styles.dupBtn, ...(resolution === 'overwrite' ? styles.dupBtnSelected : {}) }}
                  type="button"
                >
                  Overwrite
                </button>
                <button
                  disabled={disabled}
                  onClick={() => setOne(row.rowIndex, 'create-new')}
                  style={{ ...styles.dupBtn, ...(resolution === 'create-new' ? styles.dupBtnSelected : {}) }}
                  type="button"
                >
                  Create New
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ValidationResultsTableProps {
  canImport: boolean;
  importing: boolean;
  onImport: () => void;
  resource: ImportResource;
  rows: DataTransferValidationResponse['rows'];
  summary: DataTransferValidationResponse['summary'];
  unresolvedCount: number;
}

function ValidationResultsTable({ canImport, importing, onImport, rows, summary, unresolvedCount }: ValidationResultsTableProps) {
  const [showAll, setShowAll] = useState(false);
  const errorRows = rows.filter((r) => r.action === 'error');
  const hasErrors = errorRows.length > 0;
  const displayRows = showAll ? rows : rows.slice(0, 50);

  const dataColumns = rows.length > 0 ? Object.keys(rows[0]?.data ?? {}) : [];

  return (
    <div style={styles.results}>
      {/* Summary */}
      <div style={styles.summaryRow}>
        <SummaryChip label="Total Rows" value={rows.length} />
        <SummaryChip label="Will Create" value={summary.create} tone="ok" />
        <SummaryChip label="Will Update" value={summary.update} tone="info" />
        <SummaryChip label="Errors" value={summary.error} tone={summary.error > 0 ? 'error' : 'ok'} />
      </div>

      {hasErrors && (
        <MessageBanner tone="danger">
          {summary.error} row(s) have errors. Fix the issues in your file and re-validate before importing.
        </MessageBanner>
      )}

      {!hasErrors && canImport && (
        <MessageBanner tone="success">
          All {rows.length} rows validated successfully. Ready to import.
        </MessageBanner>
      )}

      {rows.length === 0 && (
        <MessageBanner tone="warning">No data rows found in the file.</MessageBanner>
      )}

      {/* Table */}
      {rows.length > 0 && (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Action</th>
                {dataColumns.map((col) => <th key={col} style={styles.th}>{col}</th>)}
                <th style={{ ...styles.th, minWidth: 240 }}>Validation</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row) => {
                const isError = row.action === 'error';
                const rowStyle = isError ? styles.rowError : row.action === 'update' ? styles.rowUpdate : styles.rowCreate;
                return (
                  <tr key={row.rowIndex} style={rowStyle}>
                    <td style={styles.td}>{row.rowIndex + 2}</td>
                    <td style={styles.td}>
                      <ActionBadge action={row.action} />
                    </td>
                    {dataColumns.map((col) => (
                      <td key={col} style={styles.td}>{formatCellValue(row.data[col])}</td>
                    ))}
                    <td style={styles.tdError}>
                      {isError ? (
                        <ul style={styles.errorList}>
                          {row.errors.map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                      ) : (
                        <span style={styles.ok}>✓ OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length > 50 && !showAll && (
            <div style={styles.showMore}>
              <Button onClick={() => setShowAll(true)} type="button" variant="subtle" size="sm">
                Show all {rows.length} rows
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Import button */}
      {canImport && (
        <div style={styles.importActions}>
          <Button disabled={importing} onClick={onImport} type="button" variant="primary">
            {importing ? 'Importing…' : `Commit Import (${rows.length} rows)`}
          </Button>
        </div>
      )}
      {!canImport && !hasErrors && unresolvedCount > 0 && (
        <div style={styles.importActions}>
          <MessageBanner tone="warning">
            Resolve {unresolvedCount} duplicate{unresolvedCount !== 1 ? 's' : ''} above before importing.
          </MessageBanner>
        </div>
      )}
    </div>
  );
}

function ActionBadge({ action }: { action: 'create' | 'update' | 'error' }) {
  const badge: Record<typeof action, { label: string; bg: string; color: string }> = {
    create: { label: 'Create', bg: colors.status.okBg, color: colors.status.ok },
    update: { label: 'Update', bg: colors.status.infoBg, color: colors.status.info },
    error: { label: 'Error', bg: colors.status.errorBg, color: colors.status.error },
  };
  const { label, bg, color } = badge[action];
  return (
    <span style={{ background: bg, borderRadius: 4, color, fontSize: font.size.xs, fontWeight: font.weight.semibold, padding: '2px 8px' }}>
      {label}
    </span>
  );
}

function SummaryChip({ label, value, tone }: { label: string; value: number; tone?: 'ok' | 'info' | 'error' }) {
  const color = tone === 'error' && value > 0 ? colors.status.error : tone === 'ok' ? colors.status.ok : tone === 'info' ? colors.status.info : colors.text.secondary;
  return (
    <div style={{ background: colors.surfaceMuted, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: `${spacing.space2}px ${spacing.space3}px`, textAlign: 'center' }}>
      <div style={{ color, fontSize: font.size.h2, fontWeight: font.weight.bold }}>{value}</div>
      <div style={{ color: colors.text.muted, fontSize: font.size.xs }}>{label}</div>
    </div>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' && value.length > 40) return value.slice(0, 40) + '…';
  return String(value);
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  headerActions: { display: 'flex', gap: spacing.space2, alignItems: 'center', flexShrink: 0 },
  uploadSection: { display: 'flex', flexDirection: 'column', gap: spacing.space2 },
  uploadRow: { alignItems: 'center', display: 'flex', gap: spacing.space3 },
  label: { color: colors.text.secondary, fontSize: font.size.sm, fontWeight: font.weight.medium },
  fileInput: { flex: 1 },
  fieldError: { color: colors.status.error, fontSize: font.size.sm },
  progressWrap: { display: 'flex', flexDirection: 'column', gap: spacing.space1 },
  progressLabel: { color: colors.text.secondary, fontSize: font.size.sm },
  progressTrack: { background: colors.surfaceMuted, border: `1px solid ${colors.border}`, borderRadius: 4, height: 8, overflow: 'hidden', width: '100%' },
  progressFill: { background: colors.brand.primary, borderRadius: 4, height: '100%', transition: 'width 0.1s ease' },
  results: { display: 'flex', flexDirection: 'column', gap: spacing.space4 },
  summaryRow: { display: 'flex', gap: spacing.space3 },
  tableWrap: { border: `1px solid ${colors.border}`, borderRadius: radius.md, overflow: 'auto', maxHeight: 560 },
  table: { borderCollapse: 'collapse', minWidth: '100%', width: '100%' },
  th: { background: colors.surfaceMuted, borderBottom: `1px solid ${colors.border}`, color: colors.text.secondary, fontSize: font.size.xs, fontWeight: font.weight.semibold, padding: `${spacing.space2}px ${spacing.space3}px`, textAlign: 'left', whiteSpace: 'nowrap', position: 'sticky', top: 0 },
  td: { borderBottom: `1px solid ${colors.border}`, color: colors.text.primary, fontSize: font.size.small, maxWidth: 200, overflow: 'hidden', padding: `${spacing.space2}px ${spacing.space3}px`, textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  tdError: { borderBottom: `1px solid ${colors.border}`, padding: `${spacing.space2}px ${spacing.space3}px`, verticalAlign: 'top' },
  rowError: { background: `${colors.status.errorBg}` },
  rowUpdate: { background: `${colors.status.infoBg}` },
  rowCreate: {},
  errorList: { color: colors.status.error, fontSize: font.size.xs, listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  ok: { color: colors.status.ok, fontSize: font.size.xs },
  showMore: { display: 'flex', justifyContent: 'center', padding: spacing.space3 },
  importActions: { display: 'flex', justifyContent: 'flex-end' },
  doneActions: { display: 'flex', gap: spacing.space3, justifyContent: 'flex-end' },
  // Duplicate resolution panel
  dupPanel: { background: `${colors.status.warningBg ?? colors.surfaceMuted}`, border: `1px solid ${colors.status.warning ?? colors.border}`, borderRadius: radius.md, display: 'flex', flexDirection: 'column', gap: spacing.space3, padding: spacing.space4 },
  dupHeader: { alignItems: 'flex-start', display: 'flex', gap: spacing.space3, justifyContent: 'space-between', flexWrap: 'wrap' as const },
  dupTitle: { color: colors.text.primary, fontWeight: font.weight.semibold, marginBottom: spacing.space1 },
  dupSubtitle: { color: colors.text.secondary, fontSize: font.size.sm },
  dupBulkActions: { alignItems: 'center', display: 'flex', flexShrink: 0, gap: spacing.space2 },
  dupBulkLabel: { color: colors.text.secondary, fontSize: font.size.sm },
  dupList: { display: 'flex', flexDirection: 'column', gap: spacing.space2 },
  dupRow: { alignItems: 'center', background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, display: 'flex', flexWrap: 'wrap' as const, gap: spacing.space3, padding: `${spacing.space2}px ${spacing.space3}px` },
  dupRowLabel: { display: 'flex', flexDirection: 'column', minWidth: 140 },
  dupRowCode: { color: colors.text.primary, fontWeight: font.weight.semibold },
  dupRowHint: { color: colors.text.muted, fontSize: font.size.xs },
  dupRowComparison: { flex: 1 },
  dupChangeSummary: { display: 'flex', flexWrap: 'wrap' as const, gap: spacing.space2 },
  dupField: { color: colors.text.secondary, fontSize: font.size.xs },
  dupFieldChanged: { color: colors.text.primary },
  dupOldVal: { color: colors.status.error, textDecoration: 'line-through' },
  dupNewVal: { color: colors.status.ok },
  dupActions: { display: 'flex', gap: spacing.space2 },
  dupBtn: { background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: radius.md, color: colors.text.secondary, cursor: 'pointer', fontSize: font.size.sm, padding: `${spacing.space1}px ${spacing.space3}px`, transition: 'all 0.1s' },
  dupBtnSelected: { background: colors.brand.primary, borderColor: colors.brand.primary, color: '#fff', fontWeight: font.weight.semibold },
};
