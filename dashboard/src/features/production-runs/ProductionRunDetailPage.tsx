import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles, getTabButtonStyle } from '../../components/ui/controls';
import { DashboardPage, EmptyState, MessageBanner } from '../../components/ui/Page';
import {
  getProductionRun,
  archiveSample,
  generateBenchmarkScoring,
  generateRunSummary,
  listApprovedFormulationOptions,
  listLibraryOptions,
  updateProductionRun,
  updateProductionRunStatus,
  updateSample,
  type LibraryRecord,
  type ProductionRunPayload,
  type ProductionRunRecord,
  type ProductionRunStatus,
} from '../../services/api';
import { spacing } from '../../theme/tokens';
import { ManufacturingParametersForm } from './components/ManufacturingParametersForm';
import { SetupProfileParametersTable } from './components/SetupProfileParametersTable';
import { BenchmarkScoringPanel } from './components/scores/BenchmarkScoringPanel';
import { ProductionRunStatusBadge } from './components/ProductionRunStatusBadge';
import { ProductionRunTimeline } from './components/ProductionRunTimeline';
import { RunSummaryPanel } from './components/RunSummaryPanel';
import { SampleTable } from './components/SampleTable';
import { ReadOnlyLabResultsPanel } from '../lab-testing/components/ReadOnlyLabResultsPanel';
import { formatValue, runStyles, statusLabels } from './productionRunUi';

type DetailTab = 'Overview' | 'Manufacturing Parameters' | 'Samples' | 'Lab Results' | 'Run Summary' | 'Scores';

const tabsByStatus: Record<ProductionRunStatus, DetailTab[]> = {
  planned: ['Overview', 'Manufacturing Parameters'],
  molded: ['Overview', 'Manufacturing Parameters'],
  curing: ['Overview', 'Manufacturing Parameters', 'Samples'],
  ready_for_testing: ['Overview', 'Manufacturing Parameters', 'Samples', 'Lab Results'],
  testing: ['Overview', 'Manufacturing Parameters', 'Samples', 'Lab Results'],
  scored: ['Overview', 'Manufacturing Parameters', 'Samples', 'Lab Results', 'Run Summary', 'Scores'],
  archived: ['Overview', 'Manufacturing Parameters', 'Samples', 'Lab Results', 'Run Summary', 'Scores'],
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
};

