import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles, getTabButtonStyle } from '../../components/ui/controls';
import { DashboardPage, EmptyState, MessageBanner } from '../../components/ui/Page';
import {
  approveFormulation,
  duplicateFormulation,
  getFormulation,
  listLibraryOptions,
  listProductionRuns,
  updateFormulation,
  type FormulationComponentPayload,
  type FormulationRecord,
  type LibraryRecord,
  type ProductionRunRecord,
} from '../../services/api';
import { spacing } from '../../theme/tokens';
import { FormulationComponentsEditor } from './FormulationComponentsEditor';
import { ProductionRunTable } from '../production-runs/components/ProductionRunTable';
import { BenchmarkScoringPanel } from '../production-runs/components/scores/BenchmarkScoringPanel';
import { ReadOnlyLabResultsPanel } from '../lab-testing/components/ReadOnlyLabResultsPanel';
import { formatValue, formulationStyles, labelize, totalTone } from './formulationUi';

type DetailTab = 'Overview' | 'Recipe Components' | 'Production Runs' | 'Lab Results' | 'Scores';

export function FormulationDetailPage({
  id,
  onBack,
  onCreateProductionRun,
  onOpen,
  onOpenLabRun,
  onOpenProductionRun,
}: {
  id: string;
  onBack: () => void;
  onCreateProductionRun: () => void;
  onOpen: (id: string) => void;
  onOpenLabRun: (id: string) => void;
  onOpenProductionRun: (id: string) => void;
}) {
  const [record, setRecord] = useState<FormulationRecord | null>(null);
  const [components, setComponents] = useState<FormulationComponentPayload[]>([]);
  const [materials, setMaterials] = useState<LibraryRecord[]>([]);
  const [suppliers, setSuppliers] = useState<LibraryRecord[]>([]);
  const [lots, setLots] = useState<LibraryRecord[]>([]);
  const [productionRuns, setProductionRuns] = useState<ProductionRunRecord[]>([]);
  const [tab, setTab] = useState<DetailTab>('Overview');
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    void Promise.all([getFormulation(id), listProductionRuns({ formulationId: id })]).then(([next, runs]) => {
      setRecord(next);
      setProductionRuns(runs);
      setComponents((next.components ?? []).map((component) => ({
        basis: 'weight_percent',
        materialId: component.materialId,
        materialLotId: component.materialLotId ?? '',
        percentComposition: component.percentComposition,
        supplierId: component.supplierId,
      })));
    }).catch((err: Error) => setError(err.message));
  };

  useEffect(load, [id]);
  useEffect(() => {
    void Promise.all([listLibraryOptions('materials'), listLibraryOptions('suppliers'), listLibraryOptions('material-lots')])
      .then(([materialOptions, supplierOptions, lotOptions]) => {
        setMaterials(materialOptions);
        setSuppliers(supplierOptions);
        setLots(lotOptions);
      })
      .catch(() => undefined);
  }, []);

  if (!record) {
    return (
      <DashboardPage maxWidth="100%">
        <Card>{error ? <MessageBanner tone="danger">{error}</MessageBanner> : <div style={formulationStyles.muted}>Loading...</div>}</Card>
      </DashboardPage>
    );
  }

  const locked = record.status !== 'draft';
  const total = components.reduce((sum, component) => sum + Number(component.percentComposition || 0), 0);
  const canApprove = record.status === 'draft' && Math.abs(total - 100) < 0.0001;

  const save = async () => {
    try {
      const next = await updateFormulation(record.id, {
        components,
        experimentId: String(record['experimentId'] ?? '') || null,
        familyId: String(record['familyId'] ?? '') || null,
        formulationCode: record.formulationCode,
        notes: String(record['notes'] ?? ''),
        targetBenchmarkId: String(record['targetBenchmarkId'] ?? '') || null,
      });
      setRecord(next);
      setEditing(false);
      setMessage('Saved');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  return (
    <DashboardPage maxWidth="100%">
      <Card>
        <div style={formulationStyles.header}>
          <div>
            <button onClick={onBack} style={controlStyles.subtleButton} type="button">Back</button>
            <h1 style={{ ...formulationStyles.title, marginTop: spacing.space4 }}>{record.formulationCode} / Version {record.versionNo}</h1>
            <p style={formulationStyles.subtitle}>
              Status: {labelize(record.status)} | Component Total: {formatValue(total)}%
            </p>
          </div>
          <div style={formulationStyles.actions}>
            <button disabled={locked} onClick={() => setEditing(true)} style={{ ...controlStyles.secondaryButton, ...(locked ? styles.disabled : {}) }} type="button">Edit</button>
            <button onClick={() => void duplicateFormulation(record.id).then((next) => onOpen(next.id)).catch((err: Error) => setError(err.message))} style={controlStyles.secondaryButton} type="button">Duplicate New Version</button>
            <button disabled={!canApprove} onClick={() => void approveFormulation(record.id).then((next) => { setRecord(next); setMessage('Approved'); }).catch((err: Error) => setError(err.message))} style={{ ...controlStyles.primaryButton, ...(canApprove ? {} : styles.disabled) }} type="button">Approve</button>
            <button disabled={record.status !== 'approved'} onClick={onCreateProductionRun} style={{ ...controlStyles.secondaryButton, ...(record.status === 'approved' ? {} : styles.disabled) }} type="button">Create Production Run</button>
          </div>
        </div>
        <Divider />
        {error && <MessageBanner tone="danger">{error}</MessageBanner>}
        {message && <MessageBanner tone="success">{message}</MessageBanner>}
        <div style={styles.tabs}>
          {(['Overview', 'Recipe Components', 'Production Runs', 'Lab Results', 'Scores'] as DetailTab[]).map((item) => (
            <button key={item} onClick={() => setTab(item)} style={getTabButtonStyle(tab === item)} type="button">{item}</button>
          ))}
        </div>
        {tab === 'Overview' && (
          <div style={styles.overviewGrid}>
            <div style={formulationStyles.panel}>Family<br /><strong>{record.family ?? '-'}</strong></div>
            <div style={formulationStyles.panel}>Component Total<br /><span style={{ ...formulationStyles.badge, ...totalTone(total) }}>{formatValue(total)}%</span></div>
            <div style={formulationStyles.panel}>Last Updated<br /><strong>{formatValue(record.updatedAt)}</strong></div>
          </div>
        )}
        {tab === 'Recipe Components' && (
          <div style={formulationStyles.stack}>
            <FormulationComponentsEditor components={components} lots={lots} materials={materials} onChange={setComponents} readOnly={!editing || locked} suppliers={suppliers} />
            {editing && (
              <div style={formulationStyles.actions}>
                <button onClick={() => { setEditing(false); load(); }} style={controlStyles.secondaryButton} type="button">Cancel</button>
                <button onClick={() => void save()} style={controlStyles.primaryButton} type="button">Save</button>
              </div>
            )}
          </div>
        )}
        {tab === 'Production Runs' && (productionRuns.length > 0
          ? <ProductionRunTable onOpen={onOpenProductionRun} records={productionRuns} />
          : <EmptyState>No production runs.</EmptyState>)}
        {tab === 'Lab Results' && (productionRuns.length > 0
          ? <div style={formulationStyles.stack}>{productionRuns.map((run) => <ReadOnlyLabResultsPanel key={run.id} onOpenLabRun={onOpenLabRun} runId={run.id} title={run.runCode} />)}</div>
          : <EmptyState>No production runs or lab results.</EmptyState>)}
        {tab === 'Scores' && (productionRuns.length > 0
          ? <div style={formulationStyles.stack}>{productionRuns.map((run) => <BenchmarkScoringPanel key={run.id} runId={run.id} />)}</div>
          : <EmptyState>No production runs or scores.</EmptyState>)}
      </Card>
    </DashboardPage>
  );
}

const styles: Record<string, CSSProperties> = {
  disabled: { opacity: 0.5, cursor: 'not-allowed' },
  overviewGrid: { display: 'grid', gap: spacing.space4, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' },
  tabs: { display: 'flex', flexWrap: 'wrap', gap: spacing.space3 },
};
