import type { CSSProperties } from 'react';
import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardSubtitle, CardTitle, Divider } from '../../components/ui/Card';
import { controlStyles } from '../../components/ui/controls';
import { DashboardPage, MessageBanner } from '../../components/ui/Page';
import { commitMaterialWorkbook, previewMaterialWorkbook, type MaterialImportPreview } from '../../services/api';
import { colors, spacing } from '../../theme/tokens';

export function MaterialImportPage({ onCancel, onCommitted }: { onCancel: () => void; onCommitted: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<MaterialImportPreview | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Record<string, number> | null>(null);

  const upload = async () => {
    if (!file) return;
    setBusy(true); setError(''); setResult(null);
    try {
      const next = await previewMaterialWorkbook(file);
      setPreview(next);
      setResolutions(Object.fromEntries(next.matches.filter((item) => item.matchedMaterialId).map((item) => [item.externalId, item.matchedMaterialId as string])));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Preview failed');
    } finally { setBusy(false); }
  };

  const commit = async () => {
    if (!preview || preview.validationResults.errors.length > 0) return;
    setBusy(true); setError('');
    try {
      const committed = await commitMaterialWorkbook(preview.id, resolutions);
      setResult(committed.summary);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Commit failed');
    } finally { setBusy(false); }
  };

  return (
    <DashboardPage maxWidth="100%">
      <Card>
        <CardHeader>
          <div><CardTitle>Import Materials</CardTitle><CardSubtitle>Upload the fixed single-sheet Material Import v1 workbook, preview matches, then commit it.</CardSubtitle></div>
          <Button onClick={onCancel} variant="secondary" type="button">Back</Button>
        </CardHeader>
        <Divider />
        {error && <MessageBanner tone="danger">{error}</MessageBanner>}
        {result && <MessageBanner tone="success">Import committed: {Object.entries(result).map(([key, value]) => `${label(key)} ${value}`).join(' · ')}</MessageBanner>}
        <div style={styles.uploadRow}>
          <input accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview(null); setResult(null); }} type="file" />
          <Button disabled={!file || busy} onClick={() => void upload()} type="button" variant="primary">{busy ? 'Working…' : 'Preview Workbook'}</Button>
        </div>
        {preview && (
          <div style={styles.stack}>
            {preview.validationResults.errors.map((message) => <MessageBanner key={message} tone="danger">{message}</MessageBanner>)}
            {preview.validationResults.warnings.map((message) => <MessageBanner key={message} tone="warning">{message}</MessageBanner>)}
            <div style={styles.summaryGrid}>
              {Object.entries(preview.summary).map(([key, value]) => <div key={key} style={styles.summary}><span>{label(key)}</span><strong>{value}</strong></div>)}
            </div>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead><tr><th>External ID</th><th>Product Grade</th><th>Manufacturer</th><th>Import Action / Resolution</th></tr></thead>
                <tbody>
                  {preview.matches.map((item) => (
                    <tr key={item.externalId}>
                      <td>{item.externalId}</td><td>{item.productGrade}</td><td>{item.manufacturer}</td>
                      <td>
                        <select onChange={(event) => setResolutions((current) => ({ ...current, [item.externalId]: event.target.value }))} style={controlStyles.input} value={resolutions[item.externalId] ?? ''}>
                          <option value="">Create new material</option>
                          {preview.materialOptions.map((option) => <option key={option.id} value={option.id}>{String(option['code'] ?? '')} — {String(option['label'] ?? option.id)}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={styles.actions}>
              {result ? <Button onClick={onCommitted} type="button" variant="primary">View Materials</Button> : <Button disabled={busy || preview.validationResults.errors.length > 0} onClick={() => void commit()} type="button" variant="primary">Commit Import</Button>}
            </div>
          </div>
        )}
      </Card>
    </DashboardPage>
  );
}

function label(value: string): string { return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase()); }

const styles: Record<string, CSSProperties> = {
  actions: { display: 'flex', justifyContent: 'flex-end' },
  stack: { display: 'grid', gap: spacing.space4 },
  summary: { background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 8, display: 'grid', gap: spacing.space2, padding: spacing.space4 },
  summaryGrid: { display: 'grid', gap: spacing.space3, gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' },
  table: { borderCollapse: 'collapse', minWidth: 900, width: '100%' },
  tableWrap: { border: `1px solid ${colors.border}`, borderRadius: 8, overflow: 'auto' },
  uploadRow: { alignItems: 'center', display: 'flex', gap: spacing.space4, marginBottom: spacing.space5 },
};
