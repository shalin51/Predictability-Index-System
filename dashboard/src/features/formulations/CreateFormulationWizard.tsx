import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles, getTabButtonStyle } from '../../components/ui/controls';
import { DashboardPage, MessageBanner } from '../../components/ui/Page';
import {
  createFormulation,
  duplicateFormulation,
  listFormulations,
  listLibraryOptions,
  type FormulationComponentPayload,
  type FormulationPayload,
  type FormulationRecord,
  type LibraryRecord,
} from '../../services/api';
import { colors, spacing } from '../../theme/tokens';
import { FormulationComponentsEditor } from './FormulationComponentsEditor';
import { formatValue, formulationStyles, totalTone } from './formulationUi';

const emptyComponent: FormulationComponentPayload = {
  basis: 'weight_percent',
  materialId: '',
  materialLotId: '',
  percentComposition: 0,
  supplierId: '',
};

export function CreateFormulationWizard({ onCancel, onSaved }: { onCancel: () => void; onSaved: (id: string) => void }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormulationPayload>({ components: [{ ...emptyComponent }], notes: '' });
  const [materials, setMaterials] = useState<LibraryRecord[]>([]);
  const [suppliers, setSuppliers] = useState<LibraryRecord[]>([]);
  const [lots, setLots] = useState<LibraryRecord[]>([]);
  const [duplicateSourceId, setDuplicateSourceId] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [formulations, setFormulations] = useState<FormulationRecord[]>([]);
  const [error, setError] = useState('');
  const total = useMemo(() => form.components.reduce((sum, component) => sum + Number(component.percentComposition || 0), 0), [form.components]);
  const canApprove = Math.abs(total - 100) < 0.0001;

  useEffect(() => {
    void Promise.all([
      listLibraryOptions('materials'),
      listLibraryOptions('suppliers'),
      listLibraryOptions('material-lots'),
      listFormulations(),
    ]).then(([materialOptions, supplierOptions, lotOptions, formulationRecords]) => {
      setMaterials(materialOptions);
      setSuppliers(supplierOptions);
      setLots(lotOptions);
      setFormulations(formulationRecords);
    }).catch((err: Error) => setError(err.message));
  }, []);

  const save = async (approve: boolean) => {
    try {
      setError('');
      if (approve && !window.confirm('Approve this formulation? Once approved, it cannot be edited or unapproved.')) return;
      if (approve && !approvedBy.trim()) {
        setError('Approved By is required when approving a formulation');
        return;
      }
      const record = await createFormulation({ ...form, approve, approvedBy });
      onSaved(record.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const duplicate = async () => {
    if (!duplicateSourceId) return;
    try {
      setError('');
      const record = await duplicateFormulation(duplicateSourceId);
      onSaved(record.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Duplicate failed');
    }
  };

  return (
    <DashboardPage maxWidth="100%">
      <Card>
        <div style={formulationStyles.header}>
          <div>
            <h1 style={formulationStyles.title}>New Formulation</h1>
            <p style={formulationStyles.subtitle}>Create a draft recipe, validate components, then approve when total equals 100%.</p>
          </div>
          <button onClick={onCancel} style={controlStyles.secondaryButton} type="button">Cancel</button>
        </div>
        <div style={styles.steps}>
          {['Basic Info', 'Recipe Components', 'Review'].map((label, index) => (
            <button key={label} onClick={() => setStep(index)} style={getTabButtonStyle(step === index)} type="button">{label}</button>
          ))}
        </div>
        <Divider />
        {error && <MessageBanner tone="danger">{error}</MessageBanner>}
        {step === 0 && (
          <div style={formulationStyles.formGrid}>
            <label style={controlStyles.field}>
              <span style={controlStyles.fieldLabel}>Formulation Name</span>
              <input onChange={(event) => setForm((current) => ({ ...current, formulationName: event.target.value }))} style={controlStyles.input} value={form.formulationName ?? ''} />
            </label>
            <label style={controlStyles.field}>
              <span style={controlStyles.fieldLabel}>Formulation Code</span>
              <input onChange={(event) => setForm((current) => ({ ...current, formulationCode: event.target.value }))} placeholder="Auto if blank" style={controlStyles.input} value={form.formulationCode ?? ''} />
            </label>
            <label style={controlStyles.field}>
              <span style={controlStyles.fieldLabel}>Approved By</span>
              <input onChange={(event) => setApprovedBy(event.target.value)} placeholder="Required when approving" style={controlStyles.input} value={approvedBy} />
            </label>
            <label style={controlStyles.field}>
              <span style={controlStyles.fieldLabel}>Duplicate Existing Formulation</span>
              <select onChange={(event) => setDuplicateSourceId(event.target.value)} style={controlStyles.input} value={duplicateSourceId}>
                <option value="">Select formulation</option>
                {formulations.map((item) => <option key={item.id} value={item.id}>{item.formulationCode} V{item.version}</option>)}
              </select>
              <button disabled={!duplicateSourceId} onClick={() => void duplicate()} style={controlStyles.secondaryButton} type="button">Duplicate</button>
            </label>
            <label style={controlStyles.field}>
              <span style={controlStyles.fieldLabel}>Version No</span>
              <input disabled style={controlStyles.input} value="1" />
            </label>
            <label style={controlStyles.field}>
              <span style={controlStyles.fieldLabel}>Notes</span>
              <textarea onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} style={controlStyles.textarea} value={form.notes ?? ''} />
            </label>
          </div>
        )}
        {step === 1 && (
          <FormulationComponentsEditor
            components={form.components}
            lots={lots}
            materials={materials}
            onChange={(components) => setForm((current) => ({ ...current, components }))}
            suppliers={suppliers}
          />
        )}
        {step === 2 && (
          <div style={formulationStyles.stack}>
            <div style={formulationStyles.panel}>
              <div>Formulation Code: {form.formulationCode || 'Auto-generated'}</div>
              <div>Formulation Name: {form.formulationName || '-'}</div>
              <div>Benchmarks: All active benchmarks</div>
              <div>Component Total: <span style={{ ...formulationStyles.badge, ...totalTone(total) }}>{formatValue(total)}%</span></div>
            </div>
            <FormulationComponentsEditor components={form.components} lots={lots} materials={materials} onChange={() => undefined} readOnly suppliers={suppliers} />
            {!canApprove && <MessageBanner tone="warning">Component total must equal 100% before approval.</MessageBanner>}
          </div>
        )}
        <Divider />
        <div style={formulationStyles.actions}>
          <button disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))} style={controlStyles.secondaryButton} type="button">Back</button>
          {step < 2 && <button onClick={() => setStep((current) => Math.min(2, current + 1))} style={controlStyles.primaryButton} type="button">Next</button>}
          {step === 2 && <button onClick={() => void save(false)} style={controlStyles.primaryButton} type="button">Save Draft</button>}
          {step === 2 && <button disabled={!canApprove} onClick={() => void save(true)} style={{ ...controlStyles.primaryButton, ...(canApprove ? {} : styles.disabled) }} type="button">Approve</button>}
        </div>
      </Card>
    </DashboardPage>
  );
}

const styles: Record<string, CSSProperties> = {
  disabled: { backgroundColor: colors.text.muted, borderColor: colors.text.muted, cursor: 'not-allowed' },
  steps: { display: 'flex', flexWrap: 'wrap', gap: spacing.space3 },
};
