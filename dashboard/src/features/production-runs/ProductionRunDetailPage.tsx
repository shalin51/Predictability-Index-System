import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles, getTabButtonStyle } from '../../components/ui/controls';
import { DashboardPage, EmptyState, MessageBanner } from '../../components/ui/Page';
import {
  archiveProductionRun,
  getProductionRun,
  listLibraryOptions,
  updateProductionRun,
  updateProductionRunStatus,
  type LibraryRecord,
  type ProductionRunPayload,
  type ProductionRunRecord,
  type ProductionRunStatus,
} from '../../services/api';
import { colors, spacing } from '../../theme/tokens';
import { ManufacturingParametersForm } from './components/ManufacturingParametersForm';
import { ProductionRunStatusBadge } from './components/ProductionRunStatusBadge';
import { ProductionRunTimeline } from './components/ProductionRunTimeline';
import { SampleTable } from './components/SampleTable';
import { formatValue, runStyles, statusLabels } from './productionRunUi';

type DetailTab = 'Overview' | 'Manufacturing Parameters' | 'Samples' | 'Lab Results' | 'Run Summary' | 'Scores' | 'Audit History';

const nextActions: Partial<Record<ProductionRunStatus, { label: string; status: ProductionRunStatus }>> = {
  curing: { label: 'Mark Ready for Testing', status: 'ready_for_testing' },
  molded: { label: 'Start Curing', status: 'curing' },
  planned: { label: 'Mark as Molded', status: 'molded' },
  ready_for_testing: { label: 'Start Testing', status: 'testing' },
  testing: { label: 'Complete Run', status: 'completed' },
};

