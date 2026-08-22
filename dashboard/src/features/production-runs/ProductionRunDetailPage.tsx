import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles, getTabButtonStyle } from '../../components/ui/controls';
import { DashboardPage, EmptyState, MessageBanner } from '../../components/ui/Page';
import {
  getProductionRun,
  archiveSample,
  listApprovedFormulationOptions,
  listLibraryOptions,
  updateProductionRun,
  updateProductionRunStatus,
  type LibraryRecord,
  type ProductionRunPayload,
  type ProductionRunRecord,
  type ProductionRunStatus,
} from '../../services/api';
import { spacing } from '../../theme/tokens';
import { ManufacturingParametersForm } from './components/ManufacturingParametersForm';
import { BenchmarkScoringPanel } from './components/scores/BenchmarkScoringPanel';
import { ProductionRunStatusBadge } from './components/ProductionRunStatusBadge';
import { ProductionRunTimeline } from './components/ProductionRunTimeline';
import { RunSummaryPanel } from './components/RunSummaryPanel';
import { SampleTable } from './components/SampleTable';
import { ProcessSetupPanel } from './components/ProcessSetupPanel';
import { ReadOnlyLabResultsPanel } from '../lab-testing/components/ReadOnlyLabResultsPanel';
import { formatValue, runStyles, statusLabels } from './productionRunUi';

type DetailTab = 'Overview' | 'Manufacturing Parameters' | 'Process Setup' | 'Samples' | 'Lab Results' | 'Run Summary' | 'Scores';

const tabsByStatus: Record<ProductionRunStatus, DetailTab[]> = {
  planned: ['Overview', 'Manufacturing Parameters', 'Process Setup'],
  molded: ['Overview', 'Manufacturing Parameters', 'Process Setup'],
  curing: ['Overview', 'Manufacturing Parameters', 'Process Setup', 'Samples'],
  ready_for_testing: ['Overview', 'Manufacturing Parameters', 'Process Setup', 'Samples', 'Lab Results'],
  testing: ['Overview', 'Manufacturing Parameters', 'Process Setup', 'Samples', 'Lab Results'],
  completed: ['Overview', 'Manufacturing Parameters', 'Process Setup', 'Samples', 'Lab Results', 'Run Summary', 'Scores'],
  scored: ['Overview', 'Manufacturing Parameters', 'Process Setup', 'Samples', 'Lab Results', 'Run Summary', 'Scores'],
  archived: ['Overview', 'Manufacturing Parameters', 'Process Setup', 'Samples', 'Lab Results', 'Run Summary', 'Scores'],
};

const nextActions: Partial<Record<ProductionRunStatus, { label: string; status: ProductionRunStatus }>> = {
  curing: { label: 'Mark Ready for Testing', status: 'ready_for_testing' },
  molded: { label: 'Start Curing', status: 'curing' },
  planned: { label: 'Mark as Molded', status: 'molded' },
  ready_for_testing: { label: 'Start Testing', status: 'testing' },
};

const previousActions: Partial<Record<ProductionRunStatus, { label: string; status: ProductionRunStatus }>> = {
  molded: { label: 'Return to Planning', status: 'planned' },
  ready_for_testing: { label: 'Return to Curing', status: 'curing' },
  completed: { label: 'Return to Testing', status: 'testing' },
};

