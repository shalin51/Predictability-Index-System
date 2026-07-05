import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Card, Divider } from '../../components/ui/Card';
import { controlStyles, getTabButtonStyle } from '../../components/ui/controls';
import { DashboardPage, MessageBanner } from '../../components/ui/Page';
import {
  createFormulation,
  listFormulationOptions,
  listLibraryOptions,
  type FormulationComponentPayload,
  type FormulationOptions,
  type FormulationPayload,
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
  const [benchmarks, setBenchmarks] = useState<LibraryRecord[]>([]);
  const [materials, setMaterials] = useState<LibraryRecord[]>([]);
  const [suppliers, setSuppliers] = useState<LibraryRecord[]>([]);
  const [lots, setLots] = useState<LibraryRecord[]>([]);
  const [options, setOptions] = useState<FormulationOptions>({ experiments: [], families: [] });
  const [error, setError] = useState('');
  const total = useMemo(() => form.components.reduce((sum, component) => sum + Number(component.percentComposition || 0), 0), [form.components]);
  const canApprove = Math.abs(total - 100) < 0.0001;

  useEffect(() => {
    void Promise.all([
      listLibraryOptions('benchmarks'),
      listLibraryOptions('materials'),
      listLibraryOptions('suppliers'),
      listLibraryOptions('material-lots'),
      listFormulationOptions(),
    ]).then(([benchmarkOptions, materialOptions, supplierOptions, lotOptions, formulationOptions]) => {
      setBenchmarks(benchmarkOptions);
      setMaterials(materialOptions);
      setSuppliers(supplierOptions);
      setLots(lotOptions);
      setOptions(formulationOptions);
    }).catch((err: Error) => setError(err.message));
  }, []);

  const save = async (approve: boolean) => {
    try {
      setError('');
      const record = await createFormulation({ ...form, approve });
      onSaved(record.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
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
              <span style={controlStyles.fieldLabel}>Experiment</span>
              <select onChange={(event) => setForm((current) => ({ ...current, experimentId: event.target.value, experimentName: '' }))} style={controlStyles.input} value={form.experimentId ?? ''}>
                <option value="">Create quick</option>
                {options.experiments.map((item) => <option key={item.id} value={item.id}>{String(item['label'])}</option>)}
              </select>
            </label>
            <label style={controlStyles.field}>
              <span style={controlStyles.fieldLabel}>Quick Experiment</span>
              <input onChange={(event) => setForm((current) => ({ ...current, experimentId: '', experimentName: event.target.value }))} style={controlStyles.input} value={form.experimentName ?? ''} />
            </label>
            <label style={controlStyles.field}>
              <span style={controlStyles.fieldLabel}>Formulation Family</span>
              <select onChange={(event) => setForm((current) => ({ ...current, familyId: event.target.value, formulationFamily: '' }))} style={controlStyles.input} value={form.familyId ?? ''}>
                <option value="">Create quick</option>
                {options.families.map((item) => <option key={item.id} value={item.id}>{String(item['label'])}</option>)}
              </select>
            </label>
            <label style={controlStyles.field}>
              <span style={controlStyles.fieldLabel}>Quick Family</span>
              <input onChange={(event) => setForm((current) => ({ ...current, familyId: '', formulationFamily: event.target.value }))} style={controlStyles.input} value={form.formulationFamily ?? ''} />
            </label>
            <label style={controlStyles.field}>
              <span style={controlStyles.fieldLabel}>Formulation Code</span>
              <input onChange={(event) => setForm((current) => ({ ...current, formulationCode: event.target.value }))} placeholder="Auto if blank" style={controlStyles.input} value={form.formulationCode ?? ''} />
            </label>
            <label style={controlStyles.field}>
              <span style={controlStyles.fieldLabel}>Version No</span>
              <input disabled style={controlStyles.input} value="1" />
            </label>
            <label style={controlStyles.field}>
              <span style={controlStyles.fieldLabel}>Target Benchmark</span>
              <select onChange={(event) => setForm((current) => ({ ...current, targetBenchmarkId: event.target.value }))} style={controlStyles.input} value={form.targetBenchmarkId ?? ''}>
                <option value="">Select</option>
                {benchmarks.map((item) => <option key={item.id} value={item.id}>{String(item['label'])}</option>)}
              </select>
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
              <div>Target Benchmark: {String(benchmarks.find((item) => item.id === form.targetBenchmarkId)?.['label'] ?? '-')}</div>
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