export function ProductionRunDetailPage({ id, onBack }: { id: string; onBack: () => void }) {
  const [record, setRecord] = useState<ProductionRunRecord | null>(null);
  const [machines, setMachines] = useState<LibraryRecord[]>([]);
  const [molds, setMolds] = useState<LibraryRecord[]>([]);
  const [tab, setTab] = useState<DetailTab>('Overview');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () => {
    setError('');
    void getProductionRun(id).then(setRecord).catch((err: Error) => setError(err.message));
  };

  useEffect(load, [id]);
  useEffect(() => {
    void Promise.all([listLibraryOptions('machines'), listLibraryOptions('molds')])
      .then(([machineOptions, moldOptions]) => {
        setMachines(machineOptions);
        setMolds(moldOptions);
      })
      .catch(() => undefined);
  }, []);

  if (!record) {
    return (
      <DashboardPage maxWidth="100%">
        <Card>{error ? <MessageBanner tone="danger">{error}</MessageBanner> : <div style={runStyles.muted}>Loading...</div>}</Card>
      </DashboardPage>
    );
  }

  const payload = toPayload(record);
  const locked = record.status === 'completed' || record.status === 'scored';
  const nextAction = nextActions[record.status];

  const save = async (nextPayload: ProductionRunPayload) => {
    try {
      const next = await updateProductionRun(record.id, nextPayload);
      setRecord(next);
      setEditing(false);
      setMessage('Saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  return (
    <DashboardPage maxWidth="100%">
      <Card>
        <div style={runStyles.header}>
          <div>
            <button onClick={onBack} style={controlStyles.subtleButton} type="button">Back</button>
            <h1 style={{ ...runStyles.title, marginTop: spacing.space4 }}>{record.runCode}</h1>
            <p style={runStyles.subtitle}>{record.formulation} | {record.targetBenchmark ?? '-'} | Samples: {record.sampleCount}</p>
          </div>
          <div style={runStyles.actions}>
            <ProductionRunStatusBadge status={record.status} />
            <button disabled={locked} onClick={() => setEditing(true)} style={{ ...controlStyles.secondaryButton, ...(locked ? styles.disabled : {}) }} type="button">Edit</button>
            {nextAction && <button onClick={() => void updateProductionRunStatus(record.id, nextAction.status).then(setRecord).catch((err: Error) => setError(err.message))} style={controlStyles.primaryButton} type="button">{nextAction.label}</button>}
            {record.status === 'completed' && <button disabled style={{ ...controlStyles.secondaryButton, ...styles.disabled }} type="button">Generate Run Summary later</button>}
            {record.status === 'scored' && <button disabled style={{ ...controlStyles.secondaryButton, ...styles.disabled }} type="button">View Score Report</button>}
            <button onClick={() => void archiveProductionRun(record.id).then(setRecord).catch((err: Error) => setError(err.message))} style={controlStyles.secondaryButton} type="button">Archive</button>
          </div>
        </div>
        <Divider />
        {error && <MessageBanner tone="danger">{error}</MessageBanner>}
        {message && <MessageBanner tone="success">{message}</MessageBanner>}
        <ProductionRunTimeline status={record.status} />
        <div style={styles.tabs}>
          {(['Overview', 'Manufacturing Parameters', 'Samples', 'Lab Results', 'Run Summary', 'Scores', 'Audit History'] as DetailTab[]).map((item) => (
            <button key={item} onClick={() => setTab(item)} style={getTabButtonStyle(tab === item)} type="button">{item}</button>
          ))}
        </div>
        {tab === 'Overview' && (
          <div style={styles.overviewGrid}>
            <div style={runStyles.panel}>Formulation<br /><strong>{record.formulation}</strong></div>
            <div style={runStyles.panel}>Target Benchmark<br /><strong>{record.targetBenchmark ?? '-'}</strong></div>
            <div style={runStyles.panel}>Date Produced<br /><strong>{formatValue(record.dateProduced)}</strong></div>
            <div style={runStyles.panel}>Status<br /><strong>{statusLabels[record.status]}</strong></div>
          </div>
        )}
        {tab === 'Manufacturing Parameters' && (
          <div style={runStyles.stack}>
            <ManufacturingParametersForm
              machines={machines}
              molds={molds}
              onChange={(patch) => setRecord((current) => current ? ({ ...current, ...patch } as ProductionRunRecord) : current)}
              readOnly={!editing || locked}
              value={payload}
            />
            {editing && (
              <div style={runStyles.actions}>
                <button onClick={() => { setEditing(false); load(); }} style={controlStyles.secondaryButton} type="button">Cancel</button>
                <button onClick={() => void save(toPayload(record))} style={controlStyles.primaryButton} type="button">Save</button>
              </div>
            )}
          </div>
        )}
        {tab === 'Samples' && (record.samples?.length ? <SampleTable samples={record.samples} /> : <EmptyState>No samples.</EmptyState>)}
        {(tab === 'Lab Results' || tab === 'Run Summary' || tab === 'Scores') && <EmptyState>No records yet.</EmptyState>}
        {tab === 'Audit History' && <pre style={styles.audit}>{JSON.stringify(record['auditHistory'] ?? [], null, 2)}</pre>}
      </Card>
    </DashboardPage>
  );
}

function toPayload(record: ProductionRunRecord): ProductionRunPayload {
  return {
    coolingTime: record.coolingTime ?? null,
    coolingTimeUnit: record.coolingTimeUnit,
    cureHoursBeforeTest: record.cureHoursBeforeTest,
    cycleTime: record.cycleTime ?? null,
    cycleTimeUnit: record.cycleTimeUnit,
    dateProduced: String(record.dateProduced).slice(0, 10),
    formulationId: record.formulationId,
    injectionPressure: record.injectionPressure ?? null,
    injectionPressureUnit: record.injectionPressureUnit,
    machineId: record.machineId,
    meltTemperature: record.meltTemperature ?? null,
    meltTemperatureUnit: record.meltTemperatureUnit,
    moldId: record.moldId,
    runCode: record.runCode,
  };
}

const styles: Record<string, CSSProperties> = {
  audit: { backgroundColor: colors.surfaceMuted, color: colors.text.secondary, overflow: 'auto', padding: spacing.space4 },
  disabled: { opacity: 0.5, cursor: 'not-allowed' },
  overviewGrid: { display: 'grid', gap: spacing.space4, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' },
  tabs: { display: 'flex', flexWrap: 'wrap', gap: spacing.space3 },
};
