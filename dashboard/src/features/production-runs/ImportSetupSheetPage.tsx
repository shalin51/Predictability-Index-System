import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles } from '../../components/ui/controls';
import { DashboardPage, MessageBanner } from '../../components/ui/Page';
import {
  commitSetupWorkbook,
  previewSetupWorkbook,
  type LibraryRecord,
  type SetupImportPreview,
} from '../../services/api';
import { colors, spacing } from '../../theme/tokens';
import { runStyles } from './productionRunUi';

interface ResolutionState {
  formulationId: string;
  machineId: string;
  moldId: string;
  materialId: string;
  materialLotId: string;
  primaryFormulationComponentId: string;
  runCode: string;
  cureHoursBeforeTest: number;
  initialStatus: 'planned' | 'molded';
  sampleCount: string;
  startingSampleCode: string;
}

const emptyResolution: ResolutionState = {
  formulationId: '', machineId: '', moldId: '', materialId: '', materialLotId: '',
  primaryFormulationComponentId: '', runCode: '', cureHoursBeforeTest: 72,
  initialStatus: 'planned', sampleCount: '', startingSampleCode: '',
};

export function ImportSetupSheetPage({ onCancel, onSaved }: { onCancel: () => void; onSaved: (id: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<SetupImportPreview | null>(null);
  const [resolution, setResolution] = useState(emptyResolution);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const components = useMemo(() => preview?.matches.formulationComponents.filter((item) => item['formulationId'] === resolution.formulationId) ?? [], [preview, resolution.formulationId]);
  const lots = useMemo(() => preview?.matches.lots.filter((item) => !resolution.materialId || item['materialId'] === resolution.materialId) ?? [], [preview, resolution.materialId]);
  const canCommit = Boolean(preview && preview.validationResults.errors.length === 0 && resolution.formulationId && resolution.machineId && resolution.moldId
    && (!resolution.materialLotId || resolution.primaryFormulationComponentId)
    && (!resolution.sampleCount || (Number(resolution.sampleCount) > 0 && resolution.startingSampleCode)));

  const upload = async () => {
    if (!file) return;
    setBusy(true); setError('');
    try {
      const result = await previewSetupWorkbook(file);
      setPreview(result);
      setResolution({
        ...emptyResolution,
        formulationId: preferred(result.matches.formulations),
        machineId: preferred(result.matches.machines),
        moldId: preferred(result.matches.molds),
        materialId: preferred(result.matches.materials),
        materialLotId: preferred(result.matches.lots),
        initialStatus: result.defaultInitialStatus,
      });
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Preview failed'); }
    finally { setBusy(false); }
  };

  const commit = async () => {
    if (!preview || !canCommit) return;
    setBusy(true); setError('');
    try {
      const sampleCount = Number(resolution.sampleCount);
      const result = await commitSetupWorkbook(preview.id, {
        formulationId: resolution.formulationId,
        machineId: resolution.machineId,
        moldId: resolution.moldId,
        materialId: resolution.materialId || null,
        materialLotId: resolution.materialLotId || null,
        primaryFormulationComponentId: resolution.primaryFormulationComponentId || null,
        runCode: resolution.runCode || null,
        cureHoursBeforeTest: resolution.cureHoursBeforeTest,
        initialStatus: resolution.initialStatus,
        sampleGeneration: sampleCount > 0 && resolution.startingSampleCode ? { count: sampleCount, startingSampleCode: resolution.startingSampleCode } : undefined,
      });
      onSaved(result.productionRunId);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Commit failed'); }
    finally { setBusy(false); }
  };

  return (
    <DashboardPage maxWidth="100%">
      <Card>
        <div style={runStyles.header}>
          <div><h1 style={runStyles.title}>Import BOY 125E Setup Sheet</h1><p style={runStyles.subtitle}>Preview and validate an approved operator workbook before creating a production run.</p></div>
          <button onClick={onCancel} style={controlStyles.secondaryButton} type="button">Cancel</button>
        </div>
        <Divider />
        {error && <MessageBanner tone="danger">{error}</MessageBanner>}
        <div style={styles.uploadRow}>
          <input accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview(null); }} type="file" />
          <button disabled={!file || busy} onClick={() => void upload()} style={controlStyles.primaryButton} type="button">{busy ? 'Working…' : 'Preview Workbook'}</button>
        </div>
        {preview && (
          <div style={runStyles.stack}>
            {preview.validationResults.errors.map((message) => <MessageBanner key={message} tone="danger">{message}</MessageBanner>)}
            {preview.validationResults.warnings.map((message) => <MessageBanner key={message} tone="warning">{message}</MessageBanner>)}
            {preview.requiredResolutions.length > 0 && <MessageBanner tone="warning">Manual resolution required: {preview.requiredResolutions.map(label).join(', ')}</MessageBanner>}
            <div style={styles.summaryGrid}>
              {Object.entries(preview.parsedSnapshot.header).map(([key, value]) => <div key={key} style={runStyles.panel}>{label(key)}<br /><strong>{String(value ?? '-')}</strong></div>)}
              <div style={runStyles.panel}>Parameters<br /><strong>{preview.parsedSnapshot.parameters.length}</strong></div>
              <div style={runStyles.panel}>Drying Events<br /><strong>{preview.parsedSnapshot.dryingEvents.length}</strong></div>
            </div>
            {preview.sectionSummaries.length > 0 && <div style={styles.summaryGrid}>{preview.sectionSummaries.map((section) => <div key={section.section} style={runStyles.panel}><strong>{label(section.section)}</strong><br />{section.parameterCount} rows · {section.setpointCount} setpoints · {section.actualCount} actuals</div>)}</div>}
            <h2 style={styles.sectionTitle}>Resolve system records</h2>
            <div style={styles.formGrid}>
              <SelectField label="Approved Formulation" options={preview.matches.formulations} required value={resolution.formulationId} onChange={(formulationId) => setResolution((current) => ({ ...current, formulationId, primaryFormulationComponentId: '' }))} />
              <SelectField label="Machine" options={preview.matches.machines} required value={resolution.machineId} onChange={(machineId) => setResolution((current) => ({ ...current, machineId }))} />
              <SelectField label="Mold" options={preview.matches.molds} required value={resolution.moldId} onChange={(moldId) => setResolution((current) => ({ ...current, moldId }))} />
              <SelectField label="Primary Material" options={preview.matches.materials} value={resolution.materialId} onChange={(materialId) => setResolution((current) => ({ ...current, materialId, materialLotId: '' }))} />
              <SelectField label="Formulation Component" options={components} value={resolution.primaryFormulationComponentId} onChange={(primaryFormulationComponentId) => setResolution((current) => ({ ...current, primaryFormulationComponentId }))} />
              <SelectField label="Material Lot" options={lots} value={resolution.materialLotId} onChange={(materialLotId) => setResolution((current) => ({ ...current, materialLotId }))} />
              <TextField label="Run Code" value={resolution.runCode} onChange={(runCode) => setResolution((current) => ({ ...current, runCode }))} />
              <label style={controlStyles.field}><span style={controlStyles.fieldLabel}>Initial Status</span><select onChange={(event) => setResolution((current) => ({ ...current, initialStatus: event.target.value as 'planned' | 'molded' }))} style={controlStyles.input} value={resolution.initialStatus}><option value="planned">Planned</option><option value="molded">Molded</option></select></label>
              <NumberField label="Cure Hours Before Test" value={resolution.cureHoursBeforeTest} onChange={(value) => setResolution((current) => ({ ...current, cureHoursBeforeTest: value }))} />
              <TextField label="Sample Count (optional)" value={resolution.sampleCount} onChange={(sampleCount) => setResolution((current) => ({ ...current, sampleCount }))} />
              <TextField label="Starting Sample Code" value={resolution.startingSampleCode} onChange={(startingSampleCode) => setResolution((current) => ({ ...current, startingSampleCode }))} />
            </div>
            <div style={runStyles.actions}><button disabled={!canCommit || busy} onClick={() => void commit()} style={{ ...controlStyles.primaryButton, ...(!canCommit ? styles.disabled : {}) }} type="button">Create Production Run</button></div>
          </div>
        )}
      </Card>
    </DashboardPage>
  );
}

function preferred(items: LibraryRecord[]): string { return items.find((item) => item['matched'] === true)?.id ?? ''; }
function label(value: string): string { return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase()); }
function SelectField({ label: fieldLabel, options, value, onChange, required }: { label: string; options: LibraryRecord[]; value: string; onChange: (value: string) => void; required?: boolean }) { return <label style={controlStyles.field}><span style={controlStyles.fieldLabel}>{fieldLabel}{required ? ' *' : ''}</span><select onChange={(event) => onChange(event.target.value)} style={controlStyles.input} value={value}><option value="">Select</option>{options.map((item) => <option key={item.id} value={item.id}>{String(item['label'] ?? item['code'] ?? item.id)}{item['matched'] ? ' — matched' : ''}</option>)}</select></label>; }
function TextField({ label: fieldLabel, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label style={controlStyles.field}><span style={controlStyles.fieldLabel}>{fieldLabel}</span><input onChange={(event) => onChange(event.target.value)} style={controlStyles.input} value={value} /></label>; }
function NumberField({ label: fieldLabel, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label style={controlStyles.field}><span style={controlStyles.fieldLabel}>{fieldLabel}</span><input min={0} onChange={(event) => onChange(Number(event.target.value))} style={controlStyles.input} type="number" value={value} /></label>; }

const styles: Record<string, CSSProperties> = {
  disabled: { cursor: 'not-allowed', opacity: 0.5 },
  formGrid: { display: 'grid', gap: spacing.space4, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' },
  sectionTitle: { color: colors.text.primary, margin: 0 },
  summaryGrid: { display: 'grid', gap: spacing.space3, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' },
  uploadRow: { alignItems: 'center', display: 'flex', gap: spacing.space4, marginBottom: spacing.space5 },
};
