import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles, getTabButtonStyle } from '../../components/ui/controls';
import { DashboardPage, EmptyState, MessageBanner } from '../../components/ui/Page';
import {
  approveFormulation,
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
  onOpenLabRun,
  onOpenProductionRun,
}: {
  id: string;
  onBack: () => void;
  onCreateProductionRun: () => void;
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
  const [approvedBy, setApprovedBy] = useState('');
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

  const total = components.reduce((sum, component) => sum + Number(component.percentComposition || 0), 0);
  const canApprove = record.status === 'draft' && Math.abs(total - 100) < 0.0001;

  const save = async () => {
    try {
      const next = await updateFormulation(record.id, {
        components,
        formulationCode: record.formulationCode,
        formulationName: record.formulationName ?? '',
        notes: String(record['notes'] ?? ''),
      });
      setRecord(next);
      setEditing(false);
      setMessage('Saved');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const approve = async () => {
    if (!approvedBy.trim()) {
      setError('Approved By is required when approving a formulation');
      return;
    }
    if (!window.confirm('Approve this formulation? Once approved, it cannot be edited or unapproved.')) return;
    try {
      const next = await approveFormulation(record.id, approvedBy);
      setRecord(next);
      setMessage('Approved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed');
    }
  };

  return (
    <DashboardPage maxWidth="100%">
      <Card>
        <div style={formulationStyles.header}>
          <div>
            <button onClick={onBack} style={controlStyles.subtleButton} type="button">Back</button>
            <h1 style={{ ...formulationStyles.title, marginTop: spacing.space4 }}>{record.formulationCode} / Version {record.versionNo}</h1>
            {record.formulationName && <p style={formulationStyles.subtitle}>{record.formulationName}</p>}
            <p style={formulationStyles.subtitle}>
              Status: {labelize(record.status)} | Component Total: {formatValue(total)}%
            </p>
          </div>
          <div style={formulationStyles.actions}>
            {record.status === 'draft' && <button onClick={() => setEditing(true)} style={controlStyles.secondaryButton} type="button">Edit</button>}
            {record.status === 'draft' && <label style={controlStyles.field}><span style={controlStyles.fieldLabel}>Approved By</span><input onChange={(event) => setApprovedBy(event.target.value)} style={controlStyles.input} value={approvedBy} /></label>}
            {record.status === 'draft' && <button disabled={!canApprove} onClick={() => void approve()} style={{ ...controlStyles.primaryButton, ...(canApprove ? {} : styles.disabled) }} type="button">Approve</button>}
            {record.status === 'approved' && <button onClick={onCreateProductionRun} style={controlStyles.secondaryButton} type="button">Create Production Run</button>}
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
          <div style={formulationStyles.stack}>
            <div style={styles.overviewGrid}>
              <div style={formulationStyles.panel}>Component Total<br /><span style={{ ...formulationStyles.badge, ...totalTone(total) }}>{formatValue(total)}%</span></div>
              <div style={formulationStyles.panel}>Notes<br /><strong>{String(record.notes ?? '-')}</strong></div>
              <div style={formulationStyles.panel}>Approved By<br /><strong>{String(record.approvedBy ?? '-')}</strong></div>
              <div style={formulationStyles.panel}>Last Updated<br /><strong>{formatValue(record.updatedAt)}</strong></div>
            </div>
            {editing && (
              <div style={formulationStyles.stack}>
                <label style={controlStyles.field}>
                  <span style={controlStyles.fieldLabel}>Formulation Name</span>
                  <input onChange={(event) => setRecord((current) => current ? { ...current, formulationName: event.target.value } : current)} style={controlStyles.input} value={record.formulationName ?? ''} />
                </label>
                <label style={controlStyles.field}>
                  <span style={controlStyles.fieldLabel}>Notes</span>
                  <textarea onChange={(event) => setRecord((current) => current ? { ...current, notes: event.target.value } : current)} style={controlStyles.textarea} value={String(record.notes ?? '')} />
                </label>
                <div style={formulationStyles.actions}>
                  <button onClick={() => { setEditing(false); load(); }} style={controlStyles.secondaryButton} type="button">Cancel</button>
                  <button onClick={() => void save()} style={controlStyles.primaryButton} type="button">Save</button>
                </div>
              </div>
            )}
          </div>
        )}
        {tab === 'Recipe Components' && (
          <div style={formulationStyles.stack}>
            <FormulationComponentsEditor components={components} lots={lots} materials={materials} onChange={() => undefined} readOnly suppliers={suppliers} />
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