export function ProductionRunDetailPage({ id, onBack, onOpenFormulation, onOpenLabRun, onOpenReport }: { id: string; onBack: () => void; onOpenFormulation: (formulationId: string) => void; onOpenLabRun?: (runId: string) => void; onOpenReport?: (runId: string) => void }) {
  const [record, setRecord] = useState<ProductionRunRecord | null>(null);
  const [machines, setMachines] = useState<LibraryRecord[]>([]);
  const [molds, setMolds] = useState<LibraryRecord[]>([]);
  const [formulations, setFormulations] = useState<LibraryRecord[]>([]);
  const [tab, setTab] = useState<DetailTab>('Overview');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () => {
    setError('');
    void getProductionRun(id).then(setRecord).catch((err: Error) => setError(err.message));
  };

  useEffect(load, [id]);
  useEffect(() => {
    void Promise.all([listApprovedFormulationOptions(), listLibraryOptions('machines'), listLibraryOptions('molds')])
      .then(([formulationOptions, machineOptions, moldOptions]) => {
        setFormulations(formulationOptions);
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
  const locked = record.status === 'completed' || record.status === 'scored' || record.status === 'archived';
  const nextAction = nextActions[record.status];
  const previousAction = previousActions[record.status];
  const availableTabs = tabsByStatus[record.status];
  const canEditParameters = record.status === 'planned';

  const saveParameters = async () => {
    try {
      const next = await updateProductionRun(record.id, toPayload(record));
      setRecord(next);
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
            <div style={styles.titleRow}>
              <h1 style={runStyles.title}>{record.runCode}</h1>
              <ProductionRunStatusBadge status={record.status} />
            </div>
            <p style={runStyles.subtitle}>{record.formulation} | Samples: {record.sampleCount}</p>
          </div>
          <div style={styles.actionArea}>
            <div style={{ ...runStyles.actions, justifyContent: 'center' }}>
              <button onClick={() => onOpenFormulation(record.formulationId)} style={controlStyles.secondaryButton} type="button">View Formulation</button>
              {previousAction && <button onClick={() => void updateProductionRunStatus(record.id, previousAction.status).then(setRecord).catch((err: Error) => setError(err.message))} style={controlStyles.secondaryButton} type="button">{previousAction.label}</button>}
              {nextAction && <button onClick={() => void updateProductionRunStatus(record.id, nextAction.status).then(setRecord).catch((err: Error) => setError(err.message))} style={controlStyles.primaryButton} type="button">{nextAction.label}</button>}
              {record.status === 'testing' && onOpenLabRun && <button onClick={() => onOpenLabRun(record.id)} style={controlStyles.primaryButton} type="button">Continue Lab Testing</button>}
              {record.status === 'completed' && <button onClick={() => setTab('Run Summary')} style={controlStyles.secondaryButton} type="button">Run Summary</button>}
              {(record.status === 'completed' || record.status === 'scored') && <button onClick={() => setTab('Scores')} style={controlStyles.secondaryButton} type="button">Scores</button>}
              {(record.status === 'completed' || record.status === 'scored') && onOpenReport && <button onClick={() => onOpenReport(record.id)} style={controlStyles.secondaryButton} type="button">Report</button>}
            </div>
            <ProductionRunTimeline status={record.status} />
          </div>
        </div>
        <Divider />
        {error && <MessageBanner tone="danger">{error}</MessageBanner>}
        {message && <MessageBanner tone="success">{message}</MessageBanner>}
        <div style={styles.tabs}>
          {availableTabs.map((item) => (
            <button key={item} onClick={() => setTab(item)} style={getTabButtonStyle(tab === item)} type="button">{item}</button>
          ))}
        </div>
        {tab === 'Overview' && (
          <div style={styles.overviewGrid}>
            <div style={runStyles.panel}>Formulation<br /><strong>{record.formulation}</strong></div>
            <div style={runStyles.panel}>Date Produced<br /><strong>{formatValue(record.dateProduced)}</strong></div>
            <div style={runStyles.panel}>Status<br /><strong>{statusLabels[record.status]}</strong></div>
            <div style={runStyles.panel}>Approved By<br /><strong>{formatValue(record.approvedBy)}</strong></div>
          </div>
        )}
        {tab === 'Manufacturing Parameters' && (
          <div style={runStyles.stack}>
            <ManufacturingParametersForm
              machines={machines}
              molds={molds}
              formulations={formulations}
              onChange={(patch) => setRecord((current) => current ? ({ ...current, ...patch } as ProductionRunRecord) : current)}
              readOnly={!canEditParameters}
              value={payload}
            />
            {canEditParameters && <div style={runStyles.actions}><button onClick={() => void saveParameters()} style={controlStyles.primaryButton} type="button">Save Changes</button></div>}
          </div>
        )}
        {tab === 'Samples' && (record.samples?.length
          ? <SampleTable canDelete={!locked} onDelete={(sampleId) => void archiveSample(sampleId).then(() => { setRecord((current) => current ? { ...current, samples: current.samples?.filter((sample) => sample.id !== sampleId), sampleCount: Math.max(0, current.sampleCount - 1) } : current); setMessage('Sample deleted'); }).catch((err: Error) => setError(err.message))} samples={record.samples} />
          : <EmptyState>Samples are automatically generated when this run is marked Ready for Testing.</EmptyState>)}
        {tab === 'Process Setup' && <ProcessSetupPanel runId={record.id} />}
        {tab === 'Lab Results' && <ReadOnlyLabResultsPanel onOpenLabRun={onOpenLabRun} runId={record.id} />}
        {tab === 'Run Summary' && <RunSummaryPanel onContinueToScoring={() => setTab('Scores')} runId={record.id} />}
        {tab === 'Scores' && <BenchmarkScoringPanel runId={record.id} />}
      </Card>
    </DashboardPage>
  );
}

function toPayload(record: ProductionRunRecord): ProductionRunPayload {
  return {
    approvedBy: record.approvedBy ?? null,
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
  actionArea: { alignItems: 'center', display: 'flex', flexDirection: 'column', gap: spacing.space2 },
  overviewGrid: { display: 'grid', gap: spacing.space4, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' },
  tabs: { display: 'flex', flexWrap: 'wrap', gap: spacing.space3 },
  titleRow: { alignItems: 'center', display: 'flex', gap: spacing.space2, marginTop: spacing.space4 },
};