export function ProductionRunDetailPage({ id, onBack, onOpenFormulation, onOpenLabRun, onOpenReport }: { id: string; onBack: () => void; onOpenFormulation: (formulationId: string) => void; onOpenLabRun?: (runId: string) => void; onOpenReport?: (runId: string) => void }) {
  const [record, setRecord] = useState<ProductionRunRecord | null>(null);
  const [machines, setMachines] = useState<LibraryRecord[]>([]);
  const [machineSetupProfiles, setMachineSetupProfiles] = useState<LibraryRecord[]>([]);
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
    void Promise.all([listApprovedFormulationOptions(), listLibraryOptions('machines'), listLibraryOptions('machine-setup-profiles'), listLibraryOptions('molds')])
      .then(([formulationOptions, machineOptions, profileOptions, moldOptions]) => {
        setFormulations(formulationOptions);
        setMachines(machineOptions);
        setMachineSetupProfiles(profileOptions);
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
  const locked = record.status === 'scored' || record.status === 'archived';
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

  const generateScore = async () => {
    try {
      await generateRunSummary(record.id);
      await generateBenchmarkScoring(record.id);
      setTab('Scores');
      setMessage('Summary and score generated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Score generation failed');
    }
  };

  return (
    <DashboardPage maxWidth="100%">
      <Card>
        <div style={runStyles.header}>
          <div style={styles.headerStart}>
            <div style={styles.titleRow}>
              <h1 style={runStyles.title}>{record.runCode}</h1>
              <ProductionRunStatusBadge status={record.status} />
            </div>
            <p style={runStyles.subtitle}>{record.formulation} | Samples: {record.sampleCount}</p>
          </div>
          <div style={styles.headerTimeline}>
            <ProductionRunTimeline status={record.status} />
          </div>
          <div style={styles.headerActions}>
            <div style={{ ...runStyles.actions, justifyContent: 'flex-end' }}>
              <Button onClick={onBack} type="button" variant="secondary">Back</Button>
              <button onClick={() => onOpenFormulation(record.formulationId)} style={controlStyles.secondaryButton} type="button">View Formulation</button>
              {previousAction && <button onClick={() => void updateProductionRunStatus(record.id, previousAction.status).then(setRecord).catch((err: Error) => setError(err.message))} style={controlStyles.secondaryButton} type="button">{previousAction.label}</button>}
              {nextAction && <button onClick={() => void updateProductionRunStatus(record.id, nextAction.status).then(setRecord).catch((err: Error) => setError(err.message))} style={controlStyles.primaryButton} type="button">{nextAction.label}</button>}
              {record.status === 'testing' && onOpenLabRun && <button onClick={() => onOpenLabRun(record.id)} style={controlStyles.primaryButton} type="button">Continue Lab Testing</button>}
              {record.status === 'scored' && tab === 'Scores' && <button onClick={() => void generateScore()} style={controlStyles.primaryButton} type="button">Generate Score</button>}
              {record.status === 'scored' && onOpenReport && <button onClick={() => onOpenReport(record.id)} style={controlStyles.secondaryButton} type="button">Report</button>}
            </div>
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
            <div style={runStyles.panel}>Machine Setup Profile<br /><strong>{formatValue(record.machineSetupProfileName)}</strong></div>
          </div>
        )}
        {tab === 'Manufacturing Parameters' && (
          <div style={runStyles.stack}>
            <ManufacturingParametersForm
              machines={machines}
              machineSetupProfiles={machineSetupProfiles}
              molds={molds}
              formulations={formulations}
              onChange={(patch) => setRecord((current) => current ? ({ ...current, ...patch } as ProductionRunRecord) : current)}
              readOnly={!canEditParameters}
              value={payload}
            />
            <section style={styles.profileValues}>
              <h2 style={styles.profileTitle}>Setup Profile Values</h2>
              <SetupProfileParametersTable parameters={record.machineSetupProfileParameters} />
            </section>
            {canEditParameters && <div style={runStyles.actions}><button onClick={() => void saveParameters()} style={controlStyles.primaryButton} type="button">Save Changes</button></div>}
          </div>
        )}
        {tab === 'Samples' && (record.samples?.length
          ? <SampleTable canDelete={!locked} editable={!locked} onDelete={(sampleId) => void archiveSample(sampleId).then(() => { setRecord((current) => current ? { ...current, samples: current.samples?.filter((sample) => sample.id !== sampleId), sampleCount: Math.max(0, current.sampleCount - 1) } : current); setMessage('Sample deleted'); }).catch((err: Error) => setError(err.message))} onUpdate={(sample, patch) => void updateSample(sample.id, { cavityNumber: patch.cavityNumber === undefined ? sample.cavityNumber : patch.cavityNumber, sampleCode: patch.sampleCode ?? sample.sampleCode, status: patch.status ?? sample.status as import('../../services/api').SamplePayload['status'] }).then((updated) => { setRecord((current) => current ? { ...current, samples: current.samples?.map((item) => item.id === updated.id ? updated : item) } : current); setMessage('Sample saved'); }).catch((err: Error) => setError(err.message))} samples={record.samples} />
          : <EmptyState>Samples are automatically generated when this run is marked Ready for Testing.</EmptyState>)}
        {tab === 'Lab Results' && <ReadOnlyLabResultsPanel onOpenLabRun={onOpenLabRun} runId={record.id} />}
        {tab === 'Run Summary' && <RunSummaryPanel runId={record.id} />}
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
    machineSetupProfileId: record.machineSetupProfileId ?? null,
    meltTemperature: record.meltTemperature ?? null,
    meltTemperatureUnit: record.meltTemperatureUnit,
    moldId: record.moldId,
    runCode: record.runCode,
  };
}

const styles: Record<string, CSSProperties> = {
  headerActions: { alignItems: 'flex-end', display: 'flex', justifyContent: 'flex-end', minWidth: 0 },
  headerStart: { minWidth: 0 },
  headerTimeline: { alignItems: 'center', display: 'flex', justifyContent: 'center', minWidth: 0 },
  overviewGrid: { display: 'grid', gap: spacing.space4, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' },
  profileTitle: { margin: 0 },
  profileValues: { display: 'grid', gap: spacing.space3 },
  tabs: { display: 'flex', flexWrap: 'wrap', gap: spacing.space3 },
  titleRow: { alignItems: 'center', display: 'flex', gap: spacing.space2 },
};
